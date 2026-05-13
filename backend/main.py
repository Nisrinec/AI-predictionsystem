# backend/main.py
"""
FastAPI backend for dashboard
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from database.connection import db

app = FastAPI(title="iPredict API", version="2.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictionResponse(BaseModel):
    machine_name: str
    part_code: str
    part_name: str
    current_vibration: float
    current_temperature: float
    current_acceleration: float
    rul_hours: int
    risk_level: str
    health_score: float
    predicted_12h: float


@app.get("/")
def root():
    return {"message": "iPredict API is running", "version": "2.0"}


@app.get("/api/predictions/{department}", response_model=List[PredictionResponse])
def get_predictions(department: str):
    """Get latest predictions for a department"""
    
    table_name = f"predictions_{department.upper()}"
    
    try:
        result = db.execute(f"SELECT * FROM {table_name}")
        
        if not result:
            return []
        
        return [{
            'machine_name': row[1],
            'part_code': row[2],
            'part_name': row[3],
            'current_vibration': float(row[4]) if row[4] else 0,
            'current_temperature': float(row[5]) if row[5] else 0,
            'current_acceleration': float(row[6]) if row[6] else 0,
            'rul_hours': row[7],
            'risk_level': row[8],
            'health_score': float(row[9]) if row[9] else 0,
            'predicted_12h': float(row[10]) if row[10] else 0
        } for row in result]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/alerts")
def get_alerts():
    """Get all critical alerts across all departments"""
    
    departments = ['SAP', 'AF', 'CAP', 'ENGRAIS']
    all_alerts = []
    
    for dept in departments:
        try:
            alerts = db.execute(f"""
                SELECT * FROM predictions_{dept} 
                WHERE risk_level IN ('Critique', 'Élevé')
            """)
            
            for alert in alerts:
                all_alerts.append({
                    'department': dept,
                    'machine_name': alert[1],
                    'part_code': alert[2],
                    'part_name': alert[3],
                    'risk_level': alert[8],
                    'rul_hours': alert[7]
                })
        except:
            pass
    
    return all_alerts


@app.get("/api/machines")
def get_machines():
    """Get all machines with their latest health status"""
    
    departments = ['SAP', 'AF', 'CAP', 'ENGRAIS']
    all_machines = []
    
    for dept in departments:
        try:
            machines = db.execute(f"""
                SELECT DISTINCT machine_name, risk_level, health_score 
                FROM predictions_{dept}
            """)
            
            for machine in machines:
                all_machines.append({
                    'department': dept,
                    'machine_name': machine[0],
                    'risk_level': machine[1],
                    'health_score': float(machine[2]) if machine[2] else 0
                })
        except:
            pass
    
    return all_machines


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)