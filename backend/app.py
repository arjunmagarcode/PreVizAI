# ...existing code...
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
# Allow specific frontend origins (3000/3001)
CORS(app, resources={r"/generate_report": {"origins": ["http://localhost:3000", "http://localhost:3001"]}})

ALLOWED_ORIGINS = {"http://localhost:3000", "http://localhost:3001"}

@app.after_request
def add_cors_headers(resp):
    origin = request.headers.get("Origin")
    if origin in ALLOWED_ORIGINS and request.path.startswith("/generate_report"):
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
        resp.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        # resp.headers["Access-Control-Allow-Credentials"] = "true"  # enable if you send credentials
    return resp

@app.route("/generate_report", methods=["POST", "OPTIONS"])
def generate_report():
    if request.method == "OPTIONS":
        # Preflight response
        return ("", 204)

    data = request.json or {}
    transcript = data.get("transcript")
    if not transcript:
        return jsonify({"error": "Transcript missing"}), 400
    
    print(transcript)

    # TODO: replace stub with real report generation
    return jsonify({
        "message": "Report generated successfully",
        "insights_report": {"summary": "stub"},
        "next_steps": [],
        "graph": {}
    })
# ...existing code...

if __name__ == "__main__":
    app.run(debug=True, port=5000)
