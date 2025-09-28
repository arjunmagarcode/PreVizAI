<div align="center">

# PreVizAI: AI-Powered Patient Intake System 🎙️   

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Cedar OS](https://img.shields.io/badge/Cedar%20OS-Voice%20AI-purple?style=for-the-badge)](https://www.ycombinator.com/companies/cedar)
[![OpenAI GPT-4](https://img.shields.io/badge/OpenAI-GPT--4-green?style=for-the-badge&logo=openai)](https://openai.com/)

🏆 **Submission Complete**

</div>

---

## 🔗 Demo Links
- **Live Demo:** [Add deployed site link here]
- **Video Walkthrough:** [Add demo video link here]
- **Presentation Slides:** [Add link to slides]

---

## ✨ Project Vision
**PreVizAI** is a modern, HIPAA-mindful healthcare web app built with **Next.js** and **Cedar OS Voice Capabilities** to transform pre-appointment patient intake.

**The Problem**  
Traditional patient intake relies on long, static forms—slow and often incomplete. Doctors spend 15+ minutes on repetitive questions, risking misdiagnosis and frustrating patients.

**Our Solution**  
PreVizAI replaces forms with a natural **voice-powered AI conversation**. Patients speak freely; the AI (powered by **OpenAI GPT-4**) asks smart follow-ups. Their answers become a structured **medical report** so doctors start appointments already informed.

---

## 🎯 Key Features & Cedar OS Integration

| Feature | Description | Cedar OS / AI Technology | Impact for Healthcare Providers |
|--------|-------------|--------------------------|----------------------------------|
| **Voice-Powered Intake** | Patients describe symptoms naturally in a clean interface. | Cedar OS (real-time Speech-to-Text & AI voice synthesis) | Captures rich, natural data and improves accessibility. |
| **AI-Generated Medical Reports** | Converts conversations into structured reports with chief complaint, history, and key insights. | OpenAI GPT-4 API | Saves clinician time and provides ready-to-use clinical insight. |
| **Doctor Dashboard** | Central hub to send intake requests and review reports. | Next.js / TypeScript | Streamlines workflow and highlights high-priority patients. |
| **Knowledge Graph Visualization (optional)** | Visual graph of symptoms, conditions, and treatments. | Neo4j Graph DB | Reveals complex clinical connections for advanced diagnostics. |
| **HIPAA-Mindful Design** | Secure handling of sensitive data. | Flask Backend + Secure Architecture | Ensures compliance and builds patient trust. |

---

## 🏗️ Application Flow: From Request to Report
1. **Doctor Action 👨‍⚕️** – Doctor sends a pre-visit intake request from the `/doctor` dashboard.  
2. **Patient Interface 📲** – Patient opens `/patient` and begins the Cedar OS-powered voice dialogue.  
3. **AI Conversation 🗣️** – Cedar OS transcribes speech; GPT-4 asks smart follow-ups (duration, severity, history, red flags).  
4. **Report Generation 📝** – Flask backend turns the transcript into a structured **Medical Report**.  
5. **Doctor Review ✅** – Doctor reviews the report before the appointment, reducing visit time and improving accuracy.

---

## 💻 Tech Stack & Architecture

| Area | Technology | Reason |
|------|-----------|-------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS | Fast, server-rendered, type-safe web app. |
| **Core UI** | Cedar OS Components, Lucide React Icons | Accessible, professional healthcare UI. |
| **Voice & AI** | Cedar OS SDK, OpenAI GPT-4 API | High-fidelity voice interaction + world-class language processing. |
| **Backend** | Flask (Python API) | Lightweight and flexible for AI/ML logic & secure data processing. |
| **Database (optional)** | Neo4j | Ideal for representing complex symptom-condition relationships. |

---

## 🚀 Quick Start & Installation

### Prerequisites
- Node.js 18+ & npm  
- Python 3.11+ & pip  
- **OpenAI API Key**  
- Git  
- Neo4j (optional for Knowledge Graph)

### 1️⃣ Clone & Install
```bash
# Clone the repository
git clone <repository-url>
cd PreVizAI   # or the folder name where you cloned the repo

# Install frontend dependencies
npm install

# (Optional) Create Python virtual environment
python3 -m venv .venv

# macOS / Linux
source .venv/bin/activate
# Windows (PowerShell)
# .venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r backend/requirements.txt
```

### 2️⃣ Configure Environment Variables
Create the following files and add your credentials.

**Frontend — `.env.local` (in the repo root):**
```ini
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

**Backend — `backend/.env`:**
```ini
OPENAI_API_KEY=your_openai_api_key_here
# Neo4j settings are optional if you are not using the Knowledge Graph
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password_here
FLASK_ENV=development
FLASK_DEBUG=True
```

> **Security note:** Never commit `.env.local` or `backend/.env`. Add them to `.gitignore`.

### 3️⃣ Run the App
Open **two terminals**.

**Backend**
```bash
cd backend
# activate virtualenv if you created one
# source .venv/bin/activate   (macOS/Linux)
python run_server.py
# Backend running at: http://localhost:5000
```

**Frontend**
```bash
# from repo root (where package.json lives)
npm run dev
# Frontend running at: http://localhost:3000
```

---

## 🎮 Usage Guide

### For Doctors
Visit: [http://localhost:3000/doctor](http://localhost:3000/doctor)  
- Send intake requests to patients.  
- Review completed reports and explore the Knowledge Graph (if enabled).

### For Patients
Visit: [http://localhost:3000/patient](http://localhost:3000/patient)  
- Click the microphone to start Cedar OS voice intake.  
- Describe symptoms naturally and answer follow-up questions.  
- Submit when finished — doctor receives the report.

---

## 📄 Medical Report Structure
The AI generates a structured document that includes:

- **Chief Complaint** – patient’s primary concern in their own words  
- **History of Present Illness (HPI)** – duration, severity, onset, context  
- **Triggers & Relieving Factors** – diagnostic clues  
- **Medical History & Medications**  
- **Red Flag Symptoms** – urgent warning signs  
- **Functional Impact** – effect on daily life  
- **Recommended Follow-up Actions** – suggested next steps  

---

## 👥 Team
- **Arjun Pun Magar** – Frontend & Cedar OS Integration  
- **[Name]** – Backend & Flask API  
- **[Name]** – AI Prompt Engineering / Medical Report Design  
- **[Name]** – Neo4j Graph Visualization  

*(Replace [Name] placeholders with actual team members.)*

---

## 🙏 Acknowledgements
Special thanks to the Cedar OS team for providing the voice SDK and support during HackGT.

---

## 📜 License
This project is licensed under the MIT License. See the LICENSE file for details.

---

<div align="center">Built with ❤️ for HackGT 2025</div>
