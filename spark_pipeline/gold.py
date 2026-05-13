# spark_pipeline/gold.py
"""
GOLD LAYER: AI Predictions
"""

from pyspark.sql.functions import *
from spark_pipeline.config import GOLD_PATH, generate_part_name
import builtins

class GoldLayer:
    def __init__(self, spark):
        self.spark = spark
        self.gold_path = GOLD_PATH
    
    def process_department(self, silver_df, department):
        """Calculate predictions for all parts"""
        
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
            
            # Calculate RUL based on vibration level
            if current_vibration > 3.5:
                rul_hours = 0
            elif current_vibration > 2.5:
                rul_hours = 720  # 30 days
            elif current_vibration > 1.8:
                rul_hours = 2160  # 90 days
            else:
                rul_hours = 8760  # 1 year
            
            # Calculate risk level
            if rul_hours < 168:
                risk_level = "Critique"
            elif rul_hours < 720:
                risk_level = "Élevé"
            elif rul_hours < 2160:
                risk_level = "Moyen"
            else:
                risk_level = "Faible"
            
            # Predicted 12h - use builtins.round to avoid Spark's round
            predicted_12h = builtins.round(current_vibration * 1.02, 2)
            
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
                "predicted_12h": predicted_12h,
                "rul_hours": rul_hours,
                "risk_level": risk_level,
                "anomaly_score": anomaly_score
            }
            
            all_predictions.append(prediction)
            print(f"         ✅ Current Vib: {current_vibration} | Predicted: {predicted_12h} | RUL: {rul_hours}h | Risk: {risk_level}")
        
        if not all_predictions:
            print(f"   ⚠️ No predictions generated")
            return None
        
        # Convert to Spark DataFrame
        result = self.spark.createDataFrame(all_predictions)
        
        # Add prediction timestamp
        result = result.withColumn("prediction_time", current_timestamp())
        
        # Save to Gold layer
        output_path = str(self.gold_path / f"predictions_{department}")
        result.write.mode("overwrite").parquet(output_path)
        
        print(f"\n   ✅ Gold saved: {output_path}")
        print(f"      Predictions: {result.count()}")
        result.show(truncate=False)
        
        return result