import json
import re
from neo4j import GraphDatabase
from openai import OpenAI

# -----------------------------
# CONFIGURATION
# -----------------------------
client = OpenAI(api_key="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")
driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "Ch8ss+P1ano!"))

# Initialize conversation and graph data
conversation_history = []
patient_graph_data = {"nodes": [], "edges": []}

# -----------------------------
# HELPER FUNCTIONS
# -----------------------------
with open("questionPrompting.txt", 'r') as file:
    questionPrompt = file.read()

with open("knowledgeGraphPrompt.txt", 'r') as file:
    graphPrompt = file.read()

# LLM1: Generate follow-up questions
def generate_followup(conversation_text):
    prompt = f"""
Patient conversation so far: {conversation_text}

{questionPrompt}
"""
    response = client.chat.completions.create(
        model="gpt-4-turbo",
        messages=[{"role": "user", "content": prompt}]
    )
    followup_text = response.choices[0].message.content.strip()
    return followup_text

# LLM2: Extract graph nodes and edges
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
            graph_data = json.loads(match.group(1))
            return graph_data
        except json.JSONDecodeError:
            print("Warning: LLM output could not be parsed as JSON.")
            return {"nodes": [], "edges": []}
    else:
        print("Warning: No JSON found in LLM output.")
        return {"nodes": [], "edges": []}

# Clear graph before each new run
def clear_graph():
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")

# Update Neo4j graph
# Example Py2 code snippets (use in your update_graph)
def update_graph(graph_data):
    with driver.session() as session:
        for node in graph_data.get("nodes", []):
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
                type=node.get("type"),
                color=node.get("color"),
                size=node.get("size"),
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
    clear_graph()  # <-- clears Neo4j at the start of each run

    cycles = 0
    patient_name = input("Hello! What is your name? ")
    initial_input = input(f"Hello {patient_name}, what brings you in today? ")
    conversation_history.append(f"Patient: {initial_input}")

    global patient_graph_data
    patient_graph_data = {"nodes": [], "edges": []}  # reset before each run

    while cycles < max_cycles:
        print("\nConversation so far:")
        for turn in conversation_history:
            print(turn)

        # Step 1: Generate follow-up question
        context_text = "\n".join(conversation_history)
        followup_question = generate_followup(context_text)

        if "NO_MORE_QUESTIONS" in followup_question:
            print("\nLLM indicates no further questions.")
            break
        
        print("\nFollow-up Question:\n", followup_question)
        conversation_history.append(f"System: {followup_question}")

        # Step 2: Patient answers
        patient_input = input("\nPatient Response: ")
        conversation_history.append(f"Patient: {patient_input}")

        # Step 3: Generate new graph data
        full_conversation = "\n".join(conversation_history)
        graph_data = generate_graph_nodes(full_conversation)

        # Merge with persistent patient_graph_data
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


# -----------------------------
# RUN SESSION
# -----------------------------
if __name__ == "__main__":
    patient_session(max_cycles=3)
