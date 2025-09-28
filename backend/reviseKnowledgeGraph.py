# backend/reviseKnowledgeGraph.py
import json
try:
    from neo4j import GraphDatabase
except ImportError:
    # Neo4j driver not available
    GraphDatabase = None
from openai import OpenAI
import os
from dotenv import load_dotenv
# -----------------------------
# PATH CONFIGURATION
# -----------------------------
BASE_DIR = os.path.dirname(__file__)
LLM_PROMPTS_DIR = os.path.join(BASE_DIR, "LLM_Prompts")
NODE_CONTEXT_PROMPT_PATH = os.path.join(LLM_PROMPTS_DIR, "nodeContextSummarizationPrompt.txt")
# -----------------------------
# LLM CONFIGURATION
# -----------------------------
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)
# -----------------------------
# GRAPH CONFIGURATION
# -----------------------------
NEO4J_URI = "bolt://localhost:7687"
NEO4J_AUTH = ("neo4j", os.getenv("NEO4J_PASSWORD"))
NODE_COLORS = {
    "Symptom": "#007BFF",
    "Condition": "#D9534F",
    "Trigger": "#F0AD4E",
    "Cause": "#F0AD4E",
    "Medication": "#5CB85C"
}
BASE_SIZE = 50
IMPORTANCE_SCALE = 50
# Try to connect to Neo4j, but make it optional
try:
    if GraphDatabase is None:
        raise ImportError("Neo4j driver not available")
    driver = GraphDatabase.driver(NEO4J_URI, auth=NEO4J_AUTH)
    # Test the connection
    with driver.session() as session:
        session.run("RETURN 1")
    NEO4J_AVAILABLE = True
    # Neo4j connection established
    pass
except Exception as e:
    driver = None
    NEO4J_AVAILABLE = False
    # Neo4j not available, continuing without database
    pass
# -----------------------------
# HELPER FUNCTIONS
# -----------------------------
def annotate_graph_llm(graph_data, emr_data, transcript):
    """Generate LLM-driven summaries for each node."""
    with open(NODE_CONTEXT_PROMPT_PATH, "r", encoding="utf-8") as f:
        prompt_template = f.read()
    for node in graph_data.get("nodes", []):
        context = node.get("context", {})
        connected_nodes = [
            edge["to_node"] for edge in graph_data.get("edges", [])
            if edge["from_node"] == node["name"]
        ]
        prompt = prompt_template.replace("{NODE_NAME}", node["name"]) \
                                .replace("{NODE_TYPE}", node.get("type", "Unknown")) \
                                .replace("{NODE_CONTEXT}", json.dumps(context, indent=2)) \
                                .replace("{CONNECTED_NODES}", json.dumps(connected_nodes, indent=2)) \
                                .replace("{EMR_DATA}", json.dumps(emr_data, indent=2)) \
                                .replace("{TRANSCRIPT}", transcript)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}]
        )
        node["llm_summary"] = response.choices[0].message.content.strip()
    return graph_data
def update_graph(graph_data):
    """Update Neo4j graph with nodes and edges."""
    if not NEO4J_AVAILABLE or driver is None:
        # Skipping Neo4j update (database not available)
        return
    with driver.session() as session:
        for node in graph_data.get("nodes", []):
            node_type = node.get("type", "Unknown")
            importance = node.get("importance", node.get("confidence", 0.0))
            node_color = NODE_COLORS.get(node_type, "#CCCCCC")
            node_size = BASE_SIZE + IMPORTANCE_SCALE * importance
            session.run(
                """
                MERGE (n:Entity {name:$name})
                SET n.type = $type,
                    n.color = $color,
                    n.size = $size,
                    n.confidence = coalesce(n.confidence, 0.0) + $confidence,
                    n.notes = $notes,
                    n.context = $context,
                    n.llm_summary = $llm_summary,
                    n.last_seen = timestamp()
                WITH n, $aliases AS new_aliases
                UNWIND coalesce(new_aliases, []) AS a
                WITH n, collect(DISTINCT a) AS alias_list, coalesce(n.aliases, []) AS existing
                WITH n, alias_list + existing AS merged
                UNWIND merged AS m
                WITH n, collect(DISTINCT m) AS final_aliases
                SET n.aliases = final_aliases
                """,
                name=node.get("name"),
                type=node_type,
                color=node_color,
                size=node_size,
                confidence=node.get("confidence", 0.0),
                notes=node.get("notes", ""),
                context=json.dumps(node.get("context", {})),
                llm_summary=node.get("llm_summary", ""),
                aliases=node.get("aliases", [])
            )
        for edge in graph_data.get("edges", []):
            session.run(
                """
                MATCH (a:Entity {name:$from_node}), (b:Entity {name:$to_node})
                MERGE (a)-[r:RELATION {type:$type}]->(b)
                SET r.confidence = coalesce(r.confidence,0.0) + $confidence
                """,
                from_node=edge.get("from_node"),
                to_node=edge.get("to_node"),
                type=edge.get("type"),
                confidence=edge.get("confidence", 0.0)
            )
def export_frontend_json(graph_data, output_path):
    """Export frontend-ready JSON including context and llm_summary."""
    frontend_graph = {
        "nodes": [],
        "edges": graph_data.get("edges", [])
    }
    for node in graph_data.get("nodes", []):
        frontend_graph["nodes"].append({
            "id": node.get("name"),
            "type": node.get("type"),
            "size": node.get("size", BASE_SIZE),
            "color": NODE_COLORS.get(node.get("type"), "#CCCCCC"),
            "context": node.get("context", {}),
            "llm_summary": node.get("llm_summary", "")
        })
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(frontend_graph, f, indent=2, ensure_ascii=False)
# New flexible loaders to support file paths, JSON objects/strings, and raw text
def _load_json_input(value, label):
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, (str, os.PathLike)):
        path_str = str(value)
        if os.path.exists(path_str):
            with open(path_str, "r") as f:
                return json.load(f)
        try:
            return json.loads(path_str)
        except Exception as e:
            raise TypeError(f"{label} must be a path to a JSON file or a JSON object/string. Got: {type(value).__name__}") from e
    raise TypeError(f"{label} must be a path to a JSON file or a JSON object/string. Got: {type(value).__name__}")
def _load_text_input(value, label):
    if isinstance(value, str):
        if os.path.exists(value):
            with open(value, "r") as f:
                return f.read()
        return value
    raise TypeError(f"{label} must be a path to a text file or a string. Got: {type(value).__name__}")
def revise_knowledge_graph(graph_json_file, emr_json_file, transcript_txt_file, frontend_output=None):
    """Full pipeline to revise knowledge graph with manual and LLM context.
    Accepts either file paths or in-memory data:
    - graph_json_file: path to JSON file, JSON dict/list, or JSON string
    - emr_json_file: path to JSON file, JSON dict/list, or JSON string
    - transcript_txt_file: path to text file or raw transcript string
    - frontend_output: optional path to write a frontend-ready JSON
    """
    graph_data = _load_json_input(graph_json_file, "graph_json_file")
    emr_data = _load_json_input(emr_json_file, "emr_json_file")
    transcript = _load_text_input(transcript_txt_file, "transcript_txt_file")
    annotated_graph = annotate_graph_llm(graph_data, emr_data, transcript)
    update_graph(annotated_graph)
    if frontend_output:
        export_frontend_json(annotated_graph, frontend_output)
    return annotated_graph
