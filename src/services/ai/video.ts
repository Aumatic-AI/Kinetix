import { aiOrchestrator } from './orchestrator';

export class VideoAIService {
  async generateVideo(prompt: string) {
    return aiOrchestrator.executeTask('video', prompt);
  }
}

export const videoAI = new VideoAIService();
