import requests
import pandas as pd
from pathlib import Path
import time

ISENSE_EMAIL = "nisrinechkah12@gmail.com"
ISENSE_PASSWORD = "A8nnXRWw"

BASE_URL = "https://v3back-demo.i-sense.io/api/i-sense-v3"

ASSET_MAPPING = {
    153: {"department": "SAP", "machine_name": "Pompe_HRS_601ABP04"},
    156: {"department": "SAP", "machine_name": "Pompe_circulation_bac_commun_601AAP01"},
    159: {"department": "SAP", "machine_name": "Pompe_circulation_bac_commun_601AAP02"},

    168: {"department": "AF", "machine_name": "POMPE_A_VIDE_603AAC01"},
    171: {"department": "AF", "machine_name": "POMPE_A_VIDE_603AAC06"},
    174: {"department": "AF", "machine_name": "POMPE_A_VIDE_603ABC06"},
    193: {"department": "AF", "machine_name": "POMPE_B_FLASH_COOLER_603ABP01"},

    177: {"department": "CAP", "machine_name": "POMPE_DE_CIRCULATION_J_604JAP04"},
    181: {"department": "CAP", "machine_name": "POMPE_DE_CIRCULATION_K_604KAP04"},
    185: {"department": "CAP", "machine_name": "POMPE_DE_CIRCULATION_L_604LAP04"},

    197: {"department": "ENGRAIS", "machine_name": "Elevateur_607AAT01"},
    201: {"department": "ENGRAIS", "machine_name": "Elevateur_607AAT04"},
    205: {"department": "ENGRAIS", "machine_name": "Elevateur_607AAT05"},
    209: {"department": "ENGRAIS", "machine_name": "Elevateur_607AAT06"},
    213: {"department": "ENGRAIS", "machine_name": "Enrobeur_607AAM04"},
    217: {"department": "ENGRAIS", "machine_name": "Granulateur_607AAM03"},
    221: {"department": "ENGRAIS", "machine_name": "Tube_secheur_607AAF02"},
}

VIBRATION_FEATURE_ID = 1


class AllDepartmentsFetcher:
    def __init__(self):
        self.token = None
        self.project_root = Path("/opt/airflow")
        self.raw_path = self.project_root / "data" / "raw"

    def login(self):
        url = f"{BASE_URL}/auth/login"
        response = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            json={"email": ISENSE_EMAIL, "password": ISENSE_PASSWORD},
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            self.token = result.get("token") or result.get("access_token")
            print("✅ Logged in successfully")
            return True

        print("❌ Login failed:", response.text)
        return False

    def fetch_vibration_data(self, asset_id):
        url = f"{BASE_URL}/tenant/assets/trend/{asset_id}/{VIBRATION_FEATURE_ID}"
        headers = {"Authorization": f"Bearer {self.token}"}

        try:
            response = requests.post(url, headers=headers, timeout=30)
            if response.status_code == 200:
                return response.json()
            print(f"❌ Fetch failed for asset {asset_id}: {response.status_code}")
        except Exception as e:
            print(f"❌ Error fetching asset {asset_id}: {e}")

        return None

    def parse_vibration_measures(self, data):
        if not data or "measures" not in data:
            return []

        rows = []
        measures = data["measures"]

        for point_name, point_data in measures.items():
            values = point_data.get("values", [])

            for v in values:
                rows.append({
                    "timestamp": v.get("created_at"),
                    "part_code": point_name,
                    "sensor_type": "vibration",
                    "value": v.get("value")
                })

        return rows

    def save_asset_data(self, raw_data, department, machine_name):
        if not raw_data:
            print("      ⚠️ No vibration data")
            return False

        df = pd.DataFrame(raw_data)
        if df.empty:
            return False

        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
        df["value"] = pd.to_numeric(df["value"], errors="coerce")
        df = df.dropna(subset=["timestamp", "value", "part_code"])

        df = df.groupby(["timestamp", "part_code"], as_index=False)["value"].mean()

        machine_folder = self.raw_path / department / machine_name
        machine_folder.mkdir(parents=True, exist_ok=True)

        pivot = df.pivot(
            index="timestamp",
            columns="part_code",
            values="value"
        ).reset_index()

        pivot.columns = ["DateTime"] + [f"{col}-V" for col in pivot.columns[1:]]
        pivot = pivot.sort_values("DateTime")

        file_path = machine_folder / "VibrationData.csv"
        pivot.to_csv(file_path, index=False)

        print(f"      💾 Saved VibrationData.csv ({len(pivot)} rows)")
        return True

    def fetch_all(self):
        if not self.login():
            return

        for asset_id, info in ASSET_MAPPING.items():
            department = info["department"]
            machine_name = info["machine_name"]

            print(f"\n📡 Asset {asset_id} → {department}/{machine_name}")

            data = self.fetch_vibration_data(asset_id)
            raw_data = self.parse_vibration_measures(data)

            if raw_data:
                self.save_asset_data(raw_data, department, machine_name)
            else:
                print("      ❌ No vibration data fetched")

            time.sleep(0.5)


if __name__ == "__main__":
    fetcher = AllDepartmentsFetcher()
    fetcher.fetch_all()