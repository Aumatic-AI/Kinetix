import { env } from '@/config/env';
import { AppError } from '@/utils/app-error';

export class ReplicateProvider {
  async runModel(model: string, input: Record<string, unknown>) {
    if (!env.REPLICATE_API_TOKEN) throw new AppError('Replicate API key not configured', 'CONFIG_ERROR', 500);
    // Stub for Replicate model execution
    return `https://storage.kinetix.ai/mock/replicate-output-${Date.now()}.png`;
  }
}
