from pyspark.sql.functions import *
from pyspark.sql.window import Window
from spark_pipeline.config import SILVER_PATH


class SilverLayer:
    def __init__(self, spark):
        self.spark = spark
        self.silver_path = SILVER_PATH

    def process_department(self, bronze_df, department):
        print(f"\nCleaning {department}...")

        bronze_df = bronze_df.withColumn("value", col("value").cast("double"))
        bronze_df = bronze_df.filter(col("value").isNotNull())

        vib_df = (
            bronze_df
            .filter(col("metric_type") == "vibration")
            .select("machine_name", "part_code", "recorded_at", col("value").alias("vibration"))
        )

        temp_df = (
            bronze_df
            .filter(col("metric_type") == "temperature")
            .select("machine_name", "part_code", "recorded_at", col("value").alias("temperature"))
        )

        accel_df = (
            bronze_df
            .filter(col("metric_type") == "acceleration")
            .select("machine_name", "part_code", "recorded_at", col("value").alias("acceleration"))
        )

        if vib_df.count() == 0:
            print("No vibration data found")
            return None

        merged = vib_df.join(
            temp_df,
            on=["machine_name", "part_code", "recorded_at"],
            how="left"
        ).join(
            accel_df,
            on=["machine_name", "part_code", "recorded_at"],
            how="left"
        )

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

        cleaned = cleaned.withColumn(
            "vibration",
            when((col("vibration") < 0) | (col("vibration") > 30), None)
            .otherwise(col("vibration"))
        )

        cleaned = cleaned.withColumn(
            "temperature",
            when((col("temperature") < -10) | (col("temperature") > 120), None)
            .otherwise(col("temperature"))
        )

        cleaned = cleaned.withColumn(
            "acceleration",
            when((col("acceleration") < 0) | (col("acceleration") > 20), None)
            .otherwise(col("acceleration"))
        )

        cleaned = cleaned.filter(col("vibration").isNotNull())

        cleaned = (
            cleaned
            .withColumn("hour", hour("recorded_at"))
            .withColumn("weekday", dayofweek("recorded_at"))
            .withColumn("year", year("recorded_at"))
            .withColumn("month", month("recorded_at"))
            .withColumn("day", dayofmonth("recorded_at"))
            .withColumn("department", lit(department))
        )

        print("Final Silver sample:")
        cleaned.show(10, truncate=False)

        output_path = str(self.silver_path / department)
        cleaned.write.mode("overwrite").parquet(output_path)

        print(f"Silver saved: {output_path}")
        return cleaned