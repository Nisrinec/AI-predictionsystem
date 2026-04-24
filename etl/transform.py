import pandas as pd

def transform_data(data):
    df = pd.DataFrame(data)

    df.columns = df.columns.str.lower()
    df['timestamp'] = pd.to_datetime(df['timestamp'])

    df = df.drop_duplicates()

    return df