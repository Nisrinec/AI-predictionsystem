from database.db_connection import get_engine

def load_data(df):
    engine = get_engine()

    df.to_sql(
        "sensor_readings",
        engine,
        if_exists="append",
        index=False,
        method="multi"
    )