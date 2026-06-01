# scripts/run_pipeline.py
import sys
import io
from pathlib import Path
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.insert(0, str(Path(__file__).parent.parent))

from spark_pipeline.main_pipeline import run_full_pipeline

if __name__ == "__main__":
    print("🚀 Starting Spark pipeline automatically...")
    run_full_pipeline()
    print("✅ Pipeline finished")