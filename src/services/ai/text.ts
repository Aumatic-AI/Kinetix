import { aiOrchestrator } from './orchestrator';

export class TextAIService {
  async generateCopy(prompt: string, context?: string) {
    const fullPrompt = context ? `Context: ${context}\n\nTask: ${prompt}` : prompt;
    return aiOrchestrator.executeTask('text', fullPrompt);
  }
}

export const textAI = new TextAIService();
