import json
import re
from neo4j import GraphDatabase
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
MAX_CONFIDENCE = 1.0
SIMILARITY_THRESHOLD = 0.85  # fuzzy merge threshold

# Priority weight for HCP-friendly sizing
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
# HELPER FUNCTIONS
# -----------------------------
def similar(a, b):
    """Return True if strings are sufficiently similar."""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio() >= SIMILARITY_THRESHOLD

def compute_node_size(importance, mention_count=0, node_type="Unknown", alias_count=0):
    """
    Compute node size based on:
      - importance (0-1)
      - mention frequency
      - type priority
      - alias count (more aliases → bigger size)
    Returns size between MIN_NODE_SIZE and MAX_NODE_SIZE.
    """
    type_priority = TYPE_PRIORITY.get(node_type, 0.5)

    # Normalize mentions and aliases relative to realistic max values
    norm_mentions = min(1.0, mention_count / 10.0)  # assume 10 mentions is a lot
    norm_aliases = min(1.0, alias_count / 5.0)      # assume 5 aliases is a lot

    # Weighted combination: importance 50%, aliases 25%, type 15%, mentions 10%
    score = 0.5 * importance + 0.25 * norm_aliases + 0.15 * type_priority + 0.10 * norm_mentions

    return MIN_NODE_SIZE + (MAX_NODE_SIZE - MIN_NODE_SIZE) * score


# -----------------------------
# MERGE / DEDUPLICATION
# -----------------------------
def merge_or_add_node(session, node, mention_counts=None):
    """
    Merge duplicate nodes using exact, alias, or fuzzy matching.
    Adjust node size based on importance, mention frequency, type priority, and alias count.
    """
    node_name = node.get("name")
    node_aliases = node.get("aliases", [])
    node_type = node.get("type", "Unknown")
    new_conf = node.get("confidence", 0.0)
    importance = node.get("importance", new_conf)

    mention_count = mention_counts.get(node_name, 0) if mention_counts else 0
    color = NODE_COLORS.get(node_type, "#cccccc")

    # Step 1: find exact, alias, or fuzzy match
    result = session.run("""
        MATCH (n:Entity)
        RETURN n.name AS existing_name, n.aliases AS existing_aliases, coalesce(n.confidence,0.0) AS existing_conf
    """)
    canonical_name = node_name
    existing_aliases = []
    existing_conf = 0.0

    for record in result:
        existing_name = record["existing_name"]
        aliases = record["existing_aliases"] or []
        conf = record["existing_conf"]

        if existing_name == node_name or node_name in aliases:
            canonical_name = existing_name
            existing_aliases = aliases
            existing_conf = conf
            break
        elif any(similar(node_name, alias) for alias in aliases) or similar(node_name, existing_name):
            canonical_name = existing_name
            existing_aliases = aliases
            existing_conf = conf
            break

    # Step 2: compute merged aliases and size
    merged_aliases = list(set(existing_aliases + node_aliases + [node_name]))
    alias_count = len(merged_aliases)
    size = compute_node_size(importance, mention_count, node_type, alias_count)

    if canonical_name != node_name:
        # merge with existing node
        combined_conf = min(MAX_CONFIDENCE, (existing_conf + new_conf) / 2)
        session.run("""
            MATCH (n:Entity {name:$canonical_name})
            SET n.aliases = $merged_aliases,
                n.confidence = $combined_conf,
                n.size = $size,
                n.color = $color,
                n.last_seen = timestamp()
        """, canonical_name=canonical_name, merged_aliases=merged_aliases, combined_conf=combined_conf, size=size, color=color)
        return canonical_name

    # Step 3: create new node
    session.run("""
        MERGE (n:Entity {name:$name})
        SET n.type = $type,
            n.color = $color,
            n.size = $size,
            n.confidence = $confidence,
            n.aliases = $aliases,
            n.last_seen = timestamp()
    """, name=node_name, type=node_type, color=color, size=size, confidence=new_conf, aliases=node_aliases)
    return node_name

# -----------------------------
# UPDATE GRAPH
# -----------------------------
def update_graph(driver, graph_data, conversation_text=None):
    """
    Update Neo4j graph: merge nodes/edges and scale node sizes by importance, mention frequency, type priority, and alias count.
    """
    mention_counts = {}
    if conversation_text:
        for node in graph_data.get("nodes", []):
            name = node.get("name")
            mention_counts[name] = conversation_text.lower().count(name.lower())

    with driver.session() as session:
        canonical_name_map = {}

        # Merge/add nodes
        for node in graph_data.get("nodes", []):
            canonical_name = merge_or_add_node(session, node, mention_counts)
            canonical_name_map[node.get("name")] = canonical_name

        # Merge/add edges
        for edge in graph_data.get("edges", []):
            from_node = canonical_name_map.get(edge.get("from_node"), edge.get("from_node"))
            to_node = canonical_name_map.get(edge.get("to_node"), edge.get("to_node"))
            edge_type = edge.get("type")
            new_conf = edge.get("confidence", 0.0)

            existing = session.run("""
                MATCH (a:Entity {name:$from_node})-[r:RELATION {type:$type}]->(b:Entity {name:$to_node})
                RETURN coalesce(r.confidence,0.0) AS existing_conf
            """, from_node=from_node, to_node=to_node, type=edge_type).single()

            existing_conf = existing["existing_conf"] if existing else 0.0
            combined_conf = min(MAX_CONFIDENCE, (existing_conf + new_conf) / 2)

            session.run("""
                MATCH (a:Entity {name:$from_node}), (b:Entity {name:$to_node})
                MERGE (a)-[r:RELATION {type:$type}]->(b)
                SET r.confidence = $combined_conf
            """, from_node=from_node, to_node=to_node, type=edge_type, combined_conf=combined_conf)
