# spark_pipeline/database.py
"""
PostgreSQL database connection
"""

from pyspark.sql import DataFrame
from spark_pipeline.config import POSTGRESQL_CONFIG
from pathlib import Path


def write_to_postgresql(df: DataFrame, table_name: str, mode: str = "overwrite"):
    """Write DataFrame to PostgreSQL"""
    
    print(f"   📤 Writing to {table_name}...")
    
    jars_path = Path(__file__).parent / "jars"
    driver_path = jars_path / "postgresql-42.7.2.jar"
    
    if not driver_path.exists():
        print(f"   ⚠️ JDBC driver not found")
        return
    
    df.write \
        .format("jdbc") \
        .option("url", POSTGRESQL_CONFIG["url"]) \
        .option("dbtable", table_name) \
        .option("user", POSTGRESQL_CONFIG["user"]) \
        .option("password", POSTGRESQL_CONFIG["password"]) \
        .option("driver", POSTGRESQL_CONFIG["driver"]) \
        .mode(mode) \
        .save()
    
    print(f"   ✅ Written {df.count():,} rows")


def read_from_postgresql(spark, table_name: str):
    """Read from PostgreSQL"""
    
    jars_path = Path(__file__).parent / "jars"
    driver_path = jars_path / "postgresql-42.7.2.jar"
    
    if not driver_path.exists():
        print(f"   ⚠️ JDBC driver not found")
        return None
    
    return spark.read \
        .format("jdbc") \
        .option("url", POSTGRESQL_CONFIG["url"]) \
        .option("dbtable", table_name) \
        .option("user", POSTGRESQL_CONFIG["user"]) \
        .option("password", POSTGRESQL_CONFIG["password"]) \
        .option("driver", POSTGRESQL_CONFIG["driver"]) \
        .load()