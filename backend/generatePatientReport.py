# backend/generatePatientReport.py

import os
import json
from dotenv import load_dotenv
from openai import OpenAI

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
def generate_insights_report_llm(graph_data, emr_data, transcript):
    """Generate insights report from annotated graph and EMR data."""
    with open(INSIGHTS_REPORT_PROMPT_PATH, "r", encoding="utf-8") as f:
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

    return response.choices[0].message.content.strip()


def generate_next_steps_llm(graph_data, emr_data, transcript):
    """Generate recommended next steps from annotated graph and EMR data."""
    with open(NEXT_STEPS_PROMPT_PATH, "r", encoding="utf-8") as f:
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

    return json.loads(response.choices[0].message.content.strip())


# -----------------------------
# MAIN FUNCTION
# -----------------------------
def generate_patient_report(annotated_graph, emr_data, transcript_text):
    """
    Takes a revised/annotated graph and generates insights + next steps.
    Returns:
        {
            "annotated_graph": ...,
            "insights_report": ...,
            "next_steps": ...
        }
    """
    next_steps = generate_next_steps_llm(annotated_graph, emr_data, transcript_text)
    insights_report = generate_insights_report_llm(annotated_graph, emr_data, transcript_text)

    return {
        "annotated_graph": annotated_graph,
        "insights_report": insights_report,
        "next_steps": next_steps
    }
