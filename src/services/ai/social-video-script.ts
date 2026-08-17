import { aiOrchestrator } from "./orchestrator";
import { getSocialVideoScriptPrompt, SocialVideoScriptInput } from "@/prompts/social-media/video";
import { sceneCountForDuration } from "@/prompts/meta-ads/video";

export interface SocialVideoScriptResult {
  ad_mode: string;
  visual_mood: string;
  script: string[];
}

/** The one place a social video script gets generated — used both by the
 * synchronous "preview the script" route (so the user can review/edit it
 * before anything else runs) and by the background generation job (when no
 * pre-approved script was supplied). Mirrors src/services/ai/video-script.ts
 * (Meta Ads' equivalent) — same defensive trimming, same rationale. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateSocialVideoScript(business: any, input: SocialVideoScriptInput): Promise<SocialVideoScriptResult> {
  const sceneCount = sceneCountForDuration(input.duration);
  const prompt = getSocialVideoScriptPrompt(business, input);

  const response = await aiOrchestrator.executeTask("text", prompt, "openai");
  const jsonStr = (response as string).replace(/```json\n?|\n?```/g, "").trim();
  const parsed = JSON.parse(jsonStr);

  // Truncate defensively if the model overshoots the requested line count —
  // undershooting isn't trimmed, a shorter-but-complete video is a safer
  // failure than a mid-sentence cutoff.
  if (Array.isArray(parsed.script) && parsed.script.length > sceneCount) {
    parsed.script = parsed.script.slice(0, sceneCount);
  }

  // The prompt's own word budget is a strong steer, not a guarantee — drop
  // trailing lines (never mid-sentence) until the estimated spoken length
  // fits a 4s/line video, re-checking against the shrinking target each time.
  const WORDS_PER_SECOND = 2.2;
  const countWords = (line: string) => line.trim().split(/\s+/).filter(Boolean).length;
  while (Array.isArray(parsed.script) && parsed.script.length > 3) {
    const totalWords = parsed.script.reduce((sum: number, line: string) => sum + countWords(line), 0);
    const estimatedSeconds = totalWords / WORDS_PER_SECOND;
    const videoSeconds = parsed.script.length * 4;
    if (estimatedSeconds <= videoSeconds) break;
    parsed.script.pop();
  }

  return parsed as SocialVideoScriptResult;
}
