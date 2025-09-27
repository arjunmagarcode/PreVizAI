# generatePatientReport.py

import json
import os
from openai import OpenAI
from dotenv import load_dotenv
from reviseKnowledgeGraph import revise_knowledge_graph, EXAMPLE_GRAPH_JSON, EXAMPLE_EMR_JSON, EXAMPLE_TRANSCRIPT_TXT

# -----------------------------
# PATH CONFIGURATION
# -----------------------------
LLM_PROMPTS_DIR = "LLM_Prompts"
INSIGHTS_REPORT_PROMPT_PATH = os.path.join(LLM_PROMPTS_DIR, "insightsReportPrompt.txt")
MOCK_DATA_DIR = "Mock_Patient_Information"

# -----------------------------
# LLM CONFIGURATION
# -----------------------------
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

# -----------------------------
# INSIGHTS REPORT FUNCTION
# -----------------------------
def generate_insights_report_llm(graph_data, emr_data, transcript):
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

    output_file = os.path.join("patient_insights_report.txt")
    with open(output_file, "w") as f:
        f.write(report_text)

    print(f"✅ LLM Insights report saved to {output_file}")
    return report_text


def generate_next_steps_llm(graph_data, emr_data, transcript, output_file="nextSteps.json"):
    """Generate recommended next steps with node impact and priority scores and save to JSON."""
    NEXT_STEPS_PROMPT_PATH = os.path.join("LLM_Prompts", "nextStepsPrompt.txt")
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

    # Parse the LLM output as JSON
    next_steps = json.loads(response.choices[0].message.content.strip())

    # Write directly to JSON file
    with open(output_file, "w") as f:
        json.dump(next_steps, f, indent=2)

    print(f"✅ Next steps saved to {output_file}")


# -----------------------------
# MAIN FUNCTION
# -----------------------------
def generate_patient_report(graph_json_file=EXAMPLE_GRAPH_JSON,
                            emr_json_file=EXAMPLE_EMR_JSON,
                            transcript_txt_file=EXAMPLE_TRANSCRIPT_TXT):

    with open(emr_json_file, "r") as f:
        emr_data = json.load(f)
    with open(transcript_txt_file, "r") as f:
        transcript = f.read()

    """Revise knowledge graph then generate insights report."""
    annotated_graph = revise_knowledge_graph(graph_json_file, emr_json_file, transcript_txt_file)
    generate_next_steps_llm(annotated_graph, emr_data, transcript)
    generate_insights_report_llm(annotated_graph, emr_data, transcript)
    return annotated_graph


# -----------------------------
# EXAMPLE USAGE
# -----------------------------
if __name__ == "__main__":
    generate_patient_report()