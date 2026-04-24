import requests
from config.settings import API_URL, API_KEY

def get_sensor_data():
    headers = {"Authorization": f"Bearer {API_KEY}"}

    response = requests.get(f"{API_URL}/sensors/data", headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        print("API Error:", response.text)
        return []