# fetch_all_departments_complete.py - Fixed version
"""
Complete i-Sense Data Fetcher - Saves 3 separate files for Spark pipeline
Handles duplicate entries by averaging
"""

import requests
import pandas as pd
from datetime import datetime
from pathlib import Path
import time

ISENSE_EMAIL = "nisrinechkah12@gmail.com"
ISENSE_PASSWORD = "A8nnXRWw"
BASE_URL = "https://v3back-demo.i-sense.io/api/i-sense-v3"

# COMPLETE ASSET MAPPING - ALL DEPARTMENTS
ASSET_MAPPING = {
    # SAP DEPARTMENT
    153: {"department": "SAP", "machine_name": "Pompe_HRS_601ABP04"},
    156: {"department": "SAP", "machine_name": "Pompe_circulation_bac_commun_601AAP01"},
    159: {"department": "SAP", "machine_name": "Pompe_circulation_bac_commun_601AAP02"},
    
    # AF DEPARTMENT
    168: {"department": "AF", "machine_name": "POMPE_A_VIDE_603AAC01"},
    171: {"department": "AF", "machine_name": "POMPE_A_VIDE_603AAC06"},
    174: {"department": "AF", "machine_name": "POMPE_A_VIDE_603ABC06"},
    193: {"department": "AF", "machine_name": "POMPE_B_FLASH_COOLER_603ABP01"},
    
    # CAP DEPARTMENT
    177: {"department": "CAP", "machine_name": "POMPE_DE_CIRCULATION_J_604JAP04"},
    181: {"department": "CAP", "machine_name": "POMPE_DE_CIRCULATION_K_604KAP04"},
    185: {"department": "CAP", "machine_name": "POMPE_DE_CIRCULATION_L_604LAP04"},
    
    # ENGRAIS DEPARTMENT
    197: {"department": "ENGRAIS", "machine_name": "Elevateur_607AAT01"},
    201: {"department": "ENGRAIS", "machine_name": "Elevateur_607AAT04"},
    205: {"department": "ENGRAIS", "machine_name": "Elevateur_607AAT05"},
    209: {"department": "ENGRAIS", "machine_name": "Elevateur_607AAT06"},
    213: {"department": "ENGRAIS", "machine_name": "Enrobeur_607AAM04"},
    217: {"department": "ENGRAIS", "machine_name": "Granulateur_607AAM03"},
    221: {"department": "ENGRAIS", "machine_name": "Tube_secheur_607AAF02"},
}

# Sensor point mappings
SENSOR_POINTS = {
    'acceleration': 2,
    'temperature': 15,
    'vibration': 100,
}

class AllDepartmentsFetcher:
    def __init__(self):
        self.token = None
        self.project_root = Path("/opt/airflow")
        self.raw_path = self.project_root / "data" / "raw"
        
    def login(self):
        """Login to i-Sense"""
        url = f"{BASE_URL}/auth/login"
        headers = {"Content-Type": "application/json"}
        data = {"email": ISENSE_EMAIL, "password": ISENSE_PASSWORD}
        
        response = requests.post(url, headers=headers, json=data)
        if response.status_code == 200:
            result = response.json()
            self.token = result.get('token') or result.get('access_token')
            print("✅ Logged in successfully")
            return True
        return False
    
    def fetch_sensor_data(self, asset_id, points):
        """Fetch data for specific asset and point count"""
        url = f"{BASE_URL}/tenant/assets/trend/{asset_id}/{points}"
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            response = requests.post(url, headers=headers, timeout=30)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            pass
        return None
    
    def parse_measures(self, data, sensor_type):
        """Extract measurements from response"""
        if not data or 'measures' not in data:
            return []
        
        measures = data['measures']
        results = []
        
        if isinstance(measures, list):
            for measure in measures:
                point_name = measure.get('point_name')
                values = measure.get('values', [])
                
                for v in values:
                    results.append({
                        'part_code': point_name,
                        'timestamp': v.get('created_at'),
                        'sensor_type': sensor_type,
                        'value': v.get('value')
                    })
        elif isinstance(measures, dict):
            for point_name, point_data in measures.items():
                values = point_data.get('values', [])
                for v in values:
                    results.append({
                        'part_code': point_name,
                        'timestamp': v.get('created_at'),
                        'sensor_type': sensor_type,
                        'value': v.get('value')
                    })
        
        return results
    
    def fetch_asset_data(self, asset_id):
        """Fetch all sensor data for a single asset"""
        all_data = []
        
        for sensor_type, points in SENSOR_POINTS.items():
            data = self.fetch_sensor_data(asset_id, points)
            
            if data:
                parsed = self.parse_measures(data, sensor_type)
                if parsed:
                    all_data.extend(parsed)
            
            time.sleep(0.2)
        
        return all_data
    
    def save_asset_data(self, raw_data, department, machine_name):
        """Save data as 3 separate files with duplicate handling"""
        if not raw_data:
            return False
        
        df = pd.DataFrame(raw_data)
        if df.empty:
            return False
        
        # Convert timestamp
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Remove duplicates by averaging values for same timestamp, part_code, sensor_type
        df = df.groupby(['timestamp', 'part_code', 'sensor_type'], as_index=False)['value'].mean()
        
        # Create separate DataFrames for each sensor type
        accel_df = df[df['sensor_type'] == 'acceleration'][['timestamp', 'value', 'part_code']].copy()
        vib_df = df[df['sensor_type'] == 'vibration'][['timestamp', 'value', 'part_code']].copy()
        temp_df = df[df['sensor_type'] == 'temperature'][['timestamp', 'value', 'part_code']].copy()
        
        # Create machine folder
        machine_folder = self.raw_path / department / machine_name
        machine_folder.mkdir(parents=True, exist_ok=True)
        
        # Helper function to save
        def save_sensor_data(data_df, filename, suffix):
            if data_df.empty:
                print(f"      ⚠️ No {filename} data")
                return
            
            try:
                # Pivot the data
                pivot = data_df.pivot(index='timestamp', columns='part_code', values='value').reset_index()
                
                # Rename columns
                pivot.columns = ['DateTime'] + [f'{col}{suffix}' for col in pivot.columns[1:]]
                
                # Sort by timestamp
                pivot = pivot.sort_values('DateTime')
                
                # Save to CSV
                file_path = machine_folder / filename
                pivot.to_csv(file_path, index=False)
                print(f"      💾 Saved: {filename} ({len(pivot)} rows, {len(pivot.columns)-1} parts)")
            except Exception as e:
                print(f"      ❌ Error saving {filename}: {e}")
        
        # Save each sensor type
        save_sensor_data(accel_df, "AccelerationData.csv", "-O")
        save_sensor_data(vib_df, "VibrationData.csv", "-V")
        save_sensor_data(temp_df, "TemperatureData.csv", "-T")
        
        return True
    
    def fetch_all(self):
        """Fetch data for ALL departments and ALL machines"""
        print("\n" + "=" * 80)
        print("🚀 FETCHING DATA FOR ALL DEPARTMENTS")
        print(f"   Total machines: {len(ASSET_MAPPING)}")
        print("=" * 80)
        
        if not self.login():
            print("❌ Login failed")
            return
        
        results = {}
        stats = {dept: {"success": 0, "total": 0} for dept in ["SAP", "AF", "CAP", "ENGRAIS"]}
        
        for asset_id, info in ASSET_MAPPING.items():
            department = info['department']
            machine_name = info['machine_name']
            
            print(f"\n📡 Asset {asset_id} → {department}/{machine_name}")
            
            raw_data = self.fetch_asset_data(asset_id)
            
            if raw_data:
                success = self.save_asset_data(raw_data, department, machine_name)
                results[asset_id] = success
                if success:
                    stats[department]["success"] += 1
            else:
                results[asset_id] = False
            
            stats[department]["total"] += 1
            time.sleep(0.5)
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 FETCH SUMMARY - ALL DEPARTMENTS")
        print("=" * 80)
        
        for dept, stat in stats.items():
            status = "✅" if stat["success"] == stat["total"] else "⚠️"
            print(f"\n{status} {dept}: {stat['success']}/{stat['total']} machines")
        
        return results

if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("🏭 i-SENSE COMPLETE DATA FETCHER")
    print("   SAP | AF | CAP | ENGRAIS")
    print("=" * 80)
    
    fetcher = AllDepartmentsFetcher()
    fetcher.fetch_all()