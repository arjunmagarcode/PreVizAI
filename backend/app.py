# backend/app.py
from flask import Flask, request, jsonify
import json
from createKnowledgeGraph import build_knowledge_graph
from reviseKnowledgeGraph import revise_knowledge_graph
from generatePatientReport import generate_patient_report
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # allow all origins for local dev

ALLOWED_ORIGINS = {"http://localhost:3000", "http://localhost:3001"}

@app.after_request
def add_cors_headers(resp):
    origin = request.headers.get("Origin")
    if origin in ALLOWED_ORIGINS and request.path.startswith("/generate_report"):
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
        resp.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    return resp

@app.route("/generate_report", methods=["POST", "OPTIONS"])
def generate_report():
    if request.method == "OPTIONS":
        return ("", 204)

    data = request.json
    transcript = data.get("transcript") if data else None
    if not transcript:
        return jsonify({"error": "Transcript missing"}), 400

    # Load EMR data
    emr_path = os.path.join("backend", "exampleEMR.json")
    with open(emr_path, "r") as f:
        emr_data = json.load(f)

    # Step 1: Build initial knowledge graph
    prompt_path = os.path.join(os.path.dirname(__file__), "LLM_Prompts", "knowledgeGraphPrompt.txt")
    try:
        with open(prompt_path, "r") as f:
            graph_prompt = f.read()
    except FileNotFoundError:
        graph_prompt = ""

    api_key = os.getenv("OPENAI_API_KEY")
    initial_graph = build_knowledge_graph(transcript, graph_prompt, api_key)

    # Step 2: Revise / annotate graph
    annotated_graph = revise_knowledge_graph(initial_graph, emr_data, transcript)

    # Step 3: Generate (summary_tab + emr_tab); keep legacy response keys
    report = generate_patient_report(annotated_graph, emr_data, transcript)

    summary_tab = report.get("summary_tab", {})
    emr_tab = report.get("emr_tab", {})
    next_steps = summary_tab.get("next_best_actions", [])

    return jsonify({
        "message": "Report generated successfully",
        "insights_report": summary_tab,            # summary tab object (legacy key)
        "next_steps": next_steps,                  # convenience array
        "graph": report.get("annotated_graph"),    # unchanged
        "emr_tab": emr_tab                         # NEW: EMR insights tab
    })

if __name__ == "__main__":
    if not os.getenv("OPENAI_API_KEY"):
        pass
    app.run(debug=True, host="0.0.0.0", port=5000)
