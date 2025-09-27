import json
import re
from neo4j import GraphDatabase
from openai import OpenAI
import os

# -----------------------------
# CONFIGURATION (shared)
# -----------------------------
NODE_COLORS = {
    "Symptom": "#ff6666",
    "Condition": "#66b3ff",
    "Trigger": "#ffcc66",
    "Timing": "#99cc99",
    "Medication": "#9966ff"
}
BASE_SIZE = 50
IMPORTANCE_SCALE = 50  # scale factor for importance/confidence

def init_clients(api_key, neo4j_uri="bolt://localhost:7687", neo4j_auth=("neo4j", "password")):
    client = OpenAI(api_key=api_key)
    driver = GraphDatabase.driver(neo4j_uri, auth=neo4j_auth)
    return client, driver

# -----------------------------
# GRAPH FUNCTIONS
# -----------------------------
def generate_followup(client, question_prompt, conversation_text):
    prompt = f"Patient conversation so far: {conversation_text}\n\n{question_prompt}"
    response = client.chat.completions.create(
        model="gpt-4-turbo",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content.strip()


def generate_graph_nodes(client, graph_prompt, conversation_text):
    prompt = f"Conversation: {conversation_text}\n\n{graph_prompt}"
    response = client.chat.completions.create(
        model="gpt-4-turbo",
        messages=[{"role": "user", "content": prompt}]
    )
    output = response.choices[0].message.content.strip()
    match = re.search(r'(\{.*\})', output, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            print("Warning: LLM output could not be parsed as JSON.")
            return {"nodes": [], "edges": []}
    print("Warning: No JSON found in LLM output.")
    return {"nodes": [], "edges": []}


def clear_graph(driver):
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")


# -----------------------------
# MERGE / DEDUPLICATION
# -----------------------------
def merge_or_add_node(session, node):
    """
    Merge node if it already exists by exact name or alias, otherwise create new.
    Returns the canonical node name to use in edges.
    """
    node_name = node.get("name")
    node_aliases = node.get("aliases", [])
    node_type = node.get("type", "Unknown")
    confidence = node.get("confidence", 0.0)
    importance = node.get("importance", confidence)
    color = NODE_COLORS.get(node_type, "#cccccc")
    size = BASE_SIZE + IMPORTANCE_SCALE * importance

    # Step 1: Check for existing node by name or alias
    result = session.run(
        """
        MATCH (n:Entity)
        WHERE n.name = $name OR any(a IN coalesce(n.aliases, []) WHERE a = $name)
        RETURN n.name AS existing_name, n.aliases AS existing_aliases
        """,
        name=node_name
    ).single()

    if result:
        existing_name = result["existing_name"]
        # Merge new aliases
        merged_aliases = list(set(result["existing_aliases"] or [] + node_aliases + [node_name]))
        session.run(
            """
            MATCH (n:Entity {name:$existing_name})
            SET n.aliases = $merged_aliases,
                n.confidence = coalesce(n.confidence,0.0) + $confidence,
                n.size = $size,
                n.color = $color,
                n.last_seen = timestamp()
            """,
            existing_name=existing_name,
            merged_aliases=merged_aliases,
            confidence=confidence,
            size=size,
            color=color
        )
        return existing_name

    # Step 2: If not found, create new node
    session.run(
        """
        MERGE (n:Entity {name:$name})
        SET n.type = $type,
            n.color = $color,
            n.size = $size,
            n.confidence = $confidence,
            n.aliases = $aliases,
            n.last_seen = timestamp()
        """,
        name=node_name,
        type=node_type,
        color=color,
        size=size,
        confidence=confidence,
        aliases=node_aliases
    )
    return node_name

CONFIDENCE_THRESHOLD = 0.1  # ignore nodes/edges below this confidence
MAX_CONFIDENCE = 1.0        # cap confidence to this value

def merge_or_add_node(session, node):
    node_name = node.get("name")
    node_aliases = node.get("aliases", [])
    node_type = node.get("type", "Unknown")
    new_conf = node.get("confidence", 0.0)
    importance = node.get("importance", new_conf)
    color = NODE_COLORS.get(node_type, "#cccccc")
    size = BASE_SIZE + IMPORTANCE_SCALE * importance

    # Check for existing node by name or alias
    result = session.run(
        """
        MATCH (n:Entity)
        WHERE n.name = $name OR any(a IN coalesce(n.aliases, []) WHERE a = $name)
        RETURN n.name AS existing_name, n.aliases AS existing_aliases, coalesce(n.confidence,0.0) AS existing_conf
        """,
        name=node_name
    ).single()

    if result:
        existing_name = result["existing_name"]
        merged_aliases = list(set(result["existing_aliases"] or [] + node_aliases + [node_name]))

        # Weighted average confidence
        existing_conf = result["existing_conf"]
        combined_conf = min(MAX_CONFIDENCE, (existing_conf + new_conf) / 2)

        session.run(
            """
            MATCH (n:Entity {name:$existing_name})
            SET n.aliases = $merged_aliases,
                n.confidence = $combined_conf,
                n.size = $size,
                n.color = $color,
                n.last_seen = timestamp()
            """,
            existing_name=existing_name,
            merged_aliases=merged_aliases,
            combined_conf=combined_conf,
            size=size,
            color=color
        )
        return existing_name

    # Create new node if not found
    session.run(
        """
        MERGE (n:Entity {name:$name})
        SET n.type = $type,
            n.color = $color,
            n.size = $size,
            n.confidence = $confidence,
            n.aliases = $aliases,
            n.last_seen = timestamp()
        """,
        name=node_name,
        type=node_type,
        color=color,
        size=size,
        confidence=new_conf,
        aliases=node_aliases
    )
    return node_name

def update_graph(driver, graph_data):
    with driver.session() as session:
        canonical_name_map = {}

        # Merge/add nodes first
        for node in graph_data.get("nodes", []):
            if node.get("confidence",0.0) < CONFIDENCE_THRESHOLD:
                continue
            canonical_name = merge_or_add_node(session, node)
            canonical_name_map[node.get("name")] = canonical_name

        # Add edges using weighted confidence
        for edge in graph_data.get("edges", []):
            from_node = canonical_name_map.get(edge.get("from_node"), edge.get("from_node"))
            to_node = canonical_name_map.get(edge.get("to_node"), edge.get("to_node"))
            edge_type = edge.get("type")
            new_conf = edge.get("confidence", 0.0)

            if new_conf < CONFIDENCE_THRESHOLD:
                continue

            # Get existing confidence for edge
            existing = session.run(
                """
                MATCH (a:Entity {name:$from_node})-[r:RELATION {type:$type}]->(b:Entity {name:$to_node})
                RETURN coalesce(r.confidence,0.0) AS existing_conf
                """,
                from_node=from_node,
                to_node=to_node,
                type=edge_type
            ).single()

            existing_conf = existing["existing_conf"] if existing else 0.0
            combined_conf = min(MAX_CONFIDENCE, (existing_conf + new_conf) / 2)

            session.run(
                """
                MATCH (a:Entity {name:$from_node}), (b:Entity {name:$to_node})
                MERGE (a)-[r:RELATION {type:$type}]->(b)
                SET r.confidence = $combined_conf
                """,
                from_node=from_node,
                to_node=to_node,
                type=edge_type,
                combined_conf=combined_conf
            )
