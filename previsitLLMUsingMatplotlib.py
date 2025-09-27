import json
import re
from neo4j import GraphDatabase
from openai import OpenAI
import networkx as nx
import matplotlib.pyplot as plt


# -----------------------------
# CONFIGURATION
# -----------------------------
client = OpenAI(api_key="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")
driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "Ch8ss+P1ano!"))

conversation_history = []
patient_graph_data = {"nodes": [], "edges": []}

# -----------------------------
# NODE COLOR & SIZE CONFIG
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

# -----------------------------
# HELPER FUNCTIONS
# -----------------------------
with open("questionPrompting.txt", 'r') as file:
    questionPrompt = file.read()

with open("knowledgeGraphPrompt.txt", 'r') as file:
    graphPrompt = file.read()

def generate_followup(conversation_text):
    prompt = f"""
Patient conversation so far: {conversation_text}

{questionPrompt}
"""
    response = client.chat.completions.create(
        model="gpt-4-turbo",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content.strip()

def generate_graph_nodes(conversation_text):
    prompt = f"""
Conversation: {conversation_text}

{graphPrompt}
"""
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
    else:
        print("Warning: No JSON found in LLM output.")
        return {"nodes": [], "edges": []}

def clear_graph():
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")

def visualize_patient_graph():
    if not patient_graph_data.get("nodes"):
        print("No graph data to visualize.")
        return

    G = nx.DiGraph()

    # Add nodes with color and size
    for node in patient_graph_data.get("nodes", []):
        G.add_node(
            node["name"],
            color=node.get("color", "#cccccc"),
            size=node.get("size", 50)
        )

    # Add edges
    for edge in patient_graph_data.get("edges", []):
        G.add_edge(edge["from_node"], edge["to_node"], label=edge.get("type", ""))

    colors = [G.nodes[n]["color"] for n in G.nodes]
    sizes = [G.nodes[n]["size"] for n in G.nodes]

    pos = nx.spring_layout(G, seed=42)
    nx.draw(
        G,
        pos,
        node_color=colors,
        node_size=sizes,
        with_labels=True,
        arrows=True,
        font_size=10
    )

    # Draw edge labels
    edge_labels = {(e[0], e[1]): G.edges[e]["label"] for e in G.edges}
    nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels, font_color="black", font_size=8)

    plt.show()


def update_graph(graph_data):
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

# -----------------------------
# MAIN LOOP
# -----------------------------
def patient_session(max_cycles=3):
    clear_graph()

    cycles = 0
    patient_name = input("Hello! What is your name? ")
    initial_input = input(f"Hello {patient_name}, what brings you in today? ")
    conversation_history.append(f"Patient: {initial_input}")

    global patient_graph_data
    patient_graph_data = {"nodes": [], "edges": []}

    while cycles < max_cycles:
        print("\nConversation so far:")
        for turn in conversation_history:
            print(turn)

        context_text = "\n".join(conversation_history)
        followup_question = generate_followup(context_text)

        if "NO_MORE_QUESTIONS" in followup_question:
            print("\nLLM indicates no further questions.")
            break
        
        print("\nFollow-up Question:\n", followup_question)
        conversation_history.append(f"System: {followup_question}")

        patient_input = input("\nPatient Response: ")
        conversation_history.append(f"Patient: {patient_input}")

        full_conversation = "\n".join(conversation_history)
        graph_data = generate_graph_nodes(full_conversation)

        if graph_data.get("nodes") or graph_data.get("edges"):
            patient_graph_data["nodes"].extend(graph_data.get("nodes", []))
            patient_graph_data["edges"].extend(graph_data.get("edges", []))
            print("Updating Neo4j with graph data:", json.dumps(graph_data, indent=2))
            update_graph(graph_data)
            conversation_history.append("System updated graph with new nodes/edges.")
        else:
            print("⚠️ No new graph data extracted this cycle.")

        cycles += 1  

    print("\nThank you for completing the pre-visit form. Reach out if you need anything, and we look forward to meeting with you.")

    visualize_patient_graph()

# -----------------------------
# RUN SESSION
# -----------------------------
if __name__ == "__main__":
    patient_session(max_cycles=3)


'''
Hi, I’ve been having a persistent headache for the past week, and sometimes I feel nauseous in the mornings.
'''

'''
The headaches usually start in the early morning and last for several hours. They’re a dull, throbbing pain most  of the time, but occasionally get sharper around my temples. The nausea tends to appear at the same time as the headaches,  and sometimes I feel slightly dizzy as well. The intensity of the headache can be mild to moderate on most days, but a few times it’s been strong enough that I have to lie down until it passes.
'''

'''
2. Yes, I’ve noticed that my headaches get worse when I skip meals or spend a long time in front of a bright computer screen. Also, strong smells like perfumes or smoke sometimes make the nausea worse."
'''

'''
3. "Yes, I’ve tried taking over-the-counter pain relievers like ibuprofen, and they help a little, but the relief doesn’t last very long. I also tried drinking more water and resting, which sometimes helps slightly, but the headaches keep coming back."
'''

'''
4. “It’s a pretty intense pain, around a 7 or 8 out of 10. It mostly sits on both sides of my temples and sometimes spreads to the back of my head. It feels like a constant throbbing, and sometimes it gets sharp if I move quickly or look at bright lights.”
'''