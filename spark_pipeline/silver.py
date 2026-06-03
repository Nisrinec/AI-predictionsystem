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

        print("   Bronze records by metric_type:")
        metric_counts = bronze_df.groupBy("metric_type").count().collect()

        for row in metric_counts:
            print(f"      {row['metric_type']}: {row['count']:,} records")

        # Convert value to double before split
        bronze_df = bronze_df.withColumn("value", col("value").cast("double"))

        # Remove invalid numeric values
        bronze_df = bronze_df.filter(col("value").isNotNull())

        accel_df = (
            bronze_df
            .filter(col("metric_type") == "acceleration")
            .select(
                "machine_name",
                "part_code",
                "recorded_at",
                col("value").alias("acceleration")
            )
        )

        vib_df = (
            bronze_df
            .filter(col("metric_type") == "vibration")
            .select(
                "machine_name",
                "part_code",
                "recorded_at",
                col("value").alias("vibration")
            )
        )

        temp_df = (
            bronze_df
            .filter(col("metric_type") == "temperature")
            .select(
                "machine_name",
                "part_code",
                "recorded_at",
                col("value").alias("temperature")
            )
        )

        print("\n   After filtering:")
        print(f"      Acceleration records: {accel_df.count()}")
        print(f"      Vibration records: {vib_df.count()}")
        print(f"      Temperature records: {temp_df.count()}")

        if vib_df.count() == 0:
            print("\n   ⚠️ WARNING: No vibration data found!")
            bronze_df.show(5, truncate=False)
            return None

        # Use vibration as the base because prediction depends mainly on vibration
        merged = vib_df

        merged = merged.join(
            temp_df,
            on=["machine_name", "part_code", "recorded_at"],
            how="left"
        )

        merged = merged.join(
            accel_df,
            on=["machine_name", "part_code", "recorded_at"],
            how="left"
        )

        print(f"\n   After merge: {merged.count():,} records")

        # Remove duplicates
        window = Window.partitionBy(
            "machine_name",
            "part_code",
            "recorded_at"
        ).orderBy("recorded_at")

        cleaned = (
            merged
            .withColumn("rn", row_number().over(window))
            .filter(col("rn") == 1)
            .drop("rn")
        )

        # Remove impossible/outlier values
        cleaned = cleaned.withColumn(
            "vibration",
            when((col("vibration") < 0) | (col("vibration") > 15), None)
            .otherwise(col("vibration"))
        )

        cleaned = cleaned.withColumn(
            "acceleration",
            when((col("acceleration") < 0) | (col("acceleration") > 15), None)
            .otherwise(col("acceleration"))
        )

        cleaned = cleaned.withColumn(
            "temperature",
            when((col("temperature") < -10) | (col("temperature") > 120), None)
            .otherwise(col("temperature"))
        )

        # Keep only rows that have vibration
        cleaned = cleaned.filter(col("vibration").isNotNull())

        # Calculate part-level averages for filling missing temp/acceleration
        stats_window = Window.partitionBy("machine_name", "part_code")

        cleaned = cleaned.withColumn(
            "avg_temperature_part",
            avg("temperature").over(stats_window)
        ).withColumn(
            "avg_acceleration_part",
            avg("acceleration").over(stats_window)
        )

        # Department-level averages as fallback
        dept_stats = cleaned.agg(
            avg("temperature").alias("avg_temperature_dept"),
            avg("acceleration").alias("avg_acceleration_dept")
        ).collect()[0]

        avg_temperature_dept = dept_stats["avg_temperature_dept"] or 0.0
        avg_acceleration_dept = dept_stats["avg_acceleration_dept"] or 0.0

        cleaned = cleaned.withColumn(
            "temperature",
            when(
                col("temperature").isNull(),
                coalesce(col("avg_temperature_part"), lit(avg_temperature_dept))
            ).otherwise(col("temperature"))
        )

        cleaned = cleaned.withColumn(
            "acceleration",
            when(
                col("acceleration").isNull(),
                coalesce(col("avg_acceleration_part"), lit(avg_acceleration_dept))
            ).otherwise(col("acceleration"))
        )

        cleaned = cleaned.drop("avg_temperature_part", "avg_acceleration_part")

        # Final safety: remove rows still missing required ML features
        cleaned = cleaned.filter(
            col("vibration").isNotNull() &
            col("temperature").isNotNull() &
            col("acceleration").isNotNull()
        )

        # Add time features
        cleaned = (
            cleaned
            .withColumn("hour", hour("recorded_at"))
            .withColumn("weekday", dayofweek("recorded_at"))
            .withColumn("year", year("recorded_at"))
            .withColumn("month", month("recorded_at"))
            .withColumn("day", dayofmonth("recorded_at"))
        )

        cleaned = cleaned.withColumn("department", lit(department))

        print("\n   Final cleaned sample:")
        cleaned.show(10, truncate=False)

        print("\n   Null check after cleaning:")
        cleaned.select(
            count("*").alias("total_rows"),
            count(when(col("vibration").isNull(), 1)).alias("null_vibration"),
            count(when(col("temperature").isNull(), 1)).alias("null_temperature"),
            count(when(col("acceleration").isNull(), 1)).alias("null_acceleration")
        ).show(truncate=False)

        output_path = str(self.silver_path / department)
        cleaned.write.mode("overwrite").parquet(output_path)

        print(f"\n   ✅ Silver saved: {output_path}")
        print(f"      Rows: {cleaned.count():,}")

        return cleaned