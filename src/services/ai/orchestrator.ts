import { OpenAIService } from './providers/openai';
import { GeminiService } from './providers/gemini';
import { ElevenLabsService } from './providers/elevenlabs';
import { KieService } from './providers/kie';

export type TextProvider = 'openai' | 'gemini';
export type TaskType = 'text' | 'analysis';

/**
 * Single entry point for every AI call in the app — no feature code should
 * import a provider service directly. Kie is the only image/video provider
 * in use, and its real workflow is async (create a task, poll for its
 * result), so those methods mirror KieService's own shape rather than
 * forcing a one-shot call — that's what lets Inngest jobs use step.sleep
 * between polls instead of one long blocking call.
 */
export class AIOrchestrator {
  async executeTask(taskType: TaskType, prompt: string, provider: TextProvider = 'openai', options?: { systemPrompt?: string }): Promise<string> {
    if (provider === 'gemini') return GeminiService.generateTextPro(prompt);
    return OpenAIService.generateText(prompt, options?.systemPrompt);
  }

  createImageTask(prompt: string, imageSize?: "9:16" | "4:5" | "16:9" | "1:1", referenceImageUrl?: string) {
    return KieService.createImageTask(prompt, imageSize, referenceImageUrl);
  }

  createVideoTask(prompt: string, imageUrls: string[], aspectRatio?: string, duration?: string) {
    return KieService.createVideoTask(prompt, imageUrls, aspectRatio, duration);
  }

  checkTaskStatus(jobId: string) {
    return KieService.checkSingleTaskStatus(jobId);
  }

  generateSpeech(text: string, voiceId?: string) {
    return ElevenLabsService.generateSpeech(text, voiceId);
  }
}

export const aiOrchestrator = new AIOrchestrator();
