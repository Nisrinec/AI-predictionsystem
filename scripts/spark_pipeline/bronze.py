from pyspark.sql.functions import *
from spark_pipeline.config import RAW_DATA_PATH, BRONZE_PATH


class BronzeLayer:
    def __init__(self, spark):
        self.spark = spark
        self.bronze_path = BRONZE_PATH

    def find_timestamp_column(self, df):
        for col_name in df.columns:
            if "DateTime" in col_name or "Date" in col_name or "Timestamp" in col_name:
                return col_name
        return None

    def process_csv_file(self, file_path, department, machine_name, metric_type):
        if not file_path.exists():
            return None

        print(f"         Reading: {file_path.name}")

        df = self.spark.read.option("header", "true").csv(str(file_path))

        if df.count() == 0:
            return None

        ts_col = self.find_timestamp_column(df)
        if ts_col is None:
            print("         No timestamp column found")
            return None

        df = (
            df.withColumn("recorded_at", to_timestamp(col(ts_col)))
            .drop(ts_col)
            .filter(col("recorded_at").isNotNull())
        )

        sensor_cols = [c for c in df.columns if "-V" in c or "-O" in c or "-T" in c]

        if not sensor_cols:
            return None

        all_dfs = []

        for col_name in sensor_cols:
            part_code = col_name.split("-")[0]

            temp_df = df.select(
                col("recorded_at"),
                lit(part_code).alias("part_code"),
                lit(metric_type).alias("metric_type"),
                col(col_name).cast("double").alias("value")
            ).filter(col("value").isNotNull())

            all_dfs.append(temp_df)

        result = all_dfs[0]
        for temp_df in all_dfs[1:]:
            result = result.union(temp_df)

        result = (
            result.withColumn("department", lit(department))
            .withColumn("machine_name", lit(machine_name))
            .withColumn("metric_file", lit(metric_type))
            .withColumn("ingested_at", current_timestamp())
            .withColumn("year", year("recorded_at"))
            .withColumn("month", month("recorded_at"))
            .withColumn("day", dayofmonth("recorded_at"))
        )

        print(f"         {metric_type}: {result.count()} rows")
        return result

    def process_machine(self, department, machine_name):
        machine_path = RAW_DATA_PATH / department / machine_name

        if not machine_path.exists():
            return None

        print(f"   Machine: {machine_name}")

        files = {
            "vibration": machine_path / "VibrationData.csv",
            "acceleration": machine_path / "AccelerationData.csv",
            "temperature": machine_path / "TemperatureData.csv",
        }

        all_dfs = []

        for metric_type, file_path in files.items():
            if file_path.exists():
                df = self.process_csv_file(file_path, department, machine_name, metric_type)
                if df is not None:
                    all_dfs.append(df)
            else:
                print(f"         Missing optional file: {file_path.name}")

        if not all_dfs:
            return None

        result = all_dfs[0]
        for df in all_dfs[1:]:
            result = result.union(df)

        return result

    def process_department(self, department):
        print(f"\nProcessing department: {department}")

        dept_path = RAW_DATA_PATH / department
        if not dept_path.exists():
            return None

        machine_folders = [d for d in dept_path.iterdir() if d.is_dir()]

        all_dfs = []

        for machine_path in machine_folders:
            df = self.process_machine(department, machine_path.name)
            if df is not None:
                all_dfs.append(df)

        if not all_dfs:
            return None

        result = all_dfs[0]
        for df in all_dfs[1:]:
            result = result.union(df)

        output_path = str(self.bronze_path / department)
        result.write.mode("overwrite").parquet(output_path)

        print(f"Bronze saved: {output_path}")
        return result