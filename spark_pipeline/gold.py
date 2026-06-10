from pathlib import Path
import builtins
import pandas as pd
import joblib

from pyspark.sql.functions import *
from pyspark.sql.types import *
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

    def safe_round(self, value, digits=2):
        if value is None:
            return 0.0
        return builtins.round(float(value), digits)

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

    def build_forecast_features(self, part_df):
        pdf = (
            part_df
            .orderBy(col("recorded_at").asc())
            .select("recorded_at", "vibration")
            .toPandas()
        )

        if pdf.empty or len(pdf) < 24:
            return None

        pdf["recorded_at"] = pd.to_datetime(pdf["recorded_at"])
        pdf["vibration"] = pd.to_numeric(pdf["vibration"], errors="coerce")
        pdf = pdf.dropna(subset=["vibration"])

        if len(pdf) < 24:
            return None

        latest = pdf.iloc[-1]

        vibration_mean_24 = pdf["vibration"].tail(24).mean()
        vibration_std_24 = pdf["vibration"].tail(24).std()
        vibration_min_24 = pdf["vibration"].tail(24).min()
        vibration_max_24 = pdf["vibration"].tail(24).max()

        if pd.isna(vibration_std_24):
            vibration_std_24 = 0.0

        return pd.DataFrame([{
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

    def predict_future_values(self, forecast_models, sample, current_vibration):
        predictions = {}

        for horizon in ["12h", "24h", "48h"]:
            key = f"vibration_{horizon}"
            model = forecast_models.get(key)

            if model is None or sample is None:
                predictions[key] = float(current_vibration)
            else:
                predictions[key] = float(model.predict(sample)[0])

        return predictions

    def get_prediction_trend(self, current, pred_12h, pred_24h, pred_48h):
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

    def build_risk_explanation(self, current_vibration, diagnostic_result):
        parts = []

        if current_vibration >= 7:
            parts.append("vibration élevée selon les seuils i-Sense")
        elif current_vibration >= 2.5:
            parts.append("vibration à surveiller")

        if diagnostic_result["current_problem_sudden_failure"] in ["Élevé", "Critique"]:
            parts.append("risque de panne soudaine")

        if not parts:
            return "Paramètres normaux"

        return "Risque détecté à cause de: " + ", ".join(parts)

    def process_department(self, silver_df, department):
        print(f"\nPredicting for {department}...")

        forecast_models = self.load_forecast_models(department)

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

            current_vibration = float(latest["vibration"]) if latest["vibration"] is not None else 0.0

            ai_score = 0
            ai_label = "Modèle IA indisponible"
            ai_status = "Normal"

            sample = self.build_forecast_features(part_df)

            future_values = self.predict_future_values(
                forecast_models,
                sample,
                current_vibration
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
                "machine_name": str(machine_name),
                "part_code": str(part_code),
                "part_name": str(part_name),

                "current_vibration": self.safe_round(current_vibration),
                "current_temperature": 0.0,
                "current_acceleration": 0.0,

                "ai_anomaly_score": int(ai_score),
                "ai_anomaly_label": str(ai_label),
                "ai_status": str(ai_status),

                "predicted_vibration_12h": self.safe_round(future_values["vibration_12h"]),
                "predicted_vibration_24h": self.safe_round(future_values["vibration_24h"]),
                "predicted_vibration_48h": self.safe_round(future_values["vibration_48h"]),

                "predicted_12h": self.safe_round(future_values["vibration_12h"]),
                "predicted_24h": self.safe_round(future_values["vibration_24h"]),

                "prediction_confidence": int(self.get_prediction_confidence(department)),
                "prediction_trend": str(prediction_trend),

                "trend_vibration_current": self.safe_round(current_vibration),
                "trend_vibration_12h": self.safe_round(future_values["vibration_12h"]),
                "trend_vibration_24h": self.safe_round(future_values["vibration_24h"]),
                "trend_vibration_48h": self.safe_round(future_values["vibration_48h"]),
            }

            prediction.update(diagnostic_result)

            prediction["risk_explanation"] = self.build_risk_explanation(
                current_vibration,
                diagnostic_result
            )

            all_predictions.append(prediction)

            print(
                f"   {machine_name} - {part_name} | "
                f"Risk: {diagnostic_result['current_risk']} | "
                f"H+12: {diagnostic_result['risk_12h']} | "
                f"H+24: {diagnostic_result['risk_24h']} | "
                f"H+48: {diagnostic_result['risk_48h']} | "
                f"RUL: {diagnostic_result['rul_hours']}h"
            )

        if not all_predictions:
            print("No predictions generated")
            return None

        schema = StructType([
            StructField("department", StringType(), True),
            StructField("machine_name", StringType(), True),
            StructField("part_code", StringType(), True),
            StructField("part_name", StringType(), True),

            StructField("current_vibration", DoubleType(), True),
            StructField("current_temperature", DoubleType(), True),
            StructField("current_acceleration", DoubleType(), True),

            StructField("ai_anomaly_score", IntegerType(), True),
            StructField("ai_anomaly_label", StringType(), True),
            StructField("ai_status", StringType(), True),

            StructField("predicted_vibration_12h", DoubleType(), True),
            StructField("predicted_vibration_24h", DoubleType(), True),
            StructField("predicted_vibration_48h", DoubleType(), True),

            StructField("predicted_12h", DoubleType(), True),
            StructField("predicted_24h", DoubleType(), True),

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
        result.write.mode("overwrite").parquet(output_path)

        print(f"Gold saved: {output_path}")

        try:
            self.save_to_postgresql(result, f"predictions_{department}")
            print(f"Saved to PostgreSQL: predictions_{department}")
        except Exception as e:
            print(f"Could not save to PostgreSQL: {e}")

        result.show(truncate=False)
        return result