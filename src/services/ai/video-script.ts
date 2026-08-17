import { aiOrchestrator } from "./orchestrator";
import { getVideoAdScriptPrompt, sceneCountForDuration } from "@/prompts/meta-ads/video";

export interface VideoScriptCreativeInput {
  ideaPrompt: string;
  duration?: string;
  audioStyle?: string;
  videoStyle?: string;
  character?: string;
  service?: string;
  language?: string;
}

export interface VideoScriptResult {
  ad_mode: string;
  visual_mood: string;
  script: string[];
}

/** The one place the video ad script gets generated — used both by the
 * synchronous "preview the script" route (so the user can review/edit it
 * before anything else runs) and by the background generation job (when no
 * pre-approved script was supplied, e.g. on retry). Same prompt, same AI
 * call, same defensive trimming either way — nothing about generation
 * itself differs depending on which caller uses it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateVideoScript(intelligence: any, creative: VideoScriptCreativeInput): Promise<VideoScriptResult> {
  const sceneCount = sceneCountForDuration(creative.duration);
  const prompt = getVideoAdScriptPrompt(intelligence, creative);

  const response = await aiOrchestrator.executeTask("text", prompt, "openai");
  const jsonStr = (response as string).replace(/```json\n?|\n?```/g, "").trim();
  const parsed = JSON.parse(jsonStr);

  // Video length is scenes x 4s (hard constraint, see the cinematic prompt)
  // — truncate defensively if the model overshoots the requested line
  // count, so the video is never longer than intended. Undershooting isn't
  // trimmed: a shorter-but-complete video is a safer failure than the
  // mid-sentence audio cutoff a too-long script causes once it's laid over
  // the fixed-length video.
  if (Array.isArray(parsed.script) && parsed.script.length > sceneCount) {
    parsed.script = parsed.script.slice(0, sceneCount);
  }

  // The prompt's own word budget is a strong steer, not a guarantee — the
  // model can still write a script whose natural spoken length runs past
  // the fixed-length video underneath it, which cuts the narration off
  // mid-word. This is a deterministic backstop: measure the actual result
  // and drop trailing lines (never mid-sentence) until the estimated
  // spoken length fits the video these lines will actually produce. Each
  // dropped line shortens the video by 4s too, so this re-checks against
  // the shrinking target every time.
  const WORDS_PER_SECOND = 2.2;
  const countWords = (line: string) => line.trim().split(/\s+/).filter(Boolean).length;
  while (Array.isArray(parsed.script) && parsed.script.length > 3) {
    const totalWords = parsed.script.reduce((sum: number, line: string) => sum + countWords(line), 0);
    const estimatedSeconds = totalWords / WORDS_PER_SECOND;
    const videoSeconds = parsed.script.length * 4;
    if (estimatedSeconds <= videoSeconds) break;
    parsed.script.pop();
  }

  return parsed as VideoScriptResult;
}
