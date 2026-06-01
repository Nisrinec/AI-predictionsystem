# spark_pipeline/bronze.py
"""
BRONZE LAYER: Raw data ingestion
"""

from pathlib import Path
from pyspark.sql.functions import *
from spark_pipeline.config import RAW_DATA_PATH, BRONZE_PATH


class BronzeLayer:
    def __init__(self, spark):
        self.spark = spark
        self.bronze_path = BRONZE_PATH
    
    def find_timestamp_column(self, df):
        """Find the timestamp column"""
        for col_name in df.columns:
            if 'DateTime' in col_name or 'Date' in col_name or 'Timestamp' in col_name:
                return col_name
        return None
    
    # spark_pipeline/bronze.py - Fix the process_csv_file method

    def process_csv_file(self, file_path, department, machine_name, metric_type):
        """Process a single CSV file"""
        
        if not file_path.exists():
            return None
        
        print(f"         📄 Reading: {file_path.name}")
        
        # Read CSV
        df = self.spark.read.option("header", "true").csv(str(file_path))
        
        if df.count() == 0:
            print(f"         ⚠️ Empty file")
            return None
        
        # Find timestamp column
        ts_col = self.find_timestamp_column(df)
        if ts_col is None:
            print(f"         ⚠️ No timestamp column found")
            return None
        
        # Convert timestamp
        df = df.withColumn("recorded_at", to_timestamp(col(ts_col), "yyyy-MM-dd HH:mm:ss")) \
               .drop(ts_col) \
               .filter(col("recorded_at").isNotNull())
        
        # Find sensor columns (with -O, -V, -T)
        sensor_cols = [c for c in df.columns if '-O' in c or '-V' in c or '-T' in c]
        
        if not sensor_cols:
            print(f"         ⚠️ No sensor columns found")
            return None
        
        # Reshape to long format
        all_dfs = []
        for col_name in sensor_cols:
            part_code = col_name.split('-')[0]
            
            # Determine metric type from the file being read, NOT from the column suffix!
            # The file name tells us what type of data it is
            # metric_type should be based on the file (acceleration, vibration, or temperature)
            # NOT based on the column suffix (-O, -V, -T)
            
            # Use the metric_type passed as parameter (from the file name)
            # This is the key fix!
            metric = metric_type  # 'acceleration', 'vibration', or 'temperature'
            
            temp_df = df.select(
                col("recorded_at"),
                lit(part_code).alias("part_code"),
                lit(metric).alias("metric_type"),
                col(col_name).alias("value")
            ).filter(col("value").isNotNull())
            
            all_dfs.append(temp_df)
        
        if not all_dfs:
            return None
        
        result = all_dfs[0]
        for temp_df in all_dfs[1:]:
            result = result.union(temp_df)
        
        # Add metadata
        result = result.withColumn("department", lit(department)) \
                       .withColumn("machine_name", lit(machine_name)) \
                       .withColumn("metric_file", lit(metric_type)) \
                       .withColumn("ingested_at", current_timestamp())
        
        # Add date partitions
        result = result.withColumn("year", year("recorded_at")) \
                       .withColumn("month", month("recorded_at")) \
                       .withColumn("day", dayofmonth("recorded_at"))
        
        # Debug: Show what metric_type was set
        print(f"         ✅ {metric_type}: {result.count()} rows, metric_type={metric_type}")
        
        return result
    
    def process_machine(self, department, machine_name):
        """Process all CSV files for a machine"""
        
        machine_path = RAW_DATA_PATH / department / machine_name
        
        if not machine_path.exists():
            print(f"   ⚠️ Path not found: {machine_path}")
            return None
        
        print(f"   🖥️  Machine: {machine_name}")
        
        all_dfs = []
        
        files = {
            'acceleration': machine_path / "AccelerationData.csv",
            'vibration': machine_path / "VibrationData.csv",
            'temperature': machine_path / "TemperatureData.csv"
        }
        
        for metric_type, file_path in files.items():
            if file_path.exists():
                df = self.process_csv_file(file_path, department, machine_name, metric_type)
                if df is not None:
                    all_dfs.append(df)
                    print(f"         ✅ {metric_type}: {df.count()} rows")
            else:
                print(f"         ⚠️ Missing: {file_path.name}")
        
        if not all_dfs:
            return None
        
        result = all_dfs[0]
        for df in all_dfs[1:]:
            result = result.union(df)
        
        return result
    
    def process_department(self, department):
        """Process all machines in a department"""
        
        print(f"\n📁 Processing department: {department}")
        
        dept_path = RAW_DATA_PATH / department
        if not dept_path.exists():
            print(f"   ⚠️ Path not found: {dept_path}")
            return None
        
        machine_folders = [d for d in dept_path.iterdir() if d.is_dir()]
        
        if not machine_folders:
            print(f"   ⚠️ No machine folders found")
            return None
        
        print(f"   Machines found: {[f.name for f in machine_folders]}")
        
        all_dfs = []
        
        for machine_path in machine_folders:
            machine_name = machine_path.name
            df = self.process_machine(department, machine_name)
            if df is not None:
                all_dfs.append(df)
        
        if not all_dfs:
            print(f"   ❌ No data for {department}")
            return None
        
        result = all_dfs[0]
        for df in all_dfs[1:]:
            result = result.union(df)
        
        output_path = str(self.bronze_path / department)
        result.write.mode("overwrite").parquet(output_path)
        
        total_rows = result.count()
        unique_parts = result.select("part_code").distinct().count()
        
        print(f"\n   ✅ Bronze saved: {output_path}")
        print(f"      Total rows: {total_rows:,}")
        print(f"      Unique parts: {unique_parts}")
        
        return result