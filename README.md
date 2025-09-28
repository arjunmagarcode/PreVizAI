# PreViz - AI-Powered Patient Intake System

A modern healthcare web application built with Next.js and Cedar OS for HackGT's Cedar OS sponsor track. This application streamlines pre-appointment patient intake through voice-powered AI conversations, allowing patients to describe their symptoms naturally and providing doctors with comprehensive intake reports.

## 🎯 Features

- **Voice-Powered Patient Intake**: Natural conversation with AI using Cedar OS voice capabilities
- **Doctor Dashboard**: Manage patients, send intake requests, and review reports
- **AI-Generated Medical Reports**: Structured summaries of patient conversations with key insights and suggested next-steps.
- **Knowledge Graph Visualization**: A graphical visualization of patients' symptoms, treatments, and condition using nodes.
- **Professional Healthcare UI**: Clean, accessible design following medical UI best practices
- **HIPAA-Mindful Data Handling**: Secure conversation storage and processing

## 🏗️ Application Flow

1. **Doctor Dashboard**: Doctor sends pre-appointment AI intake request to patient
2. **Patient Interface**: Patient receives notification and starts voice conversation with AI
3. **AI Conversation**: Natural dialogue where AI asks follow-up questions about symptoms
4. **Report Generation**: Conversation is processed into structured medical report
5. **Doctor Review**: Doctor receives notification and can view comprehensive patient report

## 🚀 Quick Start & Installation

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- OpenAI API key
- Neo4j Database (optional, for advanced knowledge graph features)

### Installation Steps

1. **Install frontend dependencies:**
   ```bash
   npm install
   ```

2. **Python backend is already configured with virtual environment**
   - All Python dependencies are installed: Flask, OpenAI, Neo4j driver, etc.
   - Virtual environment is located at `.venv/`

3. **Configure environment variables:**

   **Frontend (.env.local):**
   ```env
   NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
   NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
   ```

   **Backend (backend/.env):**
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your_neo4j_password_here
   FLASK_ENV=development
   FLASK_DEBUG=True
   ```

### Running the Application

1. **Start the backend server:**
   ```bash
   cd backend
   python run_server.py
   ```
   Backend available at: `http://localhost:5000`

2. **Start the frontend (in a new terminal):**
   ```bash
   npm run dev
   ```
   Frontend available at: `http://localhost:3000`

## 🔧 Architecture & Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Cedar OS
- **Backend**: Flask Python API with AI processing
- **Voice**: Cedar OS with OpenAI GPT-4 integration
- **Database**: Neo4j (optional for knowledge graphs)
- **AI**: OpenAI API for conversation processing and report generation

## 🚀 Technology Stack

- **Next.js 15** with App Router and TypeScript
- **Cedar OS** for voice integration and AI conversations
- **OpenAI GPT-4** for conversation processing and report generation
- **Tailwind CSS** for responsive styling
- **Lucide React** for professional icons

## 📋 Prerequisites

- Python 3.11+ and pip
- Virtual environment tool (recommended: `venv`)
- Node.js 18+ 
- npm or yarn
- OpenAI API key
- Neo4j Desktop or Neo4j Aura account
- Git (for cloning the repository)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd previz
   ```
2. **Install backend Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```
3. **Install frontend Node.js dependencies**
   ```bash
   npm install
   ```
4. **Set up environment variables**
   Create a .env.local file in the root directory
   ```bash
   NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
   ```
5. **Run the development server**
   ```bash
   npm run dev
   ```
6. **Open your browser**
  Navigate to https://localhost:3000

## 🎮 Usage

### For Doctors:
1. Visit `/doctor` to access the dashboard
2. View upcoming appointments and patient statuses
3. Send intake requests to patients who need pre-appointment screening
4. Review completed intake reports with structured medical information

### For Patients:
1. Visit `/patient` to start the intake process
2. Click the microphone button to begin voice conversation
3. Describe your main health concerns naturally
4. Answer follow-up questions from the AI assistant
5. Complete and submit your intake when finished

## 🏥 Medical Report Structure

The AI generates structured reports including:
- Chief complaint in patient's own words
- Symptoms, duration, and severity
- Triggers and relieving factors
- Medical history and current medications
- Red flag symptoms requiring immediate attention
- Functional impact on daily activities
- Recommended follow-up actions

## 🔧 Cedar OS Integration

This application leverages Cedar OS for:
- Voice permission management
- Real-time speech-to-text conversion
- AI voice synthesis for responses
- Message store management
- Seamless conversation flow

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/          # OpenAI conversation endpoint
│   │   └── generate-report/ # Report generation endpoint
│   ├── doctor/            # Doctor dashboard
│   ├── patient/           # Patient intake interface
│   └── page.tsx           # Homepage with navigation
├── components/
│   └── providers.tsx      # Cedar OS provider configuration
```

## 🔒 Security & Privacy

- Voice data is processed securely through Cedar OS
- Conversations are stored temporarily for report generation
- Medical data handling follows HIPAA-mindful practices
- API endpoints include proper error handling and validation

## 🚧 Development

This project was built for HackGT 2025 as part of the Cedar OS sponsor track. It demonstrates the power of voice-enabled AI in healthcare applications.

### Key Development Features:
- TypeScript for type safety
- Responsive design for all device types
- Error handling for voice permissions
- Professional medical UI components
- Real-time conversation display

## 📄 License

This project is part of HackGT 2025 submission for the Cedar OS sponsor track.

## 🤝 Contributing

Built with ❤️ for HackGT 2025 using Cedar OS technology.

---

**Note**: Remember to add your OpenAI API key to the `.env.local` file for the application to function properly.
