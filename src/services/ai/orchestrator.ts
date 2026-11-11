import { OpenAIService } from './providers/openai';
import { GeminiService } from './providers/gemini';
import { ElevenLabsService } from './providers/elevenlabs';
import { KieService } from './providers/kie';
import { KieSeedanceFullService, type FullVideoRequest } from './providers/kie-seedance-full';
import { OpenAIJsonService } from './providers/openai-json';

export type TextProvider = 'openai' | 'gemini';
export type TaskType = 'text' | 'analysis';

/**
 * Single entry point for every AI call in the app — no feature code should
 * import a provider service directly. Kie is the only image/video provider
 */
export class AIOrchestrator {
  async executeTask(taskType: TaskType, prompt: string, provider: TextProvider = 'openai', options?: { systemPrompt?: string }): Promise<string> {
    if (provider === 'gemini') return GeminiService.generateTextPro(prompt);
    return OpenAIService.generateText(prompt, options?.systemPrompt);
  }

  createImageTask(prompt: string, imageSize?: "9:16" | "4:5" | "16:9" | "1:1", referenceImages?: string | string[], mode?: "identity" | "reference") {
    return KieService.createImageTask(prompt, imageSize, referenceImages, mode);
  }

  createVideoTask(prompt: string, imageUrls: string[], aspectRatio?: string, duration?: string) {
    return KieService.createVideoTask(prompt, imageUrls, aspectRatio, duration);
  }

  /** A text call that comes back as one valid JSON object (OpenAI JSON mode); the prompt must mention JSON. */
  executeJsonTask(prompt: string, options?: { systemPrompt?: string }): Promise<string> {
    return OpenAIJsonService.generateJson(prompt, options?.systemPrompt);
  }

  /** One finished video in one go (Seedance 2.5): the one-shot Meta Ads video pipeline. */
  createFullVideoTask(request: FullVideoRequest) {
    return KieSeedanceFullService.createFullVideoTask(request);
  }

  checkTaskStatus(jobId: string) {
    return KieService.checkSingleTaskStatus(jobId);
  }

  generateSpeech(text: string, voiceId?: string, languageCode?: string) {
    return ElevenLabsService.generateSpeech(text, voiceId, languageCode);
  }
}

export const aiOrchestrator = new AIOrchestrator();
