# backend/createKnowledgeGraph.py
import os
import json
import re
from openai import OpenAI
from difflib import SequenceMatcher

# -----------------------------
# CONFIGURATION
# -----------------------------
NODE_COLORS = {
    "Symptom": "#ff6666",
    "Condition": "#66b3ff",
    "Trigger": "#ffcc66",
    "Timing": "#99cc99",
    "Medication": "#9966ff"
}

MIN_NODE_SIZE = 40
MAX_NODE_SIZE = 100
SIMILARITY_THRESHOLD = 0.85  # fuzzy merge threshold

TYPE_PRIORITY = {
    "Condition": 1.0,
    "Symptom": 0.9,
    "Medication": 0.7,
    "Trigger": 0.6,
    "Timing": 0.5
}

# -----------------------------
# INITIALIZATION
# -----------------------------
def init_client(api_key):
    """Initialize OpenAI client"""
    # print("Initializing OpenAI client...")
    if not api_key:
        # print("Warning: No API key provided!")
        pass
    return OpenAI(api_key=api_key)

# -----------------------------
# HELPER FUNCTIONS
# -----------------------------
def similar(a, b):
    """Check if two strings are similar above threshold"""
    ratio = SequenceMatcher(None, a.lower(), b.lower()).ratio()
    # print(f"Comparing '{a}' vs '{b}' -> similarity: {ratio}")
    return ratio >= SIMILARITY_THRESHOLD

def compute_node_size(importance, mention_count=0, node_type="Unknown", alias_count=0):
    """Compute node size based on importance, type, mentions, and aliases"""
    type_priority = TYPE_PRIORITY.get(node_type, 0.5)
    norm_mentions = min(1.0, mention_count / 10.0)
    norm_aliases = min(1.0, alias_count / 5.0)
    score = 0.5 * importance + 0.25 * norm_aliases + 0.15 * type_priority + 0.10 * norm_mentions
    node_size = MIN_NODE_SIZE + (MAX_NODE_SIZE - MIN_NODE_SIZE) * score
    # print(f"Computed node size for type '{node_type}': {node_size} (importance={importance}, mentions={mention_count}, aliases={alias_count})")
    return node_size

# -----------------------------
# GRAPH GENERATION
# -----------------------------
def generate_graph_nodes(client, graph_prompt, conversation_text):
    """Generate nodes and edges JSON from conversation using LLM"""
    # print("Calling LLM to generate graph nodes...")
    prompt = f"Conversation: {conversation_text}\n\n{graph_prompt}"
    # print(f"Prompt sent to LLM:\n{prompt}")

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}]
        )
        output = response.choices[0].message.content.strip()
        # print(f"Raw LLM output:\n{output}")

        match = re.search(r'(\{.*\})', output, re.DOTALL)
        if match:
            try:
                graph_json = json.loads(match.group(1))
                # print(f"Parsed JSON from LLM output:\n{json.dumps(graph_json, indent=4)}")
                return graph_json
            except json.JSONDecodeError as e:
                # print(f"JSONDecodeError: {e}")
                return {"nodes": [], "edges": []}

        # print("Warning: No JSON found in LLM output.")
        return {"nodes": [], "edges": []}

    except Exception as e:
        # print(f"Error calling LLM: {e}")
        return {"nodes": [], "edges": []}

# -----------------------------
# MAIN FUNCTION
# -----------------------------
def build_knowledge_graph(transcript_text, graph_prompt, api_key, save_path=None):
    """
    Build a knowledge graph from a transcript and prompt.
    Optionally save to `save_path`.
    """
    # print("Starting knowledge graph building...")
    client = init_client(api_key)

    # print("Generating graph nodes...")
    graph_data = generate_graph_nodes(client, graph_prompt, transcript_text)
    # print(f"Graph data returned: {graph_data}")

    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        with open(save_path, "w") as f:
            json.dump(graph_data, f, indent=4)
        # print(f"Knowledge graph saved to {save_path}")

    # print("Knowledge graph building completed.")
    return graph_data
