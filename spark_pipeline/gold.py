"""
GOLD LAYER: AI Predictions + Machine Problem Prediction
"""

from pyspark.sql.functions import *
from spark_pipeline.config import GOLD_PATH, generate_part_name, POSTGRESQL_CONFIG
import builtins


class GoldLayer:
    def __init__(self, spark):
        self.spark = spark
        self.gold_path = GOLD_PATH

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

    def get_level(self, value, medium, high, critical):
        if value >= critical:
            return "Critique"
        elif value >= high:
            return "Élevé"
        elif value >= medium:
            return "Moyen"
        else:
            return "Faible"

    def get_recommendation(self, current_risk, rul_hours):
        if current_risk == "Critique" or rul_hours <= 100:
            return "Maintenance urgente requise"
        elif current_risk == "Élevé" or rul_hours <= 300:
            return "Intervention à planifier rapidement"
        elif current_risk == "Moyen":
            return "Surveillance renforcée recommandée"
        else:
            return "Paramètres normaux"

    def get_priority_score(self, current_risk, risk_12h, risk_24h, rul_hours, anomaly_score):
        score = anomaly_score

        if current_risk == "Critique":
            score += 40
        elif current_risk == "Élevé":
            score += 25
        elif current_risk == "Moyen":
            score += 10

        if risk_12h == "Critique":
            score += 25
        elif risk_12h == "Élevé":
            score += 15

        if risk_24h == "Critique":
            score += 20
        elif risk_24h == "Élevé":
            score += 10

        if rul_hours <= 100:
            score += 30
        elif rul_hours <= 300:
            score += 20
        elif rul_hours <= 900:
            score += 10

        return builtins.min(100, score)

    def process_department(self, silver_df, department):
        print(f"\n📁 Predicting for {department}...")

        parts = silver_df.select("part_code").distinct().collect()
        part_list = [p[0] for p in parts]

        print(f"   Parts to predict: {part_list}")

        all_predictions = []

        for part in part_list:
            print(f"      📍 Predicting for part: {part} ({generate_part_name(part)})")

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

            current_vibration = float(latest["vibration"]) if latest["vibration"] is not None else 0.0
            current_temperature = float(latest["temperature"]) if latest["temperature"] is not None else 0.0
            current_acceleration = float(latest["acceleration"]) if latest["acceleration"] is not None else 0.0
            machine_name = latest["machine_name"]

            predicted_12h = current_vibration * 1.02
            predicted_24h = current_vibration * 1.04

            current_risk = self.get_level(
                current_vibration,
                medium=1.8,
                high=2.5,
                critical=3.5
            )

            risk_12h = self.get_level(
                predicted_12h,
                medium=1.8,
                high=2.5,
                critical=3.5
            )

            risk_24h = self.get_level(
                predicted_24h,
                medium=1.8,
                high=2.5,
                critical=3.5
            )

            if current_risk == "Critique":
                rul_hours = 50
            elif current_risk == "Élevé":
                rul_hours = 300
            elif current_risk == "Moyen":
                rul_hours = 900
            else:
                rul_hours = 3000

            anomaly_score = builtins.min(
                100,
                int(
                    (current_vibration / 3.5) * 50 +
                    (current_temperature / 85) * 30 +
                    (current_acceleration / 8) * 20
                )
            )

            problem_vibration = self.get_level(
                current_vibration,
                medium=1.8,
                high=2.5,
                critical=3.5
            )

            problem_overheating = self.get_level(
                current_temperature,
                medium=65,
                high=75,
                critical=85
            )

            if current_vibration > 2.5 and current_acceleration > 5:
                problem_misalignment = "Critique"
            elif current_vibration > 2.0 and current_acceleration > 4:
                problem_misalignment = "Élevé"
            elif current_vibration > 1.5 and current_acceleration > 3:
                problem_misalignment = "Moyen"
            else:
                problem_misalignment = "Faible"

            if current_vibration > 3.0:
                problem_bearing_wear = "Critique"
            elif current_vibration > 2.2:
                problem_bearing_wear = "Élevé"
            elif current_vibration > 1.6:
                problem_bearing_wear = "Moyen"
            else:
                problem_bearing_wear = "Faible"

            if rul_hours <= 100 or anomaly_score >= 80:
                problem_sudden_failure = "Critique"
            elif rul_hours <= 300 or anomaly_score >= 60:
                problem_sudden_failure = "Élevé"
            elif rul_hours <= 900 or anomaly_score >= 40:
                problem_sudden_failure = "Moyen"
            else:
                problem_sudden_failure = "Faible"

            health_score = 100 - anomaly_score

            if current_risk == "Critique":
                health_score -= 30
            elif current_risk == "Élevé":
                health_score -= 20
            elif current_risk == "Moyen":
                health_score -= 10

            health_score = builtins.max(0, builtins.min(100, health_score))

            if current_risk == "Critique" or rul_hours <= 100:
                maintenance_priority = "Priorité haute"
            elif current_risk == "Élevé" or rul_hours <= 300:
                maintenance_priority = "Priorité moyenne"
            else:
                maintenance_priority = "Priorité faible"

            if risk_24h in ["Élevé", "Critique"] and current_risk in ["Faible", "Moyen"]:
                trend_status = "Dégradation prévue"
            elif risk_24h == current_risk:
                trend_status = "Stable"
            else:
                trend_status = "À surveiller"

            explanation_parts = []

            if current_vibration > 1.8:
                explanation_parts.append("vibration élevée")

            if current_temperature > 65:
                explanation_parts.append("température élevée")

            if current_acceleration > 3:
                explanation_parts.append("accélération anormale")

            if anomaly_score >= 40:
                explanation_parts.append("score d'anomalie important")

            if not explanation_parts:
                risk_explanation = "Paramètres normaux"
            else:
                risk_explanation = "Risque détecté à cause de: " + ", ".join(explanation_parts)

            maintenance_recommendation = self.get_recommendation(current_risk, rul_hours)

            priority_score = self.get_priority_score(
                current_risk,
                risk_12h,
                risk_24h,
                rul_hours,
                anomaly_score
            )

            prediction = {
                "department": department,
                "machine_name": machine_name,
                "part_code": part,
                "part_name": generate_part_name(part),

                "current_vibration": builtins.round(current_vibration, 2),
                "current_temperature": builtins.round(current_temperature, 2),
                "current_acceleration": builtins.round(current_acceleration, 2),

                "predicted_12h": builtins.round(predicted_12h, 2),
                "predicted_24h": builtins.round(predicted_24h, 2),

                "current_risk": current_risk,
                "risk_12h": risk_12h,
                "risk_24h": risk_24h,

                "rul_hours": rul_hours,
                "anomaly_score": anomaly_score,
                "health_score": health_score,
                "priority_score": priority_score,

                "problem_vibration": problem_vibration,
                "problem_overheating": problem_overheating,
                "problem_misalignment": problem_misalignment,
                "problem_bearing_wear": problem_bearing_wear,
                "problem_sudden_failure": problem_sudden_failure,

                "maintenance_priority": maintenance_priority,
                "maintenance_recommendation": maintenance_recommendation,
                "trend_status": trend_status,
                "risk_explanation": risk_explanation
            }

            all_predictions.append(prediction)

            print(
                f"         ✅ Risk: {current_risk} | "
                f"H+12: {risk_12h} | "
                f"H+24: {risk_24h} | "
                f"Health: {health_score}% | "
                f"RUL: {rul_hours}h"
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