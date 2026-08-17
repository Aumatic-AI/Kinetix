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

  // Truncate defensively if the model overshoots the requested line count,
  // so the number of scenes matches what was asked for — undershooting
  // isn't trimmed here, that's just a shorter (still complete) script.
  //
  // There used to also be a word-budget trim here that dropped trailing
  // lines whenever the script's estimated spoken length exceeded a fixed
  // "scriptLines x 4 seconds" budget. That assumption predates the
  // per-scene measured-audio redesign (see generate-video-ad.ts step 4):
  // each scene's clip is now sized to THAT scene's own real narration
  // length (clamped 4-12s), not a uniform 4s, so a line running longer
  // than 4 seconds of speech no longer risks a mid-word cutoff — it just
  // gets a longer clip. Keeping that old trim was actively harmful: it
  // silently shortened well-formed scripts (down toward its 3-line floor)
  // any time natural, unhurried phrasing ran past the stale 4s/line
  // estimate, producing a much shorter final video than requested. The
  // real protection against a single scene's audio getting cut off is the
  // per-line word cap already in the prompt (6-9 words, 10 max — comfortably
  // under 12s of natural speech), not a whole-script word-count trim.
  if (Array.isArray(parsed.script) && parsed.script.length > sceneCount) {
    parsed.script = parsed.script.slice(0, sceneCount);
  }

  return parsed as VideoScriptResult;
}
