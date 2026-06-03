"""
GOLD LAYER:
- Model 1: AI Anomaly Detection
- Model 2: Future Sensor Forecasting
- Model 3: Diagnostic + Decision Engine
"""

from pathlib import Path
import builtins
import pandas as pd
import joblib

from pyspark.sql.functions import *
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

        print(f"   ✅ Saved to PostgreSQL table: {table_name}")

    # -----------------------------
    # MODEL 1: LOAD ANOMALY MODEL
    # -----------------------------

    def load_ai_model(self, department):
        model_file = MODEL_PATH / f"anomaly_model_{department}.joblib"

        if model_file.exists():
            print(f"   ✅ AI anomaly model loaded: {model_file}")
            return joblib.load(model_file)

        print(f"   ⚠️ No anomaly model found for {department}")
        return None

    def predict_ai_anomaly(self, model, vibration, temperature, acceleration):
        if model is None:
            return 0, "Modèle IA indisponible", "Normal"

        sample = pd.DataFrame([{
            "vibration": vibration,
            "temperature": temperature,
            "acceleration": acceleration
        }])

        prediction = model.predict(sample)[0]
        score = model.decision_function(sample)[0]

        if prediction == -1:
            ai_anomaly_label = "Anomalie détectée"
        else:
            ai_anomaly_label = "Normal"

        ai_anomaly_score = int(
            builtins.max(
                0,
                builtins.min(100, (-score) * 300)
            )
        )

        if ai_anomaly_label == "Anomalie détectée":
            ai_status = "À surveiller"
        elif ai_anomaly_score >= 40:
            ai_status = "Surveillance"
        else:
            ai_status = "Normal"

        return ai_anomaly_score, ai_anomaly_label, ai_status

    # -----------------------------
    # MODEL 2: LOAD FORECAST MODELS
    # -----------------------------

    def load_forecast_models(self, department):
        forecast_models = {}

        sensors = ["vibration", "temperature", "acceleration"]
        horizons = ["12h", "24h", "48h"]

        for sensor in sensors:
            for horizon in horizons:
                key = f"{sensor}_{horizon}"
                model_file = MODEL_PATH / f"forecast_{sensor}_{horizon}_{department}.joblib"

                if model_file.exists():
                    forecast_models[key] = joblib.load(model_file)
                    print(f"   ✅ Forecast model loaded: {model_file}")
                else:
                    forecast_models[key] = None
                    print(f"   ⚠️ Missing forecast model: {model_file}")

        return forecast_models

    def build_forecast_features(self, part_df):
        pdf = (
            part_df
            .orderBy(col("recorded_at").asc())
            .select(
                "recorded_at",
                "vibration",
                "temperature",
                "acceleration"
            )
            .toPandas()
        )

        if pdf.empty:
            return None

        if len(pdf) < 24:
            print("         ⚠️ Not enough rows to build 24h rolling features")
            return None

        pdf["recorded_at"] = pd.to_datetime(pdf["recorded_at"])

        pdf["vibration"] = pd.to_numeric(pdf["vibration"], errors="coerce")
        pdf["temperature"] = pd.to_numeric(pdf["temperature"], errors="coerce")
        pdf["acceleration"] = pd.to_numeric(pdf["acceleration"], errors="coerce")

        pdf = pdf.dropna(subset=["vibration", "temperature", "acceleration"])

        if len(pdf) < 24:
            print("         ⚠️ Not enough clean rows after removing null values")
            return None

        latest = pdf.iloc[-1]

        vibration_mean_24 = pdf["vibration"].tail(24).mean()
        vibration_std_24 = pdf["vibration"].tail(24).std()
        temperature_mean_24 = pdf["temperature"].tail(24).mean()
        acceleration_mean_24 = pdf["acceleration"].tail(24).mean()

        if pd.isna(vibration_std_24):
            vibration_std_24 = 0.0

        sample = pd.DataFrame([{
            "vibration": float(latest["vibration"]),
            "temperature": float(latest["temperature"]),
            "acceleration": float(latest["acceleration"]),

            "vibration_mean_24": float(vibration_mean_24),
            "vibration_std_24": float(vibration_std_24),
            "temperature_mean_24": float(temperature_mean_24),
            "acceleration_mean_24": float(acceleration_mean_24),

            "vibration_change": float(latest["vibration"] - vibration_mean_24),
            "temperature_change": float(latest["temperature"] - temperature_mean_24),
            "acceleration_change": float(latest["acceleration"] - acceleration_mean_24),

            "hour": int(latest["recorded_at"].hour),
            "weekday": int(latest["recorded_at"].dayofweek),
            "month": int(latest["recorded_at"].month)
        }])

        return sample

    def predict_future_values(self, forecast_models, sample, current_vibration, current_temperature, current_acceleration):
        predictions = {}

        sensors = ["vibration", "temperature", "acceleration"]
        horizons = ["12h", "24h", "48h"]

        current_values = {
            "vibration": current_vibration,
            "temperature": current_temperature,
            "acceleration": current_acceleration
        }

        for sensor in sensors:
            for horizon in horizons:
                key = f"{sensor}_{horizon}"
                model = forecast_models.get(key)

                if model is None or sample is None:
                    predictions[key] = float(current_values[sensor])
                else:
                    predictions[key] = float(model.predict(sample)[0])

        return predictions

    # -----------------------------
    # HELPERS
    # -----------------------------

    def get_trend_status(self, current_risk, risk_12h, risk_24h, risk_48h):
        future_risks = [risk_12h, risk_24h, risk_48h]

        if "Critique" in future_risks and current_risk != "Critique":
            return "Dégradation critique prévue"

        if "Élevé" in future_risks and current_risk in ["Faible", "Moyen"]:
            return "Dégradation prévue"

        if risk_12h == current_risk and risk_24h == current_risk and risk_48h == current_risk:
            return "Stable"

        return "À surveiller"

    def build_risk_explanation(self, current_vibration, current_temperature, current_acceleration, diagnostic_result, ai_anomaly_label):
        explanation_parts = []

        if current_vibration >= 1.8:
            explanation_parts.append("vibration élevée")

        if current_temperature >= 65:
            explanation_parts.append("température élevée")

        if current_acceleration >= 3:
            explanation_parts.append("accélération anormale")

        if diagnostic_result["current_problem_bearing_wear"] in ["Élevé", "Critique"]:
            explanation_parts.append("usure des roulements probable")

        if diagnostic_result["current_problem_misalignment"] in ["Élevé", "Critique"]:
            explanation_parts.append("désalignement probable")

        if diagnostic_result["current_problem_lubrication"] in ["Élevé", "Critique"]:
            explanation_parts.append("problème de lubrification probable")

        if ai_anomaly_label == "Anomalie détectée":
            explanation_parts.append("anomalie détectée par le modèle IA")

        if not explanation_parts:
            return "Paramètres normaux"

        return "Risque détecté à cause de: " + ", ".join(explanation_parts)

    def safe_round(self, value, digits=2):
        if value is None:
            return None
        return builtins.round(float(value), digits)

    # -----------------------------
    # MAIN GOLD PROCESS
    # -----------------------------

    def process_department(self, silver_df, department):
        print(f"\n📁 Predicting for {department}...")

        ai_model = self.load_ai_model(department)
        forecast_models = self.load_forecast_models(department)

        parts = silver_df.select("part_code").distinct().collect()
        part_list = [p[0] for p in parts]

        print(f"   Parts to predict: {part_list}")

        all_predictions = []

        for part in part_list:
            part_name = generate_part_name(part)
            print(f"      📍 Predicting for part: {part} ({part_name})")

            part_df = silver_df.filter(col("part_code") == part)

            vib_count = part_df.filter(col("vibration").isNotNull()).count()
            print(f"         Vibration data points: {vib_count}")

            if vib_count == 0:
                print(f"         ⚠️ No vibration data for {part}")
                continue

            latest_row = part_df.orderBy(col("recorded_at").desc()).limit(1).collect()

            if not latest_row:
                print(f"         ⚠️ No data for {part}")
                continue

            latest = latest_row[0]

            machine_name = latest["machine_name"]

            current_vibration = float(latest["vibration"]) if latest["vibration"] is not None else 0.0
            current_temperature = float(latest["temperature"]) if latest["temperature"] is not None else 0.0
            current_acceleration = float(latest["acceleration"]) if latest["acceleration"] is not None else 0.0

            # Model 1: AI anomaly detection
            ai_anomaly_score, ai_anomaly_label, ai_status = self.predict_ai_anomaly(
                ai_model,
                current_vibration,
                current_temperature,
                current_acceleration
            )

            # Model 2: future sensor prediction
            forecast_sample = self.build_forecast_features(part_df)

            future_values = self.predict_future_values(
                forecast_models=forecast_models,
                sample=forecast_sample,
                current_vibration=current_vibration,
                current_temperature=current_temperature,
                current_acceleration=current_acceleration
            )

            # Model 3: diagnostic + decision engine
            diagnostic_result = self.diagnostic_engine.analyze(
                machine_name=machine_name,
                part_name=part_name,
                current_vibration=current_vibration,
                current_temperature=current_temperature,
                current_acceleration=current_acceleration,
                predicted_values=future_values,
                ai_anomaly_label=ai_anomaly_label,
                ai_anomaly_score=ai_anomaly_score
            )

            trend_status = self.get_trend_status(
                diagnostic_result["current_risk"],
                diagnostic_result["risk_12h"],
                diagnostic_result["risk_24h"],
                diagnostic_result["risk_48h"]
            )

            risk_explanation = self.build_risk_explanation(
                current_vibration,
                current_temperature,
                current_acceleration,
                diagnostic_result,
                ai_anomaly_label
            )

            prediction = {
                "department": department,
                "machine_name": machine_name,
                "part_code": part,
                "part_name": part_name,

                # Current real sensor values
                "current_vibration": self.safe_round(current_vibration),
                "current_temperature": self.safe_round(current_temperature),
                "current_acceleration": self.safe_round(current_acceleration),

                # Model 1 outputs
                "ai_anomaly_score": int(ai_anomaly_score),
                "ai_anomaly_label": ai_anomaly_label,
                "ai_status": ai_status,

                # Model 2 outputs: future predicted values
                "predicted_vibration_12h": self.safe_round(future_values["vibration_12h"]),
                "predicted_vibration_24h": self.safe_round(future_values["vibration_24h"]),
                "predicted_vibration_48h": self.safe_round(future_values["vibration_48h"]),

                "predicted_temperature_12h": self.safe_round(future_values["temperature_12h"]),
                "predicted_temperature_24h": self.safe_round(future_values["temperature_24h"]),
                "predicted_temperature_48h": self.safe_round(future_values["temperature_48h"]),

                "predicted_acceleration_12h": self.safe_round(future_values["acceleration_12h"]),
                "predicted_acceleration_24h": self.safe_round(future_values["acceleration_24h"]),
                "predicted_acceleration_48h": self.safe_round(future_values["acceleration_48h"]),

                # Extra compatibility with your old dashboard field names
                "predicted_12h": self.safe_round(future_values["vibration_12h"]),
                "predicted_24h": self.safe_round(future_values["vibration_24h"]),

                # Trend + explanation
                "trend_status": trend_status,
                "risk_explanation": risk_explanation,
            }

            # Model 3 outputs
            prediction.update(diagnostic_result)

            all_predictions.append(prediction)

            print(
                f"         ✅ Current Risk: {diagnostic_result['current_risk']} | "
                f"H+12: {diagnostic_result['risk_12h']} | "
                f"H+24: {diagnostic_result['risk_24h']} | "
                f"H+48: {diagnostic_result['risk_48h']} | "
                f"AI: {ai_anomaly_label} | "
                f"Health: {diagnostic_result['health_score']}% | "
                f"RUL: {diagnostic_result['rul_hours']}h"
            )

        if not all_predictions:
            print("   ⚠️ No predictions generated")
            return None

        result = self.spark.createDataFrame(all_predictions)
        result = result.withColumn("prediction_time", current_timestamp())

        output_path = str(self.gold_path / f"predictions_{department}")
        result.write.mode("overwrite").parquet(output_path)

        print(f"\n   ✅ Gold saved (Parquet): {output_path}")

        try:
            self.save_to_postgresql(result, f"predictions_{department}")
        except Exception as e:
            print(f"   ⚠️ Could not save to PostgreSQL: {e}")

        print(f"      Predictions: {result.count()}")
        result.show(truncate=False)

        return result