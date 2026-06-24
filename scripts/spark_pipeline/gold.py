from pathlib import Path
import builtins
import pandas as pd
import joblib

from pyspark.sql.functions import col, current_timestamp
from pyspark.sql.types import (
    StructType,
    StructField,
    StringType,
    DoubleType,
    IntegerType,
    TimestampType
)

from spark_pipeline.config import GOLD_PATH, generate_part_name, POSTGRESQL_CONFIG
from spark_pipeline.model_3_diagnostic import DiagnosticDecisionEngine


MODEL_PATH = Path("/opt/airflow/models")


class GoldLayer:
    def __init__(self, spark):
        self.spark = spark
        self.gold_path = GOLD_PATH
        self.diagnostic_engine = DiagnosticDecisionEngine()

    def save_to_postgresql(self, df, table_name):
        df.write \
            .format("jdbc") \
            .option("url", POSTGRESQL_CONFIG["url"]) \
            .option("dbtable", table_name) \
            .option("user", POSTGRESQL_CONFIG["user"]) \
            .option("password", POSTGRESQL_CONFIG["password"]) \
            .option("driver", POSTGRESQL_CONFIG["driver"]) \
            .mode("overwrite") \
            .save()

    def safe_round(self, value, digits=5):
        if value is None:
            return None
        try:
            return builtins.round(float(value), digits)
        except Exception:
            return None

    # ============================================================
    # LOAD MODELS
    # ============================================================

    def load_forecast_models(self, department):
        models = {}

        for horizon in ["12h", "24h", "48h"]:
            key = f"vibration_{horizon}"
            model_file = MODEL_PATH / f"forecast_vibration_{horizon}_{department}.joblib"

            if model_file.exists():
                models[key] = joblib.load(model_file)
                print(f"Loaded forecast model: {model_file}")
            else:
                models[key] = None
                print(f"Missing forecast model: {model_file}")

        return models

    def load_anomaly_model(self, department):
        model_file = MODEL_PATH / f"anomaly_model_{department}.joblib"

        if model_file.exists():
            print(f"Loaded anomaly model: {model_file}")
            return joblib.load(model_file)

        print(f"Missing anomaly model: {model_file}")
        return None

    # ============================================================
    # FEATURES
    # ============================================================

    def build_forecast_features(self, part_df):
        pdf = (
            part_df
            .orderBy(col("recorded_at").asc())
            .select("recorded_at", "vibration")
            .toPandas()
        )

        if pdf.empty:
            return None

        pdf["recorded_at"] = pd.to_datetime(pdf["recorded_at"])
        pdf["vibration"] = pd.to_numeric(pdf["vibration"], errors="coerce")
        pdf = pdf.dropna(subset=["vibration"])

        if len(pdf) < 24:
            return None

        latest = pdf.iloc[-1]
        last_24 = pdf["vibration"].tail(24)

        vibration_mean_24 = last_24.mean()
        vibration_std_24 = last_24.std()
        vibration_min_24 = last_24.min()
        vibration_max_24 = last_24.max()

        if pd.isna(vibration_std_24):
            vibration_std_24 = 0.0

        sample = pd.DataFrame([{
            "vibration": float(latest["vibration"]),
            "vibration_mean_24": float(vibration_mean_24),
            "vibration_std_24": float(vibration_std_24),
            "vibration_min_24": float(vibration_min_24),
            "vibration_max_24": float(vibration_max_24),
            "vibration_change": float(latest["vibration"] - vibration_mean_24),
            "hour": int(latest["recorded_at"].hour),
            "weekday": int(latest["recorded_at"].dayofweek),
            "month": int(latest["recorded_at"].month)
        }])

        return sample

    def align_sample_to_model(self, model, sample):
        if model is None or sample is None:
            return sample

        if hasattr(model, "feature_names_in_"):
            expected_cols = list(model.feature_names_in_)

            for c in expected_cols:
                if c not in sample.columns:
                    sample[c] = 0.0

            sample = sample[expected_cols]

        return sample

    # ============================================================
    # FORECASTING MODEL 2
    # ============================================================

    def predict_future_values(self, forecast_models, sample):
        predictions = {}

        for horizon in ["12h", "24h", "48h"]:
            key = f"vibration_{horizon}"
            model = forecast_models.get(key)

            if model is None:
                print(f"No real forecast model available for {key}")
                predictions[key] = None
                continue

            if sample is None:
                print(f"Not enough historical data for {key}")
                predictions[key] = None
                continue

            try:
                aligned_sample = self.align_sample_to_model(model, sample.copy())
                pred = float(model.predict(aligned_sample)[0])

                # IMPORTANT FIX:
                # Use builtins.max because pyspark has its own max function.
                predictions[key] = builtins.max(0.0, pred)

            except Exception as e:
                print(f"Real prediction failed for {key}: {e}")
                predictions[key] = None

        return predictions

    # ============================================================
    # ANOMALY MODEL 1
    # ============================================================

    def predict_anomaly(self, anomaly_model, sample):
        if anomaly_model is None:
            return 0.0, "Modèle IA indisponible", "Normal"

        if sample is None:
            return 0.0, "Historique insuffisant", "Normal"

        try:
            aligned_sample = self.align_sample_to_model(anomaly_model, sample.copy())

            raw_label = anomaly_model.predict(aligned_sample)[0]

            if hasattr(anomaly_model, "decision_function"):
                raw_score = float(anomaly_model.decision_function(aligned_sample)[0])
                anomaly_score = abs(raw_score)

            elif hasattr(anomaly_model, "predict_proba"):
                proba = anomaly_model.predict_proba(aligned_sample)[0]

                # IMPORTANT FIX:
                # Use builtins.max because pyspark has its own max function.
                anomaly_score = float(builtins.max(proba))

            else:
                anomaly_score = 0.0

            if int(raw_label) == -1:
                return anomaly_score, "Anomalie détectée", "À surveiller"

            if int(raw_label) == 1 and not hasattr(anomaly_model, "decision_function"):
                return anomaly_score, "Anomalie détectée", "À surveiller"

            return anomaly_score, "Normal", "Normal"

        except Exception as e:
            print(f"Anomaly prediction error: {e}")
            return 0.0, "Modèle IA indisponible", "Normal"

    # ============================================================
    # BUSINESS LOGIC
    # ============================================================

    def get_prediction_trend(self, current, pred_12h, pred_24h, pred_48h):
        if pred_48h is None:
            return "Prévision indisponible"

        if pred_48h > current * 1.20:
            return "Dégradation prévue"
        elif pred_48h < current * 0.90:
            return "Amélioration prévue"

        return "Stable"

    def get_prediction_confidence(self, department):
        confidence_by_department = {
            "SAP": 75,
            "AF": 70,
            "CAP": 72,
            "ENGRAIS": 78
        }

        return confidence_by_department.get(department, 70)

    def build_risk_explanation(self, current_vibration, diagnostic_result, ai_label):
        parts = []

        if current_vibration >= 7:
            parts.append("vibration élevée selon les seuils i-Sense")
        elif current_vibration >= 2.5:
            parts.append("vibration à surveiller")

        if ai_label == "Anomalie détectée":
            parts.append("anomalie détectée par le modèle IA")

        if diagnostic_result["current_problem_sudden_failure"] in ["Élevé", "Critique"]:
            parts.append("risque de panne soudaine")

        if not parts:
            return "Paramètres normaux"

        return "Risque détecté à cause de: " + ", ".join(parts)

    # ============================================================
    # GOLD PROCESS
    # ============================================================

    def process_department(self, silver_df, department):
        print(f"\nPredicting for {department}...")

        forecast_models = self.load_forecast_models(department)
        anomaly_model = self.load_anomaly_model(department)

        components = (
            silver_df
            .select("machine_name", "part_code")
            .distinct()
            .collect()
        )

        all_predictions = []

        for component in components:
            machine_name = component["machine_name"]
            part_code = component["part_code"]
            part_name = generate_part_name(part_code)

            part_df = silver_df.filter(
                (col("machine_name") == machine_name) &
                (col("part_code") == part_code)
            )

            latest_row = (
                part_df
                .orderBy(col("recorded_at").desc())
                .limit(1)
                .collect()
            )

            if not latest_row:
                continue

            latest = latest_row[0]
            current_vibration = (
                float(latest["vibration"])
                if latest["vibration"] is not None
                else 0.0
            )

            sample = self.build_forecast_features(part_df)

            future_values = self.predict_future_values(
                forecast_models=forecast_models,
                sample=sample
            )

            if any(value is None for value in future_values.values()):
                print(
                    f"Skipping {machine_name} - {part_name}: "
                    f"real forecast unavailable"
                )
                continue

            ai_score, ai_label, ai_status = self.predict_anomaly(
                anomaly_model=anomaly_model,
                sample=sample
            )

            diagnostic_result = self.diagnostic_engine.analyze(
                machine_name=machine_name,
                part_name=part_name,
                current_vibration=current_vibration,
                predicted_values=future_values,
                ai_anomaly_label=ai_label,
                ai_anomaly_score=ai_score
            )

            prediction_trend = self.get_prediction_trend(
                current_vibration,
                future_values["vibration_12h"],
                future_values["vibration_24h"],
                future_values["vibration_48h"]
            )

            prediction = {
                "department": str(department),
                "last_measurement_time": latest["recorded_at"],
                "machine_name": str(machine_name),
                "part_code": str(part_code),
                "part_name": str(part_name),

                "current_vibration": self.safe_round(current_vibration, 5),
                "current_temperature": 0.0,
                "current_acceleration": 0.0,

                "ai_anomaly_score": self.safe_round(ai_score, 5),
                "ai_anomaly_label": str(ai_label),
                "ai_status": str(ai_status),

                "predicted_vibration_12h": self.safe_round(future_values["vibration_12h"], 5),
                "predicted_vibration_24h": self.safe_round(future_values["vibration_24h"], 5),
                "predicted_vibration_48h": self.safe_round(future_values["vibration_48h"], 5),

                "predicted_12h": self.safe_round(future_values["vibration_12h"], 5),
                "predicted_24h": self.safe_round(future_values["vibration_24h"], 5),
                "predicted_48h": self.safe_round(future_values["vibration_48h"], 5),

                "prediction_confidence": int(self.get_prediction_confidence(department)),
                "prediction_trend": str(prediction_trend),

                "trend_vibration_current": self.safe_round(current_vibration, 5),
                "trend_vibration_12h": self.safe_round(future_values["vibration_12h"], 5),
                "trend_vibration_24h": self.safe_round(future_values["vibration_24h"], 5),
                "trend_vibration_48h": self.safe_round(future_values["vibration_48h"], 5),
            }

            prediction.update(diagnostic_result)

            prediction["risk_explanation"] = self.build_risk_explanation(
                current_vibration=current_vibration,
                diagnostic_result=diagnostic_result,
                ai_label=ai_label
            )

            all_predictions.append(prediction)

            print(
                f"   {machine_name} - {part_name} | "
                f"Current: {current_vibration:.5f} | "
                f"Pred 12h: {future_values['vibration_12h']:.5f} | "
                f"Pred 24h: {future_values['vibration_24h']:.5f} | "
                f"Pred 48h: {future_values['vibration_48h']:.5f} | "
                f"AI: {ai_label} ({ai_score:.5f}) | "
                f"Risk: {diagnostic_result['current_risk']} | "
                f"H+12: {diagnostic_result['risk_12h']} | "
                f"H+24: {diagnostic_result['risk_24h']} | "
                f"H+48: {diagnostic_result['risk_48h']} | "
                f"RUL: {diagnostic_result['rul_hours']}h"
            )

        if not all_predictions:
            print("No real predictions generated")
            return None

        schema = StructType([
            StructField("department", StringType(), True),
            StructField("machine_name", StringType(), True),
            StructField("part_code", StringType(), True),
            StructField("part_name", StringType(), True),
            StructField("last_measurement_time", TimestampType(), True),

            StructField("current_vibration", DoubleType(), True),
            StructField("current_temperature", DoubleType(), True),
            StructField("current_acceleration", DoubleType(), True),

            StructField("ai_anomaly_score", DoubleType(), True),
            StructField("ai_anomaly_label", StringType(), True),
            StructField("ai_status", StringType(), True),

            StructField("predicted_vibration_12h", DoubleType(), True),
            StructField("predicted_vibration_24h", DoubleType(), True),
            StructField("predicted_vibration_48h", DoubleType(), True),

            StructField("predicted_12h", DoubleType(), True),
            StructField("predicted_24h", DoubleType(), True),
            StructField("predicted_48h", DoubleType(), True),

            StructField("prediction_confidence", IntegerType(), True),
            StructField("prediction_trend", StringType(), True),

            StructField("trend_vibration_current", DoubleType(), True),
            StructField("trend_vibration_12h", DoubleType(), True),
            StructField("trend_vibration_24h", DoubleType(), True),
            StructField("trend_vibration_48h", DoubleType(), True),

            StructField("current_risk", StringType(), True),
            StructField("risk_12h", StringType(), True),
            StructField("risk_24h", StringType(), True),
            StructField("risk_48h", StringType(), True),

            StructField("risk_score", IntegerType(), True),
            StructField("health_score", IntegerType(), True),
            StructField("rul_hours", IntegerType(), True),

            StructField("maintenance_priority", StringType(), True),
            StructField("maintenance_recommendation", StringType(), True),
            StructField("alert_message", StringType(), True),

            StructField("current_problem_vibration", StringType(), True),
            StructField("current_problem_sudden_failure", StringType(), True),

            StructField("future_12h_problem_vibration", StringType(), True),
            StructField("future_12h_problem_sudden_failure", StringType(), True),

            StructField("future_24h_problem_vibration", StringType(), True),
            StructField("future_24h_problem_sudden_failure", StringType(), True),

            StructField("future_48h_problem_vibration", StringType(), True),
            StructField("future_48h_problem_sudden_failure", StringType(), True),

            StructField("risk_explanation", StringType(), True),
        ])

        result = self.spark.createDataFrame(all_predictions, schema=schema)
        result = result.withColumn("prediction_time", current_timestamp())

        output_path = str(self.gold_path / f"predictions_{department}")
        result.coalesce(1).write.mode("overwrite").parquet(output_path)

        print(f"Gold saved: {output_path}")

        try:
            self.save_to_postgresql(result, f"predictions_{department}")
            print(f"Saved to PostgreSQL: predictions_{department}")
        except Exception as e:
            print(f"Could not save to PostgreSQL: {e}")

        result.show(truncate=False)
        return result