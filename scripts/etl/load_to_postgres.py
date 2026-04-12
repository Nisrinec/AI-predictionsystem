import pandas as pd
from sqlalchemy import create_engine

# Load CSV
df = pd.read_csv("data/processed/final_dataset.csv")

# Convert timestamp to datetime
df['timestamp'] = pd.to_datetime(df['timestamp'])

# PostgreSQL connection
# CHANGE THESE VALUES
username = "postgres"
password = "ensiensi"
host = "localhost"
port = "5432"
database = "predictionsystem_db"

engine = create_engine(f"postgresql://{username}:{password}@{host}:{port}/{database}")

# Load data into PostgreSQL
df.to_sql("sensor_data", engine, if_exists="append", index=False)

print("Data inserted successfully!")