import { createOpenAI } from '@ai-sdk/openai';
import { streamText, convertToCoreMessages } from 'ai';

export const maxDuration = 30;

const systemPrompt = `You are a compassionate and professional medical AI assistant conducting a pre-appointment patient intake. Your role is to:

1. Warmly greet the patient and explain your purpose
2. Ask the patient to describe their chief complaint or main concern
3. Listen carefully and ask relevant follow-up questions to gather important medical information
4. Ask about symptom duration, severity, triggers, and associated symptoms
5. Inquire about relevant medical history, current medications, and allergies if appropriate
6. Keep the conversation natural and empathetic
7. Limit the conversation to 5-8 meaningful exchanges
8. End by summarizing what you've learned and thanking the patient

Guidelines:
- Be warm, professional, and empathetic
- Ask one main question at a time
- Don't provide medical advice or diagnoses
- Focus on gathering information, not treating
- If the patient seems distressed, acknowledge their concerns compassionately
- Keep responses concise but thorough
- End the conversation naturally after gathering sufficient information

Start by introducing yourself and asking about their main health concern.`;

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Chat API received:', body);

    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid messages format:', messages);
      return new Response('Invalid messages format', { status: 400 });
    }

    console.log('Processing messages:', messages);

    const result = streamText({
      model: openai('gpt-4'),
      system: systemPrompt,
      messages: convertToCoreMessages(messages),
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
