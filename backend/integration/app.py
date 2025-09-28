# backend/app.py
from flask import Flask, request, jsonify
import json
from createKnowledgeGraph import build_knowledge_graph
from reviseKnowledgeGraph import revise_knowledge_graph, EXAMPLE_EMR_JSON
from generatePatientReport import generate_patient_report
import os
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
    """
    Expects JSON payload:
    {
        "transcript": "The text from the frontend"
    }
    """
    if request.method == "OPTIONS":
        # Preflight response
        return ("", 204)

    data = request.json
    transcript = data.get("transcript")
    if not transcript:
        return jsonify({"error": "Transcript missing"}), 400

    # Load EMR data
    with open(EXAMPLE_EMR_JSON, "r") as f:
        emr_data = json.load(f)

    # Step 1: Build initial knowledge graph from conversation
    # You need to provide a prompt and API key; replace with your actual prompt and key
    graph_prompt = "Extract a structured medical knowledge graph from this conversation."
    api_key = os.getenv("OPENAI_API_KEY")
    initial_graph = build_knowledge_graph(transcript, graph_prompt, api_key)

    # Step 2: Revise / annotate the knowledge graph
    annotated_graph = revise_knowledge_graph(initial_graph, emr_data, transcript)

    # Step 3: Generate insights report and next steps
    report = generate_patient_report(annotated_graph, emr_data, transcript)

    return jsonify({
        "message": "Report generated successfully",
        "insights_report": report["insights_report"],
        "next_steps": report["next_steps"],
        "graph": report["annotated_graph"]
    })


if __name__ == "__main__":
    # Ensure the OpenAI API key is loaded
    if not os.getenv("OPENAI_API_KEY"):
        print("Warning: OPENAI_API_KEY not set in environment.")
    app.run(debug=True, port=5000)