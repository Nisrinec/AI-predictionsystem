import sys
import requests
import os

filename = sys.argv[1] if len(sys.argv) > 1 else "unknown"
filepath = sys.argv[2] if len(sys.argv) > 2 else ""

# Determine department
department = "UNKNOWN"
if "SAP" in filepath:
    department = "SAP"
elif "AF" in filepath:
    department = "AF"
elif "CAP" in filepath:
    department = "CAP"
elif "ENGRAIS" in filepath:
    department = "ENGRAIS"

print(f"Processing: {filename}")
print(f"Department: {department}")

if department == "UNKNOWN":
    print("Cannot determine department")
    sys.exit(1)

# Call trigger server
try:
    response = requests.get(f"http://host.docker.internal:5000/trigger?department={department}", timeout=60)
    if response.status_code == 200:
        print("SUCCESS: Pipeline triggered")
        sys.exit(0)
    else:
        print(f"FAILED: {response.status_code}")
        sys.exit(1)
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
