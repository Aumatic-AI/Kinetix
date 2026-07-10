import { aiOrchestrator } from './orchestrator';

export class ImageAIService {
  async generateImage(prompt: string) {
    return aiOrchestrator.executeTask('image', prompt);
  }
}

export const imageAI = new ImageAIService();
