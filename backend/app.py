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
        print("OPTIONS preflight request received")
        return ("", 204)

    data = request.json
    print("=== /generate_report called ===")
    print("Received headers:", dict(request.headers))
    print("Received body:", data)

    transcript = data.get("transcript") if data else None
    if not transcript:
        print("Error: Transcript missing!")
        return jsonify({"error": "Transcript missing"}), 400

    # Load EMR data
    emr_path = os.path.join("backend", "exampleEMR.json")
    with open(emr_path, "r") as f:
        emr_data = json.load(f)
    print("Loaded EMR data successfully")

    # Step 1: Build initial knowledge graph
    prompt_path = os.path.join(os.path.dirname(__file__), "LLM_Prompts", "knowledgeGraphPrompt.txt")
    try:
        with open(prompt_path, "r") as f:
            graph_prompt = f.read()
        print("Prompt loaded successfully:")
        print(graph_prompt)
    except FileNotFoundError:
        print(f"File not found: {prompt_path}")    
    
    api_key = os.getenv("OPENAI_API_KEY")
    print("Calling build_knowledge_graph()...")
    initial_graph = build_knowledge_graph(transcript, graph_prompt, api_key)
    print("Initial knowledge graph:", initial_graph)

    # Step 2: Revise / annotate graph
    print("Calling revise_knowledge_graph()...")
    annotated_graph = revise_knowledge_graph(initial_graph, emr_data, transcript)
    print("Annotated graph:", annotated_graph)

    # Step 3: Generate insights report and next steps
    print("Calling generate_patient_report()...")
    report = generate_patient_report(annotated_graph, emr_data, transcript)
    print("Generated report successfully")
    print("Report summary keys:", list(report.keys()))

    return jsonify({
        "message": "Report generated successfully",
        "insights_report": report.get("insights_report"),
        "next_steps": report.get("next_steps"),
        "graph": report.get("annotated_graph")
    })

if __name__ == "__main__":
    if not os.getenv("OPENAI_API_KEY"):
        print("Warning: OPENAI_API_KEY not set in environment.")
    app.run(debug=True, host="0.0.0.0", port=5000)
