import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const maxDuration = 30;

const reportSystemPrompt = `You are a medical AI assistant that creates structured intake reports for healthcare providers. Based on the conversation transcript between a patient and AI assistant, extract and organize the key medical information.

Create a comprehensive but concise report in the following JSON format:
{
  "chiefComplaint": "Patient's main concern in their own words",
  "symptoms": ["list", "of", "reported", "symptoms"],
  "duration": "How long symptoms have been present",
  "severity": "mild/moderate/severe based on patient description",
  "triggers": ["factors", "that", "worsen", "symptoms"],
  "relievingFactors": ["factors", "that", "help", "symptoms"],
  "associatedSymptoms": ["related", "symptoms"],
  "medicalHistory": ["relevant", "past", "medical", "history"],
  "currentMedications": ["medications", "patient", "is", "taking"],
  "allergies": ["known", "allergies"],
  "redFlags": ["concerning", "symptoms", "requiring", "immediate", "attention"],
  "functionalImpact": "How symptoms affect daily activities",
  "patientConcerns": ["specific", "worries", "expressed", "by", "patient"],
  "notes": "Additional important information from the conversation",
  "recommendedFollowUp": "Suggested next steps or areas for doctor to explore"
}

Guidelines:
- Only include information that was explicitly mentioned in the conversation
- Use "Not discussed" for sections where no information was provided
- Be objective and factual
- Highlight any red flag symptoms that need immediate attention
- Maintain patient's own language for chief complaint`;

export async function POST(req: Request) {
  try {
    const { conversation, patientInfo } = await req.json();

    if (!conversation || !Array.isArray(conversation)) {
      return new Response('Invalid conversation data', { status: 400 });
    }

    const conversationText = conversation
      .map(msg => `${msg.role === 'assistant' ? 'AI' : 'Patient'}: ${msg.content}`)
      .join('\n');

    const prompt = `Patient Information: ${patientInfo ? JSON.stringify(patientInfo) : 'No additional patient info provided'}

Conversation Transcript:
${conversationText}

Please create a structured medical intake report based on this conversation.`;

    const result = await generateText({
      model: openai('gpt-4'),
      system: reportSystemPrompt,
      prompt: prompt,
      temperature: 0.3,
    });

    try {
      const report = JSON.parse(result.text);
      return Response.json({
        success: true,
        report,
        timestamp: new Date().toISOString()
      });
    } catch (parseError) {
      // If JSON parsing fails, return the raw text
      return Response.json({
        success: true,
        report: {
          rawReport: result.text,
          note: "Report generated but not in expected JSON format"
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error generating report:', error);
    return Response.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
