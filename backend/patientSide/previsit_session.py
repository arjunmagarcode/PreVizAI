import os
from dotenv import load_dotenv
from patient_graph_utils import init_clients, generate_followup, generate_graph_nodes, clear_graph, update_graph

# -----------------------------
# LOAD ENVIRONMENT VARIABLES
# -----------------------------
load_dotenv()

# -----------------------------
# PATHS (relative to this script)
# -----------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LLM_PROMPTS_DIR = os.path.join(BASE_DIR, "patientSide_LLM_Prompts")
QUESTION_PROMPT_PATH = os.path.join(LLM_PROMPTS_DIR, "questionPrompting.txt")
GRAPH_PROMPT_PATH = os.path.join(LLM_PROMPTS_DIR, "knowledgeGraphPrompt.txt")

with open(QUESTION_PROMPT_PATH, "r") as f:
    question_prompt = f.read()

with open(GRAPH_PROMPT_PATH, "r") as f:
    graph_prompt = f.read()

# -----------------------------
# INITIALIZE CLIENTS
# -----------------------------
api_key = os.getenv("OPENAI_API_KEY")
client, driver = init_clients(api_key, neo4j_auth=("neo4j", "Ch8ss+P1ano!"))

conversation_history = []
patient_graph_data = {"nodes": [], "edges": []}

# -----------------------------
# MAIN LOOP
# -----------------------------
def patient_session(max_cycles=3):
    clear_graph(driver)
    global conversation_history, patient_graph_data

    cycles = 0
    patient_name = input("Hello! What is your name? ")
    initial_input = input(f"Hello {patient_name}, what brings you in today? ")
    conversation_history.append(f"Patient: {initial_input}")
    patient_graph_data = {"nodes": [], "edges": []}

    while cycles < max_cycles:
        print("\nConversation so far:")
        for turn in conversation_history:
            print(turn)

        context_text = "\n".join(conversation_history)
        followup_question = generate_followup(client, question_prompt, context_text)

        if "NO_MORE_QUESTIONS" in followup_question:
            print("\nLLM indicates no further questions.")
            break

        print("\nFollow-up Question:\n", followup_question)
        conversation_history.append(f"System: {followup_question}")

        patient_input = input("\nPatient Response: ")
        conversation_history.append(f"Patient: {patient_input}")

        full_conversation = "\n".join(conversation_history)
        graph_data = generate_graph_nodes(client, graph_prompt, full_conversation)

        if graph_data.get("nodes") or graph_data.get("edges"):
            patient_graph_data["nodes"].extend(graph_data.get("nodes", []))
            patient_graph_data["edges"].extend(graph_data.get("edges", []))
            print("Updating Neo4j with graph data...")
            update_graph(driver, graph_data)
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


'''
Example Conversation:

Hi, I’ve been having a persistent headache for the past week, and sometimes I feel nauseous in the mornings.

The headaches usually start in the early morning and last for several hours. They’re a dull, throbbing pain most  of the time, but occasionally get sharper around my temples. The nausea tends to appear at the same time as the headaches,  and sometimes I feel slightly dizzy as well. The intensity of the headache can be mild to moderate on most days, but a few times it’s been strong enough that I have to lie down until it passes.

2. Yes, I’ve noticed that my headaches get worse when I skip meals or spend a long time in front of a bright computer screen. Also, strong smells like perfumes or smoke sometimes make the nausea worse."

3. "Yes, I’ve tried taking over-the-counter pain relievers like ibuprofen, and they help a little, but the relief doesn’t last very long. I also tried drinking more water and resting, which sometimes helps slightly, but the headaches keep coming back."

4. “It’s a pretty intense pain, around a 7 or 8 out of 10. It mostly sits on both sides of my temples and sometimes spreads to the back of my head. It feels like a constant throbbing, and sometimes it gets sharp if I move quickly or look at bright lights.”

"Actually, my daily routine has changed a bit recently. I’ve been working longer hours at my computer and haven’t been sleeping as well. My stress levels have also increased because of upcoming deadlines at work, and I think this might be contributing to the headaches and nausea."

"When the headaches and nausea hit, I usually try to rest in a dark, quiet room and drink water. I sometimes take ibuprofen, which helps a little, and avoid screens or bright lights. Eating a small snack can also help a bit if I’ve skipped meals. Other than that, I haven’t found anything that fully relieves the symptoms."

I’ve also noticed that when I’m really stressed or haven’t slept enough, the headaches and nausea seem to come on more quickly and feel more intense."

"Yes, sometimes during the headaches I notice a bit of blurry vision and it feels harder to focus my eyes. I’ve also felt slightly off-balance a couple of times, almost like a lightheaded or dizzy feeling, especially when I stand up quickly."

MATCH (n)-[r]->(m)
RETURN n, r, m
'''