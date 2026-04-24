from sqlalchemy import create_engine

def get_engine():
    engine = create_engine(
        "postgresql+psycopg2://postgres:ensiensi@localhost:5432/predictionsystem_db"
    )
    return engine