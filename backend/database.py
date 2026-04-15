from sqlalchemy import create_engine

DATABASE_URL = "postgresql://postgres:ensiensi@localhost:5432/predictionsystem_db"

engine = create_engine(DATABASE_URL)