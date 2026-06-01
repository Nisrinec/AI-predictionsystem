# spark_pipeline/silver.py
"""
SILVER LAYER: Data cleaning and merging
"""

from pyspark.sql.functions import *
from pyspark.sql.window import Window
from spark_pipeline.config import SILVER_PATH


class SilverLayer:
    def __init__(self, spark):
        self.spark = spark
        self.silver_path = SILVER_PATH
    
    def process_department(self, bronze_df, department):
        """Clean and merge data for a department"""
        
        print(f"\n📁 Cleaning {department}...")
        
        # First, let's see what we have in bronze
        print(f"   Bronze records by metric_type:")
        metric_counts = bronze_df.groupBy("metric_type").count().collect()
        for row in metric_counts:
            print(f"      {row['metric_type']}: {row['count']:,} records")
        
        # Separate data by metric_type (using the correct column name)
        accel_df = bronze_df.filter(col("metric_type") == "acceleration") \
                           .select("machine_name", "part_code", "recorded_at", 
                                   col("value").alias("acceleration"))
        
        vib_df = bronze_df.filter(col("metric_type") == "vibration") \
                         .select("machine_name", "part_code", "recorded_at", 
                                 col("value").alias("vibration"))
        
        temp_df = bronze_df.filter(col("metric_type") == "temperature") \
                          .select("machine_name", "part_code", "recorded_at", 
                                  col("value").alias("temperature"))
        
        print(f"\n   After filtering:")
        print(f"      Acceleration records: {accel_df.count()}")
        print(f"      Vibration records: {vib_df.count()}")
        print(f"      Temperature records: {temp_df.count()}")
        
        # If vibration records are missing, show sample of bronze data
        if vib_df.count() == 0:
            print("\n   ⚠️ WARNING: No vibration data found!")
            print("   Sample of bronze data:")
            bronze_df.show(5, truncate=False)
            return None
        
        # Join all three dataframes
        merged = accel_df
        if vib_df.count() > 0:
            merged = merged.join(vib_df, on=["machine_name", "part_code", "recorded_at"], how="outer")
        
        if temp_df.count() > 0:
            merged = merged.join(temp_df, on=["machine_name", "part_code", "recorded_at"], how="outer")
        
        print(f"\n   After merge: {merged.count():,} records")
        
        # Remove duplicates - add ORDER BY clause
        window = Window.partitionBy("machine_name", "part_code", "recorded_at").orderBy("recorded_at")
        cleaned = merged.withColumn("rn", row_number().over(window)) \
                        .filter(col("rn") == 1) \
                        .drop("rn")
        
        # Remove outliers
        cleaned = cleaned.withColumn("vibration",
            when((col("vibration") < 0) | (col("vibration") > 15), None)
            .otherwise(col("vibration")))
        
        cleaned = cleaned.withColumn("acceleration",
            when((col("acceleration") < 0) | (col("acceleration") > 15), None)
            .otherwise(col("acceleration")))
        
        cleaned = cleaned.withColumn("temperature",
            when((col("temperature") < -10) | (col("temperature") > 120), None)
            .otherwise(col("temperature")))
        
        # Add time features
        cleaned = cleaned.withColumn("hour", hour("recorded_at")) \
                 .withColumn("weekday", dayofweek("recorded_at")) \
                 .withColumn("year", year("recorded_at")) \
                 .withColumn("month", month("recorded_at")) \
                 .withColumn("day", dayofmonth("recorded_at"))
        
        # Add department
        cleaned = cleaned.withColumn("department", lit(department))
        
        # Show sample with vibration data
        print(f"\n   Sample with vibration data:")
        cleaned.filter(col("vibration").isNotNull()).show(10, truncate=False)
        
        # Save to Silver
        output_path = str(self.silver_path / department)
        cleaned.write.mode("overwrite").parquet(output_path)
        
        print(f"\n   ✅ Silver saved: {output_path}")
        print(f"      Rows: {cleaned.count():,}")
        
        return cleaned