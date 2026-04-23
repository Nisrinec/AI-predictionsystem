import pandas as pd
from sqlalchemy import create_engine, text
import sys
import os

# Add backend folder to path so we can import database.py
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from database import engine

def import_machine_data(csv_path: str, machine_code: str):
    """
    Import sensor data from a CSV file into the sensor_data table
    for a specific machine.
    """
    # Read CSV
    df = pd.read_csv(csv_path)

    print("Columns found:", df.columns.tolist())

    # ---- ADAPT THIS MAPPING TO YOUR ACTUAL CSV COLUMNS ----
    column_mapping = {
        'timestamp': 'timestamp',
        'motor_acceleration': 'motor_acceleration',
        'motor_temperature': 'motor_temperature',
        'motor_vibration': 'motor_vibration',
        'coupling_acceleration': 'coupling_acceleration',
        'coupling_temperature': 'coupling_temperature',
        'coupling_vibration': 'coupling_vibration',
        'pump_acceleration': 'pump_acceleration',
        'pump_temperature': 'pump_temperature',
        'pump_vibration': 'pump_vibration'
    }
    # If your CSV has different column names, change the dictionary above.
    # Example: if your CSV has 'motor_acc_x' instead of 'motor_acceleration',
    # write: 'motor_acc_x': 'motor_acceleration'

    # Rename columns
    df.rename(columns=column_mapping, inplace=True)

    # Ensure timestamp is datetime
    df['timestamp'] = pd.to_datetime(df['timestamp'])

    # Get machine id from database
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT id FROM machines WHERE code = :code"),
            {"code": machine_code}
        )
        row = result.fetchone()
        if not row:
            raise ValueError(f"Machine {machine_code} not found in 'machines' table")
        machine_id = row[0]

    df['machine_id'] = machine_id

    # Insert into sensor_data
    df.to_sql('sensor_data', engine, if_exists='append', index=False)
    print(f"✅ Imported {len(df)} rows for machine {machine_code}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python import_machine_data.py <csv_file> <machine_code>")
        print("Example: python import_machine_data.py data/601ABP04.csv 601ABP04")
        sys.exit(1)

    csv_file = sys.argv[1]
    machine = sys.argv[2]
    import_machine_data(csv_file, machine)