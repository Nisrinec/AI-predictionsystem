from fastapi import APIRouter
from sqlalchemy import text
from database import engine

router = APIRouter()

@router.get("/predictions")
def get_latest_prediction():
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT *
            FROM predictions
            ORDER BY timestamp DESC
            LIMIT 1
        """))

        row = result.fetchone()

        if row:
            return dict(row._mapping)
        else:
            return {"message": "No prediction data found"}