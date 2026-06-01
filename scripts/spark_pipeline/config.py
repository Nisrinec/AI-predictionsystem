# spark_pipeline/config.py
from pathlib import Path
import re

# Paths
BASE_PATH = Path("/opt/airflow")

DATA_PATH = BASE_PATH / "data"

RAW_DATA_PATH = DATA_PATH / "raw"
BRONZE_PATH = DATA_PATH / "bronze"
SILVER_PATH = DATA_PATH / "silver"
GOLD_PATH = DATA_PATH / "gold"

for path in [RAW_DATA_PATH, BRONZE_PATH, SILVER_PATH, GOLD_PATH]:
    path.mkdir(parents=True, exist_ok=True)

# Departments
DEPARTMENTS = ['SAP', 'AF', 'CAP', 'ENGRAIS']

# Pattern to detect ANY part code from CSV columns
PART_CODE_PATTERN = re.compile(r'^(\d+[A-Z]+)-[OVT]$')

# Valid ranges for sensor data
VALID_RANGES = {
    'acceleration': (0.0, 15.0),
    'vibration': (0.0, 10.0),
    'temperature': (0.0, 120.0)
}

# Critical thresholds
CRITICAL_THRESHOLDS = {
    'acceleration': 8.0,
    'vibration': 3.5,
    'temperature': 85.0
}

# Spark configuration
SPARK_CONFIG = {
    "spark.app.name": "Industrial_Predictive_Maintenance",
    "spark.master": "local[*]",
    "spark.sql.adaptive.enabled": "true",
    "spark.driver.memory": "4g",
    "spark.executor.memory": "4g",
    "spark.sql.shuffle.partitions": "8",
    "spark.sql.warehouse.dir": "C:/temp/spark-warehouse",
    "spark.local.dir": "C:/temp/spark-temp",
    "spark.sql.legacy.timeParserPolicy": "LEGACY"
}

# PostgreSQL
POSTGRESQL_CONFIG = {
    "url": "jdbc:postgresql://host.docker.internal:5432/predictionsystem_db",
    "user": "postgres",
    "password": "ensiensi",
    "driver": "org.postgresql.Driver"
}

def generate_part_name(part_code: str) -> str:
    """Generate human-readable name for ANY part code"""
    if part_code == '3RV':
        return 'Pompe'
    elif part_code == '1RV':
        return 'Moteur 1'
    elif part_code == '2RV':
        return 'Moteur 2'
    elif part_code.startswith('RV'):
        num = int(part_code.replace('RV', ''))
        return f'Moteur {num - 2}'
    elif part_code.startswith('RH'):
        num = int(part_code.replace('RH', ''))
        return f'Réducteur {num - 2}'
    elif part_code.startswith('AX'):
        num = int(part_code.replace('AX', ''))
        return f'Axe {num}'
    else:
        return part_code