# backend/HCPSide/generatePatientReport.py

import os
import json
from dotenv import load_dotenv
from openai import OpenAI
from HCPSide.reviseKnowledgeGraph import revise_knowledge_graph, EXAMPLE_GRAPH_JSON, EXAMPLE_EMR_JSON, EXAMPLE_TRANSCRIPT_TXT

# -----------------------------
# PATH CONFIGURATION
# -----------------------------
LLM_PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "LLM_Prompts")
INSIGHTS_REPORT_PROMPT_PATH = os.path.join(LLM_PROMPTS_DIR, "insightsReportPrompt.txt")
NEXT_STEPS_PROMPT_PATH = os.path.join(LLM_PROMPTS_DIR, "nextStepsPrompt.txt")

# -----------------------------
# LLM CONFIGURATION
# -----------------------------
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

# -----------------------------
# LLM REPORT FUNCTIONS
# -----------------------------
def generate_insights_report_llm(graph_data, emr_data, transcript, save_file=True):
    """Generate a digestible patient insights report for HCPs using the LLM."""
    with open(INSIGHTS_REPORT_PROMPT_PATH, "r") as f:
        prompt_template = f.read()

    nodes_info = [
        {
            "name": node.get("name"),
            "type": node.get("type"),
            "context": node.get("context", {}),
            "llm_summary": node.get("llm_summary", "")
        }
        for node in graph_data.get("nodes", [])
    ]

    prompt = prompt_template.replace("{NODES}", json.dumps(nodes_info, indent=2)) \
                            .replace("{EMR_DATA}", json.dumps(emr_data, indent=2)) \
                            .replace("{TRANSCRIPT}", transcript)

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}]
    )

    report_text = response.choices[0].message.content.strip()

    if save_file:
        output_file = os.path.join("patient_insights_report.txt")
        with open(output_file, "w") as f:
            f.write(report_text)
        print(f"✅ LLM Insights report saved to {output_file}")

    return report_text


def generate_next_steps_llm(graph_data, emr_data, transcript, save_file=True):
    """Generate recommended next steps with node impact and priority scores and return as dict."""
    with open(NEXT_STEPS_PROMPT_PATH, "r") as f:
        prompt_template = f.read()

    nodes_info = [
        {
            "name": node.get("name"),
            "type": node.get("type"),
            "context": node.get("context", {}),
            "llm_summary": node.get("llm_summary", "")
        }
        for node in graph_data.get("nodes", [])
    ]

    prompt = prompt_template.replace("{NODES}", json.dumps(nodes_info, indent=2)) \
                            .replace("{EMR_DATA}", json.dumps(emr_data, indent=2)) \
                            .replace("{TRANSCRIPT}", transcript)

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}]
    )

    next_steps = json.loads(response.choices[0].message.content.strip())

    if save_file:
        output_file = os.path.join("nextSteps.json")
        with open(output_file, "w") as f:
            json.dump(next_steps, f, indent=2)
        print(f"✅ Next steps saved to {output_file}")

    return next_steps


# -----------------------------
# MAIN FUNCTION
# -----------------------------
def generate_patient_report(graph_json_file=EXAMPLE_GRAPH_JSON,
                            emr_json_file=EXAMPLE_EMR_JSON,
                            transcript_text=None):
    """
    Generate patient report. transcript_text can be passed directly from frontend.
    Returns:
        {
            "annotated_graph": ...,
            "insights_report": ...,
            "next_steps": ...
        }
    """
    # Load EMR data
    with open(emr_json_file, "r") as f:
        emr_data = json.load(f)

    if transcript_text is None:
        # Fallback to example transcript file if needed
        with open(EXAMPLE_TRANSCRIPT_TXT, "r") as f:
            transcript_text = f.read()

    # Revise knowledge graph
    annotated_graph = revise_knowledge_graph(graph_json_file, emr_json_file, None)

    # Generate next steps and insights
    next_steps = generate_next_steps_llm(annotated_graph, emr_data, transcript_text, save_file=False)
    insights_report = generate_insights_report_llm(annotated_graph, emr_data, transcript_text, save_file=False)

    return {
        "annotated_graph": annotated_graph,
        "insights_report": insights_report,
        "next_steps": next_steps
    }