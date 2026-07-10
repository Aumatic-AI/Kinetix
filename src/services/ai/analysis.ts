import { aiOrchestrator } from './orchestrator';

export class AnalysisAIService {
  async analyzeData(dataPayload: string) {
    const prompt = `Analyze the following dataset and provide actionable insights:\n${dataPayload}`;
    return aiOrchestrator.executeTask('analysis', prompt);
  }
}

export const analysisAI = new AnalysisAIService();
