# scripts/run_pipeline.py
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from spark_pipeline.main_pipeline import run_full_pipeline

if __name__ == "__main__":
    print("\n⚠️ This will process all CSV files and generate predictions")
    response = input("Continue? (yes/no): ")
    
    if response.lower() == 'yes':
        run_full_pipeline()
    else:
        print("Cancelled.")