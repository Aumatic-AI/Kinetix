import { serviceDescriptor } from "../meta-ads/shared";
import { sceneCountForDuration } from "../meta-ads/video";
import { businessContextBlock } from "./index";

/** Video post generation — 4-act arc (SAD -> MEET BUSINESS -> JOURNEY ->
 * HAPPY), kept distinct from the Meta Ads video script's 3-act arc since
 * organic social content favors a slower, less sales-driven pace than an
 * ad — but scenes are still handed to the SAME visual-prompts system
 * (`getVisualPromptsPrompt` in `meta-ads/video.ts`) since that
 * condition/tier logic is universal, not ad-specific. */
export interface SocialVideoScriptInput {
  ideaPrompt: string;
  duration: number; // seconds
  character: "male" | "female";
  service?: string;
  language?: string;
}

export function getSocialVideoScriptPrompt(business: any, input: SocialVideoScriptInput): string {
  const businessName = business?.name || "the business";
  const sceneCount = sceneCountForDuration(input.duration);
  const targetWords = Math.round(sceneCount * 4 * 2.3);
  const characterName = input.character === "male" ? "James" : "Sarah";
  const descriptor = serviceDescriptor(business, input.service);
  const language = input.language && input.language !== "English" ? input.language : null;

  return `${language ? `OUTPUT LANGUAGE: Write the ENTIRE script in ${language}. Every single line must be in ${language}, not English. Do not mix languages.\n\n` : ""}You are an expert short-form video scriptwriter for ${businessName}, a ${business?.industry || "business"}.

${businessContextBlock(business)}

You write cinematic, emotionally honest first-person transformation scripts that move the viewer from struggle to hope. You write AUDIO ONLY — spoken narration read aloud by ElevenLabs TTS. No camera directions, no on-screen text, just the words the voice will say.

STORY IDEA
${input.ideaPrompt}
Before writing Act 1, silently work out: what specific real-world condition or dissatisfaction is this idea actually about${descriptor ? ` — this is for "${descriptor}", so ground your answer in what that service actually treats` : ""}? Then write 2-3 concrete, natural ways a real person would describe that exact condition (specific and sensory, never a vague "something is wrong"). Use that grounding for Act 1, adapting the pronoun to the character's gender.
CHARACTER: first-person, ${input.character} voice — use the name "${characterName}" once if a name is needed, otherwise use "I".

Every script MUST follow this four-act emotional arc:

ACT 1 — SAD (the problem before ${businessName}): Open with the exact scenario from the story idea above. Describe the specific struggle and how it affects daily life, using the concrete phrasing above rather than a vague or softened version of it. Do NOT mention ${businessName} yet.

ACT 2 — MEET ${String(businessName).toUpperCase()} (the discovery): Introduce ${businessName} by name for the FIRST time. Describe finding it and the moment of deciding to reach out.

ACT 3 — JOURNEY (the experience): Narrate the calm, supported experience — warm, reassuring, professional. Never narrate procedural/technical/clinical detail, risk, or discomfort.

ACT 4 — HAPPY (the transformation after): Narrate the change as a lived moment with someone else noticing — never as a tagline. End with exactly one of: "Visit ${businessName} for more." / "Your transformation starts at ${businessName}." / "${businessName} changed my life — it can change yours too."

LENGTH — EXACT, NOT A GUIDELINE: each script line becomes one fixed ~4-second video scene downstream, so the final video's length is EXACTLY (number of lines x 4) seconds — a hard technical constraint. The script array MUST have EXACTLY ${sceneCount} lines — no more, no fewer — to produce a ${sceneCount * 4}-second video for the requested ${input.duration}-second narration. Target about ${targetWords} words total across all ${sceneCount} lines so the spoken narration's natural length fits within that video — a script that runs noticeably longer gets cut off mid-sentence once the audio is laid over the fixed-length video.

HARD RULES
- Never mention prices, costs, or numbers.
- Never use jargon or technical/clinical language.
- Never use em dashes, semicolons, quotation marks, parentheses, asterisks, hashes, emojis, or ALL CAPS.
- One sentence per line, plain conversational ${language || "English"}.
- Mention "${businessName}" by name exactly once, in Act 2.
- Avoid tongue-twisters, clusters of similar consonant sounds, and rare or hard-to-pronounce words — prefer short, common, everyday words a voice actor could read smoothly in one breath. This is spoken narration, so clarity of delivery matters as much as meaning.

OUTPUT FORMAT — STRICT
Return ONLY valid JSON. No markdown fences. No commentary.
{
  "script": [
    "Line one.",
    "Line two."
  ]
}
"script" must be a JSON array of EXACTLY ${sceneCount} strings, one sentence per element, in order, totaling approximately ${targetWords} words.`;
}
