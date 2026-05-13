# spark_pipeline/main_pipeline.py
"""
Main Pipeline Orchestrator
"""

import os
import sys
from pathlib import Path
from datetime import datetime

os.environ["PYSPARK_PYTHON"] = r"C:\Users\sally\AppData\Local\Programs\Python\Python311\python.exe"
os.environ["PYSPARK_DRIVER_PYTHON"] = r"C:\Users\sally\AppData\Local\Programs\Python\Python311\python.exe"
os.environ["HADOOP_HOME"] = r"C:\hadoop"

sys.path.insert(0, str(Path(__file__).parent.parent))

from pyspark.sql import SparkSession
from spark_pipeline.config import SPARK_CONFIG, DEPARTMENTS
from spark_pipeline.bronze import BronzeLayer
from spark_pipeline.silver import SilverLayer
from spark_pipeline.gold import GoldLayer


def create_spark_session():
    """Create Spark session"""
    
    builder = SparkSession.builder
    
    for key, value in SPARK_CONFIG.items():
        builder = builder.config(key, value)
    
    jars_path = Path(__file__).parent / "jars"
    jar_files = list(jars_path.glob("postgresql-*.jar"))
    
    if jar_files:
        builder = builder.config("spark.jars", ",".join(str(j) for j in jar_files))
    
    spark = builder.getOrCreate()
    spark.sparkContext.setLogLevel("WARN")
    
    print("="*60)
    print("🚀 SPARK SESSION CREATED")
    print("="*60)
    
    return spark


def run_full_pipeline():
    """Run complete pipeline"""
    
    start_time = datetime.now()
    
    print("\n" + "🔧"*35)
    print("   PRODUCTION SPARK PIPELINE")
    print("   Bronze → Silver → Gold")
    print("🔧"*35)
    
    spark = create_spark_session()
    
    try:
        bronze = BronzeLayer(spark)
        silver = SilverLayer(spark)
        gold = GoldLayer(spark)
        
        # Bronze layer
        print("\n🥉 BRONZE LAYER")
        print("-"*40)
        bronze_data = {}
        for dept in DEPARTMENTS:
            df = bronze.process_department(dept)
            if df is not None:
                bronze_data[dept] = df
        
        if not bronze_data:
            print("❌ No data ingested")
            return
        
        # Silver layer
        print("\n🥈 SILVER LAYER")
        print("-"*40)
        silver_data = {}
        for dept, df in bronze_data.items():
            cleaned_df = silver.process_department(df, dept)
            if cleaned_df is not None:
                silver_data[dept] = cleaned_df
        
        # Gold layer
        print("\n🥇 GOLD LAYER")
        print("-"*40)
        for dept, df in silver_data.items():
            gold.process_department(df, dept)
        
        duration = (datetime.now() - start_time).total_seconds()
        print(f"\n✅ Pipeline completed in {duration:.1f}s")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        spark.stop()


if __name__ == "__main__":
    run_full_pipeline()