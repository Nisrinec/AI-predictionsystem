from pathlib import Path
import pandas as pd
import joblib

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

BASE_PATH = Path("/opt/airflow")
HISTORICAL_PATH = BASE_PATH / "data" / "historical"
MODELS_PATH = BASE_PATH / "models"

DEPARTMENTS = ["SAP", "AF", "CAP", "ENGRAIS"]

MODELS_PATH.mkdir(parents=True, exist_ok=True)


def find_datetime_column(df):
    for c in df.columns:
        if "date" in c.lower() or "time" in c.lower():
            return c
    return None


def read_sensor_file(file_path, sensor_name):
    if not file_path.exists():
        return None

    df = pd.read_csv(file_path)

    dt_col = find_datetime_column(df)
    if dt_col is None:
        print(f"Missing DateTime column: {file_path}")
        return None

    df[dt_col] = pd.to_datetime(df[dt_col], errors="coerce")
    df = df.dropna(subset=[dt_col])

    sensor_cols = [c for c in df.columns if c != dt_col]

    rows = []

    for col in sensor_cols:
        part_code = col.split("-")[0]

        temp = df[[dt_col, col]].copy()
        temp.columns = ["recorded_at", sensor_name]
        temp["part_code"] = part_code

        rows.append(temp)

    if not rows:
        return None

    return pd.concat(rows, ignore_index=True)


def read_machine_data(machine_path, department, machine_name):
    vibration = read_sensor_file(machine_path / "VibrationData.csv", "vibration")
    temperature = read_sensor_file(machine_path / "TemperatureData.csv", "temperature")
    acceleration = read_sensor_file(machine_path / "AccelerationData.csv", "acceleration")

    dfs = [df for df in [vibration, temperature, acceleration] if df is not None]

    if not dfs:
        return None

    merged = dfs[0]

    for df in dfs[1:]:
        merged = merged.merge(
            df,
            on=["recorded_at", "part_code"],
            how="outer"
        )

    merged["department"] = department
    merged["machine_name"] = machine_name

    merged = merged.dropna(subset=["vibration"])

    merged["temperature"] = merged["temperature"].fillna(merged["temperature"].median())
    merged["acceleration"] = merged["acceleration"].fillna(merged["acceleration"].median())

    return merged


def train_department(department):
    print(f"\nTraining department: {department}")

    dept_path = HISTORICAL_PATH / department

    if not dept_path.exists():
        print(f"No folder found: {dept_path}")
        return

    all_data = []

    for machine_path in dept_path.iterdir():
        if not machine_path.is_dir():
            continue

        machine_name = machine_path.name
        print(f"Reading machine: {machine_name}")

        df = read_machine_data(machine_path, department, machine_name)

        if df is not None and not df.empty:
            all_data.append(df)

    if not all_data:
        print(f"No valid data for {department}")
        return

    data = pd.concat(all_data, ignore_index=True)

    features = ["vibration", "temperature", "acceleration"]
    data = data.dropna(subset=features)

    if len(data) < 1000:
        print(f"Not enough data for {department}: {len(data)} rows")
        return

    X = data[features]

    model = Pipeline([
        ("scaler", StandardScaler()),
        ("isolation_forest", IsolationForest(
            n_estimators=200,
            contamination=0.05,
            random_state=42
        ))
    ])

    model.fit(X)

    model_file = MODELS_PATH / f"anomaly_model_{department}.joblib"
    joblib.dump(model, model_file)

    print(f"Model saved: {model_file}")
    print(f"Training rows: {len(data)}")


def main():
    for department in DEPARTMENTS:
        train_department(department)


if __name__ == "__main__":
    main()