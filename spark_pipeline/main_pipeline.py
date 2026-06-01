# spark_pipeline/main_pipeline.py

"""
Main Pipeline Orchestrator
Bronze -> Silver -> Gold
"""
import os
import sys
from pathlib import Path
from datetime import datetime

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

        .config("spark.pyspark.python", sys.executable)
        .config("spark.pyspark.driver.python", sys.executable)

        .config("spark.jars.packages", "org.postgresql:postgresql:42.7.3")
        .config("spark.sql.legacy.timeParserPolicy", "LEGACY")
        .config("spark.sql.adaptive.enabled", "true")
        .config("spark.driver.memory", "4g")
        .config("spark.executor.memory", "4g")
        .config("spark.sql.shuffle.partitions", "8")

        .getOrCreate()
    )

    return spark


def run_full_pipeline():
    """Run complete pipeline"""

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

        # ==========================
        # BRONZE
        # ==========================
        print("\n🥉 BRONZE LAYER")
        print("-" * 40)

        bronze_data = {}

        for dept in DEPARTMENTS:
            df = bronze.process_department(dept)

            if df is not None:
                bronze_data[dept] = df

        if not bronze_data:
            print("❌ No data ingested")
            return

        # ==========================
        # SILVER
        # ==========================
        print("\n🥈 SILVER LAYER")
        print("-" * 40)

        silver_data = {}

        for dept, df in bronze_data.items():
            cleaned_df = silver.process_department(df, dept)

            if cleaned_df is not None:
                silver_data[dept] = cleaned_df

        if not silver_data:
            print("❌ No silver data produced")
            return

        # ==========================
        # GOLD
        # ==========================
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

    finally:
        spark.stop()
        print("🛑 Spark session stopped")


if __name__ == "__main__":
    run_full_pipeline()