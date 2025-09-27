<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# PreViz - Patient Intake Application Instructions

## Project Overview
This is a healthcare web application built with Next.js and TypeScript that uses Cedar OS for voice-powered patient intake. The application facilitates pre-appointment conversations between patients and AI assistants, with doctors receiving summarized reports.

## Key Technologies
- **Next.js 15** with App Router and TypeScript
- **Cedar OS** for voice integration and AI conversations
- **OpenAI GPT-4** for conversation processing and report generation
- **Tailwind CSS** for styling
- **Lucide React** for icons

## Architecture Patterns
- Use React Server Components where possible
- Implement client components only when needed (voice, state management)  
- Follow Next.js App Router conventions
- Use TypeScript for type safety

## Cedar OS Integration
- Always use `useCedarStore` to access conversation messages
- Use `useVoice` hook for voice controls and state
- Configure Cedar provider in `providers.tsx` with OpenAI settings
- Voice endpoint should point to `/api/chat`
Cedar latest documentation link: https://docs.cedarcopilot.com/introduction/overview
Cedar voice integration documentation link: https://docs.cedarcopilot.com/voice/voice-integration
cedar voice components documentation link: https://docs.cedarcopilot.com/voice/components


## API Routes
- `/api/chat` - Handles streaming conversations with OpenAI
- `/api/generate-report` - Processes conversation transcripts into medical reports

## Code Style
- Use functional components with hooks
- Implement proper error handling for voice permissions
- Use Tailwind utility classes for styling
- Follow healthcare UI/UX best practices (accessible, professional)

## Medical Data Handling
- Structure medical reports as JSON with standard fields
- Include red flags detection for urgent symptoms
- Maintain HIPAA-mindful data practices
- Use professional medical terminology

## Environment Variables
- `NEXT_PUBLIC_OPENAI_API_KEY` - OpenAI API key for Cedar OS integration
