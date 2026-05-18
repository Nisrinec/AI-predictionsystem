"""
NiFi processor to trigger your Spark pipeline
This runs INSIDE Docker but triggers Python on your Windows machine
"""

import subprocess
import os
from datetime import datetime

# Your Windows project path (where Spark runs)
PROJECT_ROOT = r"C:\Users\sally\Desktop\AI-predictionsystem"

def process_file(input_flowfile, session):
    """Called by NiFi when a new CSV file arrives"""
    
    # Get file info from NiFi
    filename = input_flowfile.getAttribute('filename')
    file_path = input_flowfile.getAttribute('path')
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] 📄 New file detected: {filename}")
    print(f"   Path: {file_path}")
    
    # Detect department from path
    department = None
    if 'AF' in file_path or '\\AF\\' in file_path or '/AF/' in file_path:
        department = 'AF'
    elif 'CAP' in file_path or '\\CAP\\' in file_path or '/CAP/' in file_path:
        department = 'CAP'
    elif 'ENGRAIS' in file_path or '\\ENGRAIS\\' in file_path or '/ENGRAIS/' in file_path:
        department = 'ENGRAIS'
    elif 'SAP' in file_path or '\\SAP\\' in file_path or '/SAP/' in file_path:
        department = 'SAP'
    
    if not department:
        print(f"   ❌ Could not detect department from path: {file_path}")
        session.transfer(input_flowfile, REL_FAILURE)
        session.commit()
        return
    
    print(f"   🏭 Department: {department}")
    print(f"   🚀 Triggering Spark pipeline...")
    
    # Run your Spark pipeline
    cmd = f'cd {PROJECT_ROOT} && python scripts/run_pipeline.py --layer bronze --department {department}'
    
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=3600)
        
        if result.returncode == 0:
            print(f"   ✅ Pipeline succeeded for {department}")
            print(f"   📊 Output: {result.stdout[:200]}...")  # First 200 chars
            session.transfer(input_flowfile, REL_SUCCESS)
        else:
            print(f"   ❌ Pipeline failed for {department}")
            print(f"   Error: {result.stderr[:500]}")
            session.transfer(input_flowfile, REL_FAILURE)
            
    except subprocess.TimeoutExpired:
        print(f"   ⏰ Pipeline timed out after 1 hour")
        session.transfer(input_flowfile, REL_FAILURE)
    except Exception as e:
        print(f"   💥 Exception: {str(e)}")
        session.transfer(input_flowfile, REL_FAILURE)
    
    session.commit()