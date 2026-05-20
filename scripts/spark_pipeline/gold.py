"""
GOLD LAYER: AI Predictions
Updated with current risk and 12h risk
"""

from pyspark.sql.functions import *
from pyspark.sql.window import Window
from spark_pipeline.config import GOLD_PATH, generate_part_name, POSTGRESQL_CONFIG
import builtins

class GoldLayer:
    def __init__(self, spark):
        self.spark = spark
        self.gold_path = GOLD_PATH
    
    def save_to_postgresql(self, df, table_name):
        """Save predictions to PostgreSQL"""
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
    
    def process_department(self, silver_df, department):
        """Calculate predictions for all parts with current and 12h risk"""
        
        print(f"\n📁 Predicting for {department}...")
        
        # Get all parts
        parts = silver_df.select("part_code").distinct().collect()
        part_list = [p[0] for p in parts]
        print(f"   Parts to predict: {part_list}")
        
        all_predictions = []
        
        for part in part_list:
            print(f"      📍 Predicting for part: {part} ({generate_part_name(part)})")
            
            # Filter data for this part
            part_df = silver_df.filter(col("part_code") == part)
            
            # Check vibration data
            vib_count = part_df.filter(col("vibration").isNotNull()).count()
            print(f"         Vibration data points: {vib_count}")
            
            if vib_count == 0:
                print(f"         ⚠️ No vibration data for {part}")
                continue
            
            # Get latest values
            latest_row = part_df.orderBy(col("recorded_at").desc()).limit(1).collect()
            
            if not latest_row:
                print(f"         ⚠️ No data for {part}")
                continue
            
            latest = latest_row[0]
            
            # Extract values (convert to Python float)
            current_vibration = float(latest['vibration']) if latest['vibration'] is not None else 0.0
            current_temperature = float(latest['temperature']) if latest['temperature'] is not None else 0.0
            current_acceleration = float(latest['acceleration']) if latest['acceleration'] is not None else 0.0
            machine_name = latest['machine_name']
            
            print(f"         Current vibration: {current_vibration}")
            
            # Calculate RUL and risks based on vibration level
            predicted_vibration_12h = current_vibration * 1.02
            
            # Determine current risk and 12h risk
            if current_vibration > 3.5:
                rul_hours = 0
                current_risk = "Critique"
                if predicted_vibration_12h > 3.5:
                    risk_12h = "Critique"
                elif predicted_vibration_12h > 2.5:
                    risk_12h = "Élevé"
                elif predicted_vibration_12h > 1.8:
                    risk_12h = "Moyen"
                else:
                    risk_12h = "Faible"
                    
            elif current_vibration > 2.5:
                rul_hours = 720
                current_risk = "Élevé"
                if predicted_vibration_12h > 3.5:
                    risk_12h = "Critique"
                elif predicted_vibration_12h > 2.5:
                    risk_12h = "Élevé"
                elif predicted_vibration_12h > 1.8:
                    risk_12h = "Moyen"
                else:
                    risk_12h = "Faible"
                    
            elif current_vibration > 1.8:
                rul_hours = 2160
                current_risk = "Moyen"
                if predicted_vibration_12h > 3.5:
                    risk_12h = "Critique"
                elif predicted_vibration_12h > 2.5:
                    risk_12h = "Élevé"
                elif predicted_vibration_12h > 1.8:
                    risk_12h = "Moyen"
                else:
                    risk_12h = "Faible"
            else:
                rul_hours = 8760
                current_risk = "Faible"
                if predicted_vibration_12h > 3.5:
                    risk_12h = "Critique"
                elif predicted_vibration_12h > 2.5:
                    risk_12h = "Élevé"
                elif predicted_vibration_12h > 1.8:
                    risk_12h = "Moyen"
                else:
                    risk_12h = "Faible"
            
            # Simple anomaly score based on vibration level
            if current_vibration > 3.0:
                anomaly_score = 80
            elif current_vibration > 2.5:
                anomaly_score = 60
            elif current_vibration > 2.0:
                anomaly_score = 40
            elif current_vibration > 1.5:
                anomaly_score = 20
            else:
                anomaly_score = 0
            
            # Create prediction dictionary
            prediction = {
                "part_code": part,
                "part_name": generate_part_name(part),
                "machine_name": machine_name,
                "current_vibration": builtins.round(current_vibration, 2),
                "current_temperature": builtins.round(current_temperature, 2),
                "current_acceleration": builtins.round(current_acceleration, 2),
                "predicted_12h": builtins.round(predicted_vibration_12h, 2),
                "current_risk": current_risk,
                "risk_12h": risk_12h,
                "rul_hours": rul_hours,
                "anomaly_score": anomaly_score
            }
            
            all_predictions.append(prediction)
            print(f"         ✅ Current: {current_vibration} | Risk: {current_risk} → 12h: {predicted_vibration_12h:.2f} | Risk: {risk_12h}")
        
        if not all_predictions:
            print(f"   ⚠️ No predictions generated")
            return None
        
        # Convert to Spark DataFrame
        result = self.spark.createDataFrame(all_predictions)
        
        # Add prediction timestamp
        result = result.withColumn("prediction_time", current_timestamp())
        
        # Save to Gold layer (Parquet)
        output_path = str(self.gold_path / f"predictions_{department}")
        result.write.mode("overwrite").parquet(output_path)
        print(f"\n   ✅ Gold saved (Parquet): {output_path}")
        
        # Save to PostgreSQL database
        try:
            self.save_to_postgresql(result, f"predictions_{department}")
        except Exception as e:
            print(f"   ⚠️ Could not save to PostgreSQL: {e}")
            print("   (PostgreSQL may not be running)")
        
        print(f"      Predictions: {result.count()}")
        result.show(truncate=False)
        
        return result