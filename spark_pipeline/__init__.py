# spark_pipeline/__init__.py
"""
Spark ETL Pipeline for Industrial IoT Predictive Maintenance
"""

import os

# Set Python paths for PySpark on Windows
os.environ["PYSPARK_PYTHON"] = r"C:\Users\sally\AppData\Local\Programs\Python\Python311\python.exe"
os.environ["PYSPARK_DRIVER_PYTHON"] = r"C:\Users\sally\AppData\Local\Programs\Python\Python311\python.exe"
os.environ["HADOOP_HOME"] = r"C:\hadoop"

from spark_pipeline.bronze import BronzeLayer
from spark_pipeline.silver import SilverLayer
from spark_pipeline.gold import GoldLayer
from spark_pipeline.database import write_to_postgresql, read_from_postgresql

__all__ = [
    'BronzeLayer', 
    'SilverLayer', 
    'GoldLayer',
    'write_to_postgresql',
    'read_from_postgresql'
]