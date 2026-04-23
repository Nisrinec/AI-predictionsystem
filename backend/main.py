from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from datetime import datetime
from typing import List, Dict, Any

# ------------------ DATABASE CONNECTION ------------------
# Use your actual PostgreSQL credentials
DATABASE_URL = "postgresql://postgres:ensiensi@localhost:5432/predictionsystem_db"
engine = create_engine(DATABASE_URL)

app = FastAPI(title="iPredict API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------ HEALTH CHECK ------------------
@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

# ------------------ GET ALL MACHINES (WITH LATEST METRICS) ------------------
@app.get("/api/machines")
def get_machines():
    """
    Returns the list of all machines from the 'machines' table,
    enriched with the latest sensor data and predictions for each machine.
    """
    with engine.connect() as conn:
        # Get all machines
        machines = conn.execute(text("SELECT id, code, name, department FROM machines ORDER BY department, name")).fetchall()
        result = []
        for m in machines:
            machine_id, code, name, dept = m
            # Latest sensor data for this machine
            sensor = conn.execute(text("""
                SELECT * FROM sensor_data
                WHERE machine_id = :mid
                ORDER BY timestamp DESC
                LIMIT 1
            """), {"mid": machine_id}).fetchone()
            # Latest predictions for this machine
            pred = conn.execute(text("""
                SELECT * FROM predictions
                WHERE machine_id = :mid
                ORDER BY timestamp DESC
                LIMIT 1
            """), {"mid": machine_id}).fetchone()

            # If no sensor or prediction data, skip (or provide defaults)
            if not sensor or not pred:
                # Optionally, you can still return the machine with null metrics
                # For now, skip machines without data to avoid 404 on frontend
                continue

            s = dict(sensor._mapping)
            p = dict(pred._mapping)

            # Build the metrics object exactly as the dashboard expects
            machine_data = {
                "id": code,
                "name": name,
                "dept": dept,
                "status": "En ligne",  # you can derive this from sensor timeliness
                "metrics": {
                    "motor": {
                        "acc": s["motor_acceleration"],
                        "temp": s["motor_temperature"],
                        "vib": s["motor_vibration"],
                        "risk": p["motor_risk"],
                        "predVib": s["motor_vibration"] * 1.27,   # example prediction
                        "rul": 400 - int(s["motor_vibration"] * 80),
                        "futureRisk": p["motor_future_risk"]
                    },
                    "coupling": {
                        "acc": s["coupling_acceleration"],
                        "temp": s["coupling_temperature"],
                        "vib": s["coupling_vibration"],
                        "align": s["coupling_vibration"] * 0.17,
                        "risk": p["coupling_risk"],
                        "predVib": s["coupling_vibration"] * 1.49,
                        "rul": 200 - int(s["coupling_vibration"] * 40),
                        "futureRisk": p["coupling_future_risk"]
                    },
                    "pump": {
                        "acc": s["pump_acceleration"],
                        "temp": s["pump_temperature"],
                        "vib": s["pump_vibration"],
                        "flow": 280 - int(s["pump_vibration"] * 2),
                        "risk": p["pump_risk"],
                        "predVib": s["pump_vibration"] * 1.14,
                        "rul": 1400 - int(s["pump_vibration"] * 300),
                        "futureRisk": p["pump_future_risk"]
                    }
                }
            }
            result.append(machine_data)
        return result

# ------------------ GET ALERTS (FROM YOUR PREDICTIONS) ------------------
@app.get("/api/alerts")
def get_alerts():
    """
    Generate alerts based on the latest predictions for each machine.
    """
    with engine.connect() as conn:
        # Get latest predictions for all machines
        rows = conn.execute(text("""
            SELECT DISTINCT ON (machine_id) 
                p.*, m.code, m.name, m.department
            FROM predictions p
            JOIN machines m ON p.machine_id = m.id
            ORDER BY machine_id, p.timestamp DESC
        """)).fetchall()

        alerts = []
        for row in rows:
            p = dict(row._mapping)
            code = p["code"]
            name = p["name"]
            dept = p["department"]

            if p["coupling_risk"] == "Critique":
                alerts.append({
                    "pumpId": code,
                    "pumpName": name,
                    "dept": dept,
                    "component": "Accouplement",
                    "message": f"Risque critique sur accouplement",
                    "severity": "critical",
                    "rul": 94  # you can store RUL in predictions table
                })
            elif p["coupling_risk"] == "Élevé":
                alerts.append({
                    "pumpId": code,
                    "pumpName": name,
                    "dept": dept,
                    "component": "Accouplement",
                    "message": f"Risque élevé sur accouplement",
                    "severity": "high",
                    "rul": 94
                })
            if p["motor_risk"] == "Élevé":
                alerts.append({
                    "pumpId": code,
                    "pumpName": name,
                    "dept": dept,
                    "component": "Moteur",
                    "message": f"Risque moteur élevé",
                    "severity": "high",
                    "rul": 328
                })
        # Sort by severity
        severity_order = {"critical": 0, "high": 1, "medium": 2}
        alerts.sort(key=lambda a: severity_order.get(a["severity"], 3))
        return alerts

# ------------------ GET SOLUTIONS (STATIC OR DYNAMIC) ------------------
@app.get("/api/solutions")
def get_solutions():
    """
    You can keep this static or generate based on current alerts.
    """
    return [
        {"title": "Maintenance prioritaire AF", "description": "Intervention sur pompe AF-102 (RUL: 48h)", "priority": "haute", "icon": "fas fa-crosshairs"},
        {"title": "Surveillance renforcée ENGRAIS", "description": "Risque modéré détecté sur EN-300", "priority": "moyenne", "icon": "fas fa-chart-line"},
        {"title": "Planification maintenance", "description": "Basée sur RUL estimées des 8 machines", "priority": "planification", "icon": "fas fa-robot"}
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)