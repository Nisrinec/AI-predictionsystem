# check_data_timerange.py
"""
Check how many days/hours of data were fetched from i-Sense
"""

import pandas as pd
from pathlib import Path

def check_data_range():
    project_root = Path("C:/Users/sally/Desktop/AI-predictionsystem")
    raw_path = project_root / "data" / "raw"
    
    print("=" * 80)
    print("📊 DATA TIME RANGE ANALYSIS")
    print("=" * 80)
    
    for department in ["SAP", "AF", "CAP", "ENGRAIS"]:
        dept_path = raw_path / department
        if not dept_path.exists():
            continue
        
        print(f"\n🏭 {department} DEPARTMENT:")
        print("-" * 40)
        
        for machine_folder in dept_path.iterdir():
            if machine_folder.is_dir():
                # Find the latest CSV file
                csv_files = list(machine_folder.glob("*.csv"))
                if csv_files:
                    latest_file = max(csv_files, key=lambda x: x.stat().st_mtime)
                    df = pd.read_csv(latest_file)
                    
                    if 'DateTime' in df.columns:
                        df['DateTime'] = pd.to_datetime(df['DateTime'])
                        min_date = df['DateTime'].min()
                        max_date = df['DateTime'].max()
                        days_span = (max_date - min_date).days
                        
                        print(f"   📁 {machine_folder.name}")
                        print(f"      From: {min_date.strftime('%Y-%m-%d %H:%M')}")
                        print(f"      To:   {max_date.strftime('%Y-%m-%d %H:%M')}")
                        print(f"      Span: {days_span} days ({len(df)} records)")
                    else:
                        print(f"   📁 {machine_folder.name}: No DateTime column")

if __name__ == "__main__":
    check_data_range()