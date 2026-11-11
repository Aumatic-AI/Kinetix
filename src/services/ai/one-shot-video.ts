import { aiOrchestrator } from "./orchestrator";
import { getOneShotPlanPrompt, getOneShotSystemPrompt, getOneShotVideoPrompt, type OneShotChoices } from "@/prompts/one-shot-video";

/** The plan the user reviews before a one-shot video is made. */
export interface OneShotPlan {
  concept: string;
  script: string[];
}

/** What the prompt writer returns: the brief for Seedance 2.5, plus the Meta ad copy for a Meta ad. */
export interface OneShotVideoPrompt {
  title: string;
  headline: string;
  primaryText: string;
  /** Ends with how to say the business name (and website), so the voices never have to guess */
  videoPrompt: string;
  /** A shot shows the brand image, so it's sent to Seedance; otherwise it stays out */
  useBrandImage: boolean;
}

/** Kie's prompt box takes 20,000 characters; the writer is asked for far less. */
const MAX_PROMPT_CHARS = 18_000;

/** The model's JSON, even when it wraps it in a code fence or a sentence. */
function parseJson(response: string): Record<string, unknown> | null {
  const text = response.replace(/```json\n?|\n?```/g, "").trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("The AI's answer wasn't valid JSON. Try again.");
    return JSON.parse(text.slice(start, end + 1));
  }
}

const lines = (value: unknown): string[] => (Array.isArray(value) ? value.map((l) => String(l).trim()).filter(Boolean) : []);

/**
 * The concept and spoken lines — used by the "preview" routes (so the user can
 * review and edit them) and by the background jobs when none was sent (a retry).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateOneShotPlan(business: any, choices: OneShotChoices): Promise<OneShotPlan> {
  const parsed = parseJson(await aiOrchestrator.executeJsonTask(getOneShotPlanPrompt(business, choices)));
  const concept = String(parsed?.concept ?? "").trim();
  // A video without speech has no lines, only its concept
  const script = choices.voice ? lines(parsed?.script).slice(0, 14) : [];
  if (choices.voice ? !script.length : !concept) throw new Error("The plan came back empty. Try again or reword the idea.");
  return { concept, script };
}

/** One complete prompt for Seedance 2.5 (and, for a Meta ad, its headline and primary text). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function writeOneShotVideoPrompt(business: any, choices: OneShotChoices, plan: OneShotPlan, images: string[]): Promise<OneShotVideoPrompt> {
  const parsed = parseJson(
    await aiOrchestrator.executeJsonTask(getOneShotVideoPrompt(business, choices, plan, images), { systemPrompt: getOneShotSystemPrompt(choices.channel) })
  );
  const videoPrompt = String(parsed?.videoPrompt ?? "").trim();
  if (videoPrompt.length < 500) throw new Error("The video prompt came back too short to make a good video from. Try again.");
  // Appended by code, so it's there even when the writer leaves it out of SOUND
  const pronunciation = String(parsed?.pronunciation ?? "").trim().slice(0, 600);
  const ending = pronunciation && choices.voice ? `\n\nPRONUNCIATION (say these exactly like this): ${pronunciation}` : "";
  return {
    title: String(parsed?.title ?? "").trim().slice(0, 90) || "Video",
    headline: String(parsed?.headline ?? "").trim().slice(0, 60),
    primaryText: String(parsed?.primaryText ?? "").trim().slice(0, 500),
    videoPrompt: videoPrompt.slice(0, MAX_PROMPT_CHARS - ending.length) + ending,
    useBrandImage: parsed?.useBrandImage === true,
  };
}
