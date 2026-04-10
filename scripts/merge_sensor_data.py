# scripts/merge_sensor_data.py
import pandas as pd
import os
from datetime import datetime

# Paths
RAW_PATH = "data/raw"
PROCESSED_PATH = "data/processed/final_dataset.csv"
LOG_PATH = "logs/etl_logs.txt"

def log_message(message):
    """Write logs with timestamp."""
    with open(LOG_PATH, "a") as f:
        f.write(f"{datetime.now()} - {message}\n")
    print(message)

def run_etl():
    try:
        log_message("ETL started.")

        # Load CSVs
        accel = pd.read_csv(os.path.join(RAW_PATH, "AccelerationData.csv"))
        temp  = pd.read_csv(os.path.join(RAW_PATH, "TemperatureData.csv"))
        vib   = pd.read_csv(os.path.join(RAW_PATH, "VibrationData.csv"))
        log_message("CSV files loaded successfully.")

        # Rename columns
        accel.rename(columns={'1RV-O':'motor_acceleration',
                              '2RV-O':'coupling_acceleration',
                              '3RV-O':'pump_acceleration'}, inplace=True)
        temp.rename(columns={'1RV-O':'motor_temperature',
                             '2RV-O':'coupling_temperature',
                             '3RV-O':'pump_temperature'}, inplace=True)
        vib.rename(columns={'1RV-O':'motor_vibration',
                            '2RV-O':'coupling_vibration',
                            '3RV-O':'pump_vibration'}, inplace=True)

        # Merge datasets on DateTime
        df = pd.merge(accel, temp, on='DateTime')
        df = pd.merge(df, vib, on='DateTime')

        # Convert DateTime column to datetime
        df['DateTime'] = pd.to_datetime(df['DateTime'])

        # Rename to timestamp
        df.rename(columns={'DateTime':'timestamp'}, inplace=True)

        # Save processed file
        df.to_csv(PROCESSED_PATH, index=False)
        log_message(f"ETL completed. Processed dataset saved at {PROCESSED_PATH}.")

    except Exception as e:
        log_message(f"ETL failed: {e}")

if __name__ == "__main__":
    run_etl()