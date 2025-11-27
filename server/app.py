from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import json, os

# Determine paths relative to this script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
ASSETS_DIR = os.path.join(PROJECT_ROOT, "assets")
PUBLIC_DIR = os.path.join(PROJECT_ROOT, "public")

app = Flask(__name__, static_folder=ASSETS_DIR)
CORS(app)

PROGRESS_FILE = os.path.join(DATA_DIR, "progress.json")

# Ensure data directory exists
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

def load_progress():
    if not os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "w") as f:
            json.dump({}, f)
    with open(PROGRESS_FILE, "r") as f:
        return json.load(f)

def save_progress(data):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(data, f, indent=4)

# Serve Index
@app.route("/")
def index():
    return send_file(os.path.join(PROJECT_ROOT, "index.html"))

# Serve Assets (CSS/JS/Icons) explicitly if needed, though static_folder handles some
@app.route("/assets/<path:path>")
def serve_assets(path):
    return send_from_directory(ASSETS_DIR, path)

# Serve Data (JSONs)
@app.route("/data/<path:path>")
def serve_data(path):
    return send_from_directory(DATA_DIR, path)

# Serve Public Files (Books/PDFs)
@app.route("/public/<path:path>")
def serve_public(path):
    return send_from_directory(PUBLIC_DIR, path)

# API: Get Progress
@app.get("/progress")
def get_progress():
    return jsonify(load_progress())

# API: Update Progress
@app.post("/progress")
def update_progress():
    data = request.get_json()
    save_progress(data)
    return {"status": "saved"}

# API: Export Progress
@app.get("/export")
def export_progress():
    return send_file(PROGRESS_FILE, as_attachment=True)

# API: Import Progress
@app.post("/import")
def import_progress():
    if "file" not in request.files:
        return {"error": "Missing file"}, 400

    uploaded = request.files["file"]
    data = json.load(uploaded)

    save_progress(data)
    return {"status": "imported"}

if __name__ == "__main__":
    print(f"Project Root: {PROJECT_ROOT}")
    print(f"Serving on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
