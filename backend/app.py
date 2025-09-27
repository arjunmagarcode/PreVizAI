# backend/app.py
from flask import Flask, request, jsonify
from HCPSide.generatePatientReport import generate_patient_report

app = Flask(__name__)

@app.route("/generate_report", methods=["POST"])
def generate_report():
    """
    Expects JSON payload:
    {
        "transcript": "The text from the frontend"
    }
    """
    data = request.json
    transcript = data.get("transcript")
    if not transcript:
        return jsonify({"error": "Transcript missing"}), 400

    # Generate patient report using the transcript
    result = generate_patient_report(transcript_text=transcript)

    # Return both insights report and next steps to frontend
    return jsonify({
        "message": "Report generated successfully",
        "insights_report": result["insights_report"],
        "next_steps": result["next_steps"],
        "graph": result["annotated_graph"]
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)