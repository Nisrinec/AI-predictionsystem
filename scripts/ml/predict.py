import pandas as pd
from sqlalchemy import create_engine
from sklearn.ensemble import IsolationForest

# ==============================
# 1. DATABASE CONNECTION
# ==============================
engine = create_engine("postgresql://postgres:ensiensi@localhost:5432/predictionsystem_db")

# ==============================
# 2. LOAD DATA
# ==============================
df = pd.read_sql("SELECT * FROM sensor_data", engine)

df['timestamp'] = pd.to_datetime(df['timestamp'])

# ==============================
# 3. FEATURE SPLIT
# ==============================

motor_features = df[['motor_acceleration', 'motor_temperature', 'motor_vibration']]
pump_features = df[['pump_acceleration', 'pump_temperature', 'pump_vibration']]
coupling_features = df[['coupling_acceleration', 'coupling_temperature', 'coupling_vibration']]

# Handle missing values
motor_features = motor_features.fillna(motor_features.mean())
pump_features = pump_features.fillna(pump_features.mean())
coupling_features = coupling_features.fillna(coupling_features.mean())

# ==============================
# 4. TRAIN MODELS
# ==============================

model_motor = IsolationForest(contamination=0.02, random_state=42)
model_pump = IsolationForest(contamination=0.02, random_state=42)
model_coupling = IsolationForest(contamination=0.02, random_state=42)

model_motor.fit(motor_features)
model_pump.fit(pump_features)
model_coupling.fit(coupling_features)

# ==============================
# 5. CURRENT PREDICTIONS
# ==============================

df['motor_score'] = model_motor.decision_function(motor_features)
df['pump_score'] = model_pump.decision_function(pump_features)
df['coupling_score'] = model_coupling.decision_function(coupling_features)

df['motor_pred'] = model_motor.predict(motor_features)
df['pump_pred'] = model_pump.predict(pump_features)
df['coupling_pred'] = model_coupling.predict(coupling_features)

# Convert (-1 → anomaly → 1)
df['motor_pred'] = df['motor_pred'].apply(lambda x: 1 if x == -1 else 0)
df['pump_pred'] = df['pump_pred'].apply(lambda x: 1 if x == -1 else 0)
df['coupling_pred'] = df['coupling_pred'].apply(lambda x: 1 if x == -1 else 0)

# ==============================
# 6. STATUS + RISK
# ==============================

def status(pred):
    return "Anomaly" if pred == 1 else "Normal"

def risk(score):
    if score < -0.1:
        return "High Risk"
    elif score < -0.05:
        return "Medium Risk"
    else:
        return "Low Risk"

df['motor_status'] = df['motor_pred'].apply(status)
df['pump_status'] = df['pump_pred'].apply(status)
df['coupling_status'] = df['coupling_pred'].apply(status)

df['motor_risk'] = df['motor_score'].apply(risk)
df['pump_risk'] = df['pump_score'].apply(risk)
df['coupling_risk'] = df['coupling_score'].apply(risk)

# ==============================
# 7. FUTURE RISK (TREND BASED)
# ==============================

# Compute trends (difference between current and previous value)
df['motor_trend'] = df['motor_vibration'].diff()
df['pump_trend'] = df['pump_vibration'].diff()
df['coupling_trend'] = df['coupling_vibration'].diff()

def future_risk(trend):
    if trend > 0.2:
        return "High Future Risk"
    elif trend > 0.05:
        return "Medium Future Risk"
    else:
        return "Stable"

df['motor_future_risk'] = df['motor_trend'].apply(future_risk)
df['pump_future_risk'] = df['pump_trend'].apply(future_risk)
df['coupling_future_risk'] = df['coupling_trend'].apply(future_risk)

# ==============================
# 8. FINAL RESULT
# ==============================

result = df[[
    'timestamp',

    'motor_status', 'motor_risk', 'motor_future_risk',
    'pump_status', 'pump_risk', 'pump_future_risk',
    'coupling_status', 'coupling_risk', 'coupling_future_risk'
]]

# ==============================
# 9. SAVE TO DATABASE
# ==============================

result.to_sql("predictions", engine, if_exists="replace", index=False)

print("Advanced AI with future prediction completed!")