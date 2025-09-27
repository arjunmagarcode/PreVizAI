# reviseKnowledgeGraph.py
import json
from neo4j import GraphDatabase
from openai import OpenAI
import os
from dotenv import load_dotenv

# -----------------------------
# PATH CONFIGURATION
# -----------------------------
LLM_PROMPTS_DIR = "LLM_Prompts"
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

driver = GraphDatabase.driver(NEO4J_URI, auth=NEO4J_AUTH)

# -----------------------------
# HELPER FUNCTIONS
# -----------------------------
def annotate_graph_manual(graph_data, emr_data, transcript):
    """Merge EMR + transcript context into nodes deterministically."""
    for node in graph_data.get("nodes", []):
        node_name_lower = node.get("name", "").lower()
        past_conditions = [
            cond for cond in emr_data.get("conditions", [])
            if node_name_lower in cond.get("name", "").lower()
        ]
        related_meds = [
            med for med in emr_data.get("medications", [])
            if node_name_lower in med.get("name", "").lower()
        ]
        mentions = [
            turn for turn in transcript.split("\n")
            if node_name_lower in turn.lower()
        ]
        alerts = emr_data.get("alerts", [])

        node["context"] = {
            "past_conditions": past_conditions,
            "medications": related_meds,
            "mentions": mentions,
            "alerts": alerts
        }
    return graph_data


def annotate_graph_llm(graph_data, emr_data, transcript):
    """Generate LLM-driven summaries for each node."""
    with open(NODE_CONTEXT_PROMPT_PATH, "r") as f:
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
    with driver.session() as session:
        for node in graph_data.get("nodes", []):
            node_type = node.get("type", "Unknown")
            importance = node.get("importance", node.get("confidence", 0.0))
            node_color = NODE_COLORS.get(node_type, "#cccccc")
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
            "color": NODE_COLORS.get(node.get("type"), "#cccccc"),
            "context": node.get("context", {}),
            "llm_summary": node.get("llm_summary", "")
        })

    with open(output_path, "w") as f:
        json.dump(frontend_graph, f, indent=2)


def revise_knowledge_graph(graph_json_file, emr_json_file, transcript_txt_file, frontend_output=None):
    """Full pipeline to revise knowledge graph with manual and LLM context."""
    with open(graph_json_file, "r") as f:
        graph_data = json.load(f)
    with open(emr_json_file, "r") as f:
        emr_data = json.load(f)
    with open(transcript_txt_file, "r") as f:
        transcript = f.read()

    annotated_graph = annotate_graph_manual(graph_data, emr_data, transcript)
    annotated_graph = annotate_graph_llm(annotated_graph, emr_data, transcript)
    update_graph(annotated_graph)

    if frontend_output:
        export_frontend_json(annotated_graph, frontend_output)

    return annotated_graph
