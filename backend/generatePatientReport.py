# backend/generatePatientReport.py

import os
import json
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from openai import OpenAI

# -----------------------------
# PATHS
# -----------------------------
LLM_PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "LLM_Prompts")
SUMMARY_PROMPT_PATH = os.path.join(LLM_PROMPTS_DIR, "summaryTabPrompt.txt")
EMR_PROMPT_PATH = os.path.join(LLM_PROMPTS_DIR, "emrTabPrompt.txt")

# -----------------------------
# LLM
# -----------------------------
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise RuntimeError("OPENAI_API_KEY not set")
client = OpenAI(api_key=api_key)
MODEL = "gpt-4o-mini"  # change here if needed

# -----------------------------
# Utils
# -----------------------------
def only_patient_lines(transcript: str) -> List[str]:
    if not transcript:
        return []
    out = []
    for raw in transcript.splitlines():
        s = raw.strip()
        if s.lower().startswith("patient:"):
            out.append(s.split(":", 1)[1].strip())
    return out

def _extract_json(text: str) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(text)
    except Exception:
        pass
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start:end+1])
        except Exception:
            return None
    return None

def chat_json(messages: List[Dict[str, str]]) -> Dict[str, Any]:
    resp = client.chat.completions.create(model=MODEL, messages=messages)
    content = (resp.choices[0].message.content or "").strip()
    data = _extract_json(content)
    if data is None:
        raise ValueError(f"Model did not return valid JSON. Got:\n{content[:600]}")
    return data

# -----------------------------
# Builders
# -----------------------------
def generate_summary_tab(transcript_text: str) -> Dict[str, Any]:
    with open(SUMMARY_PROMPT_PATH, "r", encoding="utf-8") as f:
        prompt = f.read()
    patient_lines = only_patient_lines(transcript_text)
    user = prompt.replace("{PATIENT_LINES_JSON}", json.dumps(patient_lines, ensure_ascii=False, indent=2))
    messages = [{"role": "system", "content": user.split("USER:")[0].strip()},
                {"role": "user", "content": user.split("USER:")[1].strip()}]
    data = chat_json(messages)
    data.setdefault("type", "summary_tab")
    return data

def generate_emr_tab(emr_data: Dict[str, Any], transcript_text: str) -> Dict[str, Any]:
    with open(EMR_PROMPT_PATH, "r", encoding="utf-8") as f:
        prompt = f.read()
    patient_lines = only_patient_lines(transcript_text)
    user = (prompt
            .replace("{EMR_JSON}", json.dumps(emr_data, ensure_ascii=False, indent=2))
            .replace("{PATIENT_LINES_JSON}", json.dumps(patient_lines, ensure_ascii=False, indent=2)))
    messages = [{"role": "system", "content": user.split("USER:")[0].strip()},
                {"role": "user", "content": user.split("USER:")[1].strip()}]
    data = chat_json(messages)
    data.setdefault("type", "emr_tab")
    return data

# -----------------------------
# Main
# -----------------------------
def generate_patient_report(annotated_graph: Dict[str, Any],
                            emr_data: Dict[str, Any],
                            transcript_text: str) -> Dict[str, Any]:
    """
    Returns:
    {
      "annotated_graph": ...,
      "summary_tab": { ... },
      "emr_tab": { ... }
    }
    """
    summary_tab = generate_summary_tab(transcript_text)
    emr_tab = generate_emr_tab(emr_data, transcript_text)
    return {
        "annotated_graph": annotated_graph,
        "summary_tab": summary_tab,
        "emr_tab": emr_tab,
    }
