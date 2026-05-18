from flask import Flask, request, jsonify
import subprocess
import logging

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)

@app.route('/trigger', methods=['GET', 'POST'])
def trigger():
    # Get department from GET param or POST JSON
    if request.method == 'GET':
        department = request.args.get('department')
    else:
        department = request.json.get('department') if request.is_json else request.args.get('department')
    
    logging.info(f"Trigger received for department: {department}")
    
    if not department:
        return jsonify({"error": "No department provided"}), 400
    
    # Run your Spark pipeline
    cmd = f'cd C:\\Users\\sally\\Desktop\\AI-predictionsystem && python scripts/run_pipeline.py --layer bronze --department {department}'
    logging.info(f"Running: {cmd}")
    
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=300)
        logging.info(f"Exit code: {result.returncode}")
        
        if result.stdout:
            logging.info(f"Output: {result.stdout[:500]}")
        if result.stderr:
            logging.info(f"Error: {result.stderr[:500]}")
        
        if result.returncode == 0:
            return jsonify({"status": "success"}), 200
        else:
            return jsonify({"status": "failed", "error": result.stderr}), 500
    except subprocess.TimeoutExpired:
        logging.error("Pipeline timed out")
        return jsonify({"status": "timeout", "error": "Pipeline took too long"}), 408
    except Exception as e:
        logging.error(f"Exception: {str(e)}")
        return jsonify({"status": "error", "error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    print("Starting trigger server on port 5000...")
    print("Endpoint: http://localhost:5000/trigger?department=AF")
    app.run(host='0.0.0.0', port=5000, debug=True)