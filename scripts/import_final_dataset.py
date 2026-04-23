import pandas as pd
from sqlalchemy import create_engine, text
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
from database import engine

def import_final_dataset(csv_path: str, machine_code: str):
    # Read the CSV
    df = pd.read_csv(csv_path)

    print("Columns in your CSV:", df.columns.tolist())

    # ----- ADAPT THIS MAPPING TO YOUR ACTUAL CSV COLUMN NAMES -----
    # Example: if your CSV has columns like 'timestamp', 'motor_acc_x', etc.
    # change the keys below accordingly.
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
    # If your CSV uses different names, change the LEFT side of each line.
    # For example: 'motor_acc_x': 'motor_acceleration'
    # ---------------------------------------------------------------

    # Rename columns to match the database
    df.rename(columns=column_mapping, inplace=True)

    # Convert timestamp column
    df['timestamp'] = pd.to_datetime(df['timestamp'])

    # Get machine ID
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

    # Insert into sensor_data (append)
    df.to_sql('sensor_data', engine, if_exists='append', index=False)
    print(f"✅ Imported {len(df)} rows for machine {machine_code}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python scripts/import_final_dataset.py <csv_path> <machine_code>")
        print("Example: python scripts/import_final_dataset.py data/processed/final_dataset.csv 601ABP04")
        sys.exit(1)

    csv_file = sys.argv[1]
    machine = sys.argv[2]
    import_final_dataset(csv_file, machine)