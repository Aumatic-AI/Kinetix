import { OpenAIService } from './providers/openai';
import { GeminiService } from './providers/gemini';
import { RunwayService } from './providers/runway';
import { FalService } from './providers/fal';
import { ElevenLabsService } from './providers/elevenlabs';
import { KlingService } from './providers/kling';
import { ReplicateProvider } from './providers/replicate';
import { KieService } from './providers/kie';

export type ModelProvider = 'openai' | 'gemini' | 'runway' | 'fal' | 'elevenlabs' | 'kling' | 'replicate' | 'kie';
export type TaskType = 'text' | 'image' | 'video' | 'analysis' | 'audio';

export class AIOrchestrator {
  private replicateProvider = new ReplicateProvider();

  async executeTask(taskType: TaskType, prompt: string, preferredProvider?: ModelProvider, options?: any) {
    const provider = preferredProvider || this.determineBestProvider(taskType);
    
    switch (taskType) {
      case 'text':
      case 'analysis':
        return provider === 'gemini' 
          ? GeminiService.generateTextPro(prompt) 
          : OpenAIService.generateText(prompt);
          
      case 'video':
        if (provider === 'kling') return KlingService.textToVideo(prompt);
        if (provider === 'kie') return KieService.generateVideo(prompt, options?.imageUrls, options?.aspectRatio, options?.duration);
        return RunwayService.generateGen3Video(prompt);
        
      case 'image':
        if (provider === 'replicate') return this.replicateProvider.runModel("stability-ai/sdxl", { prompt });
        if (provider === 'kie') return KieService.generateImage(prompt, options?.imageSize);
        return FalService.generateFluxImage(prompt);
        
      case 'audio':
        if (provider === 'elevenlabs') return ElevenLabsService.generateSpeech(prompt);
        throw new Error(`Unsupported provider for audio: ${provider}`);
        
      default:
        throw new Error(`Unsupported task type: ${taskType}`);
    }
  }

  private determineBestProvider(taskType: TaskType): ModelProvider {
    switch (taskType) {
      case 'text': return 'openai';
      case 'analysis': return 'gemini';
      case 'video': return 'runway';
      case 'image': return 'fal';
      case 'audio': return 'elevenlabs';
      default: return 'openai';
    }
  }
}

export const aiOrchestrator = new AIOrchestrator();
