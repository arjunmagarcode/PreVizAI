# patientInsights.py

import json
from neo4j import GraphDatabase
from openai import OpenAI
import os
from dotenv import load_dotenv

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
NEO4J_AUTH = ("neo4j", "Ch8ss+P1ano!")

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
    """
    Deterministic/manual annotation: merge EMR + transcript context into nodes.
    """
    for node in graph_data.get("nodes", []):
        node_name_lower = node.get("name", "").lower()
        
        # Match past conditions
        past_conditions = [
            cond for cond in emr_data.get("conditions", [])
            if node_name_lower in cond.get("name", "").lower()
        ]
        
        # Match medications
        related_meds = [
            med for med in emr_data.get("medications", [])
            if node_name_lower in med.get("name", "").lower()
        ]
        
        # Transcript mentions
        mentions = [
            turn for turn in transcript.split("\n")
            if node_name_lower in turn.lower()
        ]
        
        # Alerts from EMR
        alerts = emr_data.get("alerts", [])

        node["context"] = {
            "past_conditions": past_conditions,
            "medications": related_meds,
            "mentions": mentions,
            "alerts": alerts
        }
    return graph_data

def annotate_graph_llm(graph_data, emr_data, transcript):
    """
    Generate LLM-driven summaries for each node using deterministic context + graph connections.
    """
    with open("nodeContextSummarizationPrompt.txt", "r") as f:
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
            model="gpt-4-turbo",
            messages=[{"role": "user", "content": prompt}]
        )
        
        node["llm_summary"] = response.choices[0].message.content.strip()
    
    return graph_data

def update_graph(graph_data):
    """
    Update Neo4j graph with nodes and edges, including context annotations.
    """
    with driver.session() as session:
        # Add/update nodes
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
        
        # Add/update edges
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

def generate_insights_report_llm(graph_data, emr_data, transcript):
    """
    Generate a patient insights report for HCPs using an LLM.
    Scans all nodes, their context, EMR, and transcript, and outputs a digestible report.
    """
    # Load the prompt template
    with open("insightsReportPrompt.txt", "r") as f:
        prompt_template = f.read()
    
    # Prepare inputs
    nodes_info = [
        {
            "name": node.get("name"),
            "type": node.get("type"),
            "context": node.get("context", {}),
            "llm_summary": node.get("llm_summary", "")
        }
        for node in graph_data.get("nodes", [])
    ]
    
    # Construct the full prompt by replacing placeholders
    prompt = prompt_template.replace("{NODES}", json.dumps(nodes_info, indent=2)) \
                            .replace("{EMR_DATA}", json.dumps(emr_data, indent=2)) \
                            .replace("{TRANSCRIPT}", transcript)
    
    # LLM call to generate the final report
    response = client.chat.completions.create(
        model="gpt-4-turbo",
        messages=[{"role": "user", "content": prompt}]
    )
    
    report_text = response.choices[0].message.content.strip()
    
    # Save to file
    with open("patient_insights_report.txt", "w") as f:
        f.write(report_text)
    
    print(f"✅ LLM Insights report saved to {"patient_insights_report.txt"}")
    return report_text



# -----------------------------
# MAIN FUNCTION
# -----------------------------
def generate_patient_insights(graph_json_file, emr_json_file, transcript_txt_file):
    """
    Annotate graph manually, generate LLM node summaries, update Neo4j, and generate HCP insights report.
    """
    with open(graph_json_file, "r") as f:
        graph_data = json.load(f)
    with open(emr_json_file, "r") as f:
        emr_data = json.load(f)
    with open(transcript_txt_file, "r") as f:
        transcript = f.read()
    
    # Step 1: manual deterministic context
    annotated_graph = annotate_graph_manual(graph_data, emr_data, transcript)
    
    # Step 2: LLM node summaries
    annotated_graph = annotate_graph_llm(annotated_graph, emr_data, transcript)
    
    # Step 3: Update Neo4j
    update_graph(annotated_graph)
    
    # Step 4: LLM-driven patient insights report
    generate_insights_report_llm(annotated_graph, emr_data, transcript)
    
    return annotated_graph



# -----------------------------
# EXAMPLE USAGE
# -----------------------------
if __name__ == "__main__":
    generate_patient_insights(
        "exampleKnowledgeGraph.json",
        "exampleEMR.json",
        "exampleTranscript.txt",
    )
