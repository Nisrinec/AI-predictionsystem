from pathlib import Path
import pandas as pd
import joblib

from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, r2_score


BASE_PATH = Path("/opt/airflow")
HISTORICAL_PATH = BASE_PATH / "data" / "historical"
MODELS_PATH = BASE_PATH / "models"

DEPARTMENTS = ["SAP", "AF", "CAP", "ENGRAIS"]

MODELS_PATH.mkdir(parents=True, exist_ok=True)

ROWS_12H = 12
ROWS_24H = 24
ROWS_48H = 48

MIN_R2_TO_KEEP = 0.0


def find_datetime_column(df):
    for c in df.columns:
        if "date" in c.lower() or "time" in c.lower():
            return c
    return None


def read_vibration_file(file_path):
    if not file_path.exists():
        return None

    df = pd.read_csv(file_path)

    dt_col = find_datetime_column(df)
    if dt_col is None:
        print(f"Missing DateTime column: {file_path}")
        return None

    df[dt_col] = pd.to_datetime(df[dt_col], errors="coerce")
    df = df.dropna(subset=[dt_col])

    rows = []

    for col_name in df.columns:
        if col_name == dt_col:
            continue

        part_code = col_name.split("-")[0]

        temp = df[[dt_col, col_name]].copy()
        temp.columns = ["recorded_at", "vibration"]
        temp["part_code"] = part_code

        rows.append(temp)

    if not rows:
        return None

    return pd.concat(rows, ignore_index=True)


def read_machine_data(machine_path, department, machine_name):
    vibration = read_vibration_file(machine_path / "VibrationData.csv")

    if vibration is None:
        return None

    vibration["department"] = department
    vibration["machine_name"] = machine_name

    return vibration


def add_features(df):
    df = df.sort_values(["machine_name", "part_code", "recorded_at"])

    group_cols = ["machine_name", "part_code"]

    df["vibration"] = pd.to_numeric(df["vibration"], errors="coerce")
    df = df.dropna(subset=["vibration"])

    df["vibration_mean_24"] = df.groupby(group_cols)["vibration"].transform(
        lambda x: x.rolling(24, min_periods=3).mean()
    )

    df["vibration_std_24"] = df.groupby(group_cols)["vibration"].transform(
        lambda x: x.rolling(24, min_periods=3).std()
    )

    df["vibration_min_24"] = df.groupby(group_cols)["vibration"].transform(
        lambda x: x.rolling(24, min_periods=3).min()
    )

    df["vibration_max_24"] = df.groupby(group_cols)["vibration"].transform(
        lambda x: x.rolling(24, min_periods=3).max()
    )

    df["vibration_change"] = df["vibration"] - df["vibration_mean_24"]

    df["hour"] = df["recorded_at"].dt.hour
    df["weekday"] = df["recorded_at"].dt.dayofweek
    df["month"] = df["recorded_at"].dt.month

    rows_map = {
        "12h": ROWS_12H,
        "24h": ROWS_24H,
        "48h": ROWS_48H
    }

    for horizon, rows_ahead in rows_map.items():
        df[f"target_vibration_{horizon}"] = (
            df.groupby(group_cols)["vibration"].shift(-rows_ahead)
        )

    df = df.dropna()

    return df


def train_model(data, department, horizon):
    features = [
        "vibration",
        "vibration_mean_24",
        "vibration_std_24",
        "vibration_min_24",
        "vibration_max_24",
        "vibration_change",
        "hour",
        "weekday",
        "month"
    ]

    target_col = f"target_vibration_{horizon}"

    X = data[features]
    y = data[target_col]

    split_index = int(len(data) * 0.8)

    X_train = X.iloc[:split_index]
    X_test = X.iloc[split_index:]

    y_train = y.iloc[:split_index]
    y_test = y.iloc[split_index:]

    model = Pipeline([
        ("scaler", StandardScaler()),
        ("regressor", RandomForestRegressor(
            n_estimators=300,
            max_depth=15,
            min_samples_leaf=3,
            random_state=42,
            n_jobs=-1
        ))
    ])

    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)

    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print(f"{department} | vibration | {horizon} | MAE = {mae:.4f} | R2 = {r2:.4f}")

    if r2 > MIN_R2_TO_KEEP:
        model_file = MODELS_PATH / f"forecast_vibration_{horizon}_{department}.joblib"
        joblib.dump(model, model_file)
        print(f"✅ Saved: {model_file}")
    else:
        print(f"❌ Not saved: {department} | vibration | {horizon} because R2 is negative")


def train_department(department):
    print(f"\nTraining vibration forecast models for {department}")

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
    data = add_features(data)

    if len(data) < 1000:
        print(f"Not enough data for {department}: {len(data)} rows")
        return

    print(f"Training rows: {len(data)}")

    for horizon in ["12h", "24h", "48h"]:
        train_model(data, department, horizon)


def main():
    for department in DEPARTMENTS:
        train_department(department)


if __name__ == "__main__":
    main()