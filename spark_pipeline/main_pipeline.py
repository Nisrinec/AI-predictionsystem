# spark_pipeline/main_pipeline.py

"""
Main Pipeline Orchestrator
Bronze -> Silver -> Gold
"""

import os
import sys
from pathlib import Path
from datetime import datetime

PYTHON_PATH = "/usr/local/bin/python3.8"

os.environ["PYSPARK_PYTHON"] = PYTHON_PATH
os.environ["PYSPARK_DRIVER_PYTHON"] = PYTHON_PATH

sys.path.insert(0, str(Path(__file__).parent.parent))

from pyspark.sql import SparkSession
from spark_pipeline.config import DEPARTMENTS
from spark_pipeline.bronze import BronzeLayer
from spark_pipeline.silver import SilverLayer
from spark_pipeline.gold import GoldLayer


def create_spark_session():
    spark = (
        SparkSession.builder
        .appName("Industrial_Predictive_Maintenance")
        .master("local[*]")
        .config("spark.pyspark.python", PYTHON_PATH)
        .config("spark.pyspark.driver.python", PYTHON_PATH)
        .config("spark.executorEnv.PYSPARK_PYTHON", PYTHON_PATH)
        .config("spark.executorEnv.PYSPARK_DRIVER_PYTHON", PYTHON_PATH)
        .config("spark.jars.packages", "org.postgresql:postgresql:42.7.3")
        .config("spark.sql.legacy.timeParserPolicy", "LEGACY")
        .config("spark.sql.adaptive.enabled", "true")
        .config("spark.driver.memory", "4g")
        .config("spark.executor.memory", "4g")
        .config("spark.sql.shuffle.partitions", "8")
        .getOrCreate()
    )

    spark.sparkContext.setLogLevel("WARN")

    print("=" * 60)
    print("SPARK SESSION CREATED")
    print(f"Python used by Spark: {PYTHON_PATH}")
    print("=" * 60)

    return spark


def run_full_pipeline():
    start_time = datetime.now()

    print("\n" + "🔧" * 35)
    print("   PRODUCTION SPARK PIPELINE")
    print("   Bronze → Silver → Gold")
    print("🔧" * 35)

    spark = create_spark_session()

    try:
        bronze = BronzeLayer(spark)
        silver = SilverLayer(spark)
        gold = GoldLayer(spark)

        print("\n🥉 BRONZE LAYER")
        print("-" * 40)

        bronze_data = {}
        for dept in DEPARTMENTS:
            df = bronze.process_department(dept)
            if df is not None:
                bronze_data[dept] = df

        if not bronze_data:
            raise RuntimeError("No data ingested in Bronze layer")

        print("\n🥈 SILVER LAYER")
        print("-" * 40)

        silver_data = {}
        for dept, df in bronze_data.items():
            cleaned_df = silver.process_department(df, dept)
            if cleaned_df is not None:
                silver_data[dept] = cleaned_df

        if not silver_data:
            raise RuntimeError("No data produced in Silver layer")

        print("\n🥇 GOLD LAYER")
        print("-" * 40)

        for dept, df in silver_data.items():
            gold.process_department(df, dept)

        duration = (datetime.now() - start_time).total_seconds()

        print("\n" + "=" * 60)
        print("PIPELINE COMPLETED SUCCESSFULLY")
        print(f"Duration: {duration:.2f} seconds")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Pipeline Error: {e}")

        import traceback
        traceback.print_exc()

        raise

    finally:
        spark.stop()
        print("🛑 Spark session stopped")


if __name__ == "__main__":
    run_full_pipeline()