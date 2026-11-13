import { aiOrchestrator } from "./orchestrator";
import { businessNamePattern, getOneShotPlanPrompt, getOneShotSystemPrompt, getOneShotVideoPrompt, type OneShotChoices } from "@/prompts/one-shot-video";

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
  /** The whole brief for Seedance 2.5, as the writer wrote it */
  videoPrompt: string;
  /** A shot shows the brand image, so it's sent to Seedance; otherwise it stays out */
  useBrandImage: boolean;
  /** Where the prompt still asks to show written words (see findWritingProblems); empty when it doesn't */
  problems: string[];
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

/**
 * One complete prompt for Seedance 2.5 (and, for a Meta ad, its headline and primary text). `problems` are
 * what the check found in the last draft, for the one rewrite the jobs ask for.
 */
export async function writeOneShotVideoPrompt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  business: any,
  choices: OneShotChoices,
  plan: OneShotPlan,
  images: string[],
  problems: string[] = []
): Promise<OneShotVideoPrompt> {
  const parsed = parseJson(
    await aiOrchestrator.executeJsonTask(getOneShotVideoPrompt(business, choices, plan, images, problems), { systemPrompt: getOneShotSystemPrompt(choices.channel) })
  );
  const videoPrompt = String(parsed?.videoPrompt ?? "").trim();
  if (videoPrompt.length < 500) throw new Error("The video prompt came back too short to make a good video from. Try again.");
  return {
    title: String(parsed?.title ?? "").trim().slice(0, 90) || "Video",
    headline: String(parsed?.headline ?? "").trim().slice(0, 60),
    primaryText: String(parsed?.primaryText ?? "").trim().slice(0, 500),
    videoPrompt: videoPrompt.slice(0, MAX_PROMPT_CHARS),
    useBrandImage: parsed?.useBrandImage === true,
    problems: findWritingProblems(videoPrompt, business?.name, plan.script),
  };
}

/** The headings the writer is asked to use (getOneShotSystemPrompt, step 3). */
const SECTIONS = ["THE VIDEO", "THE BUSINESS AND THE SERVICE", "REFERENCE IMAGES", "PEOPLE", "TIMELINE", "SPOKEN WORDS", "SOUND", "THE ENDING", "KEEP IT CLEAN"];

/** Where the business's name belongs. Anywhere else it describes something we see, and the model writes it on that, misspelled. */
const NAME_SECTIONS = new Set(["THE BUSINESS AND THE SERVICE", "SPOKEN WORDS", "SOUND"]);

/** Words that ask the video model to draw writing; the writer is told never to use them. */
const WRITING_WORDS = /\b(texts?|captions?|subtitles?|lettering|logos?|watermarks?|title cards?)\b/gi;

/** A short quote around a match, so the writer (and our logs) can see where it is. */
function around(text: string, index: number, length: number): string {
  return `"…${text.slice(Math.max(0, index - 60), index + length + 60).replace(/\s+/g, " ").trim()}…"`;
}

/**
 * Where a video prompt still asks Seedance to show written words, which it misspells ("TOKA HEALTH"): words
 * like "text" or "caption" anywhere, or the business's name outside the sections where it belongs. The
 * script's own lines are left out first, since what's spoken may say anything. Empty when the prompt is clean.
 */
export function findWritingProblems(videoPrompt: string, businessName: string | null | undefined, script: string[]): string[] {
  let seen = videoPrompt;
  for (const line of script) {
    const said = line.trim().replace(/[.!?]+$/, "");
    if (said) seen = seen.split(said).join(" ");
  }
  const problems: string[] = [];

  for (const match of seen.matchAll(WRITING_WORDS)) {
    problems.push(`asks for written words in the picture: ${around(seen, match.index ?? 0, match[0].length)}`);
  }

  // The name check needs the writer's headings to tell sections apart; without them it's skipped
  const headings = [...seen.matchAll(new RegExp(`\\b(${SECTIONS.join("|")})\\s*:`, "g"))];
  const namePattern = businessNamePattern(businessName);
  if (namePattern && headings.length >= 3) {
    headings.forEach((heading, i) => {
      if (NAME_SECTIONS.has(heading[1])) return;
      const start = (heading.index ?? 0) + heading[0].length;
      const body = seen.slice(start, headings[i + 1]?.index ?? seen.length);
      const found = namePattern.exec(body);
      if (found) problems.push(`names the business in ${heading[1]}, which describes what we see: ${around(body, found.index, found[0].length)}`);
    });
  }
  return [...new Set(problems)].slice(0, 8);
}
