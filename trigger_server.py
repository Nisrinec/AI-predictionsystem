from flask import Flask, request, jsonify
import subprocess
import logging
import threading
import time

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)

@app.route('/trigger', methods=['GET', 'POST'])
def trigger():
    department = request.args.get('department') or request.json.get('department') if request.is_json else request.args.get('department')
    logging.info(f"Trigger received for department: {department}")
    
    if not department:
        return jsonify({"error": "No department provided"}), 400
    
    # Run Spark in background
    def run_spark():
        start_time = time.time()
        logging.info(f"Starting Spark pipeline for {department}...")
        cmd = f'cd C:\\Users\\sally\\Desktop\\AI-predictionsystem && python scripts/run_pipeline.py'
        
        try:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=1200)
            elapsed = time.time() - start_time
            if result.returncode == 0:
                logging.info(f"✅ Spark completed for {department} in {elapsed:.1f} seconds")
            else:
                logging.error(f"❌ Spark failed for {department}: {result.stderr[:500]}")
        except subprocess.TimeoutExpired:
            logging.error(f"⏰ Spark timed out for {department} after 20 minutes")
        except Exception as e:
            logging.error(f"💥 Spark error for {department}: {e}")
    
    thread = threading.Thread(target=run_spark)
    thread.start()
    
    # Return immediately (no timeout)
    return jsonify({"status": "started", "department": department, "message": "Pipeline running in background"}), 200

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    print("=" * 50)
    print("🚀 Trigger Server Starting...")
    print("   Endpoint: http://localhost:5000/trigger?department=SAP")
    print("   Health:    http://localhost:5000/health")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)