import { serviceDescriptor } from "../meta-ads/shared";
import { sceneCountForDuration, AD_MODE_STRUCTURES } from "../meta-ads/video";
import { businessContextBlock } from "./index";

/** Video post generation — the story ARC is a fixed, hardcoded shape again
 * (problem -> discovers the business -> takes the treatment/service ->
 * resolved and happy), reusing the proven TRANSFORMATION act structure
 * from Meta Ads' video prompt (`AD_MODE_STRUCTURES.TRANSFORMATION` in
 * `meta-ads/video.ts`) rather than duplicating that prose here. This is a
 * deliberate partial revert of the earlier "pick 1 of 8 modes" genericization
 * — explicitly requested: every organic social video should follow this
 * same beat structure, but WHAT the problem is, WHERE it happens, and what
 * the surrounding environment/scene looks like must stay entirely dynamic,
 * driven by the idea + business context, never hardcoded. So: the ARC is
 * fixed, the SITUATION is not. `ad_mode` is hardcoded to "TRANSFORMATION" in
 * code (see generateSocialVideoScript), not asked of the model, since it's
 * no longer a choice — that value still flows into the shared
 * `getVisualPromptsPrompt` (`meta-ads/video.ts`) exactly like before, so the
 * before/after visual-tier system and phase-based mood still apply
 * correctly. `visual_mood` stays a genuine per-idea choice — only the
 * narrative arc was asked to be hardcoded back, not the visual style. */
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
  // Conservative words-per-second estimate, same rationale as the Meta Ads
  // video script prompt: audio running even slightly longer than the video
  // underneath it cuts narration off mid-word, so undershooting this
  // budget is the safe direction.
  const targetWords = Math.round(sceneCount * 4 * 2.0);
  const characterName = input.character === "male" ? "James" : "Sarah";
  const descriptor = serviceDescriptor(business, input.service);
  const language = input.language && input.language !== "English" ? input.language : null;

  return `${language ? `OUTPUT LANGUAGE: Write the ENTIRE script in ${language}. Every single line must be in ${language}, not English. Do not mix languages.\n\n` : ""}You are an expert short-form social video scriptwriter for ${businessName}, a ${business?.industry || "business"}.

${businessContextBlock(business)}

You write AUDIO ONLY — spoken narration read aloud by ElevenLabs TTS. No camera directions, no on-screen text, just the words the voice will say. This is organic social content, not a paid ad — favor a natural, unhurried, native-to-the-feed voice over a hard sales pitch.

STORY IDEA
${input.ideaPrompt}
${descriptor ? `THIS POST IS SPECIFICALLY FOR: ${descriptor}. Every claim must be about this service — never blend in another.\n` : ""}

Convert the idea above into a polished voiceover script with a clean arc and TTS-friendly rhythm, following this ACT STRUCTURE exactly:

${AD_MODE_STRUCTURES.TRANSFORMATION}

The ACT STRUCTURE above is fixed — every script follows this same shape. What is NOT fixed: the specific problem, the setting, the environment, or how any of it looks — all of that comes entirely from the idea and business context below, never assumed or defaulted to a particular scenario. The same person could plausibly have this exact problem in any number of real situations; don't narrow it to one just because it's a common example.

Before writing Act 1, silently work out: what specific real-world condition or dissatisfaction is this idea actually about${descriptor ? ` — this is for "${descriptor}", so ground your answer in what that service actually treats` : ""}? Then write 2-3 concrete, natural ways a real person would describe that exact condition (specific and sensory, never a vague "something is wrong"). Use that grounding for every relevant line below.

ASSIGN ONE NAME, use it throughout — use "${characterName}" (or another common name matching the ${input.character} character) in line 1 at minimum; other lines use he / she. Never switch the name or pronoun — check every line before returning.

LENGTH — EXACT, NOT A GUIDELINE: each script line becomes one video scene downstream, so the script array MUST have EXACTLY ${sceneCount} lines — no more, no fewer. Target about ${targetWords} words total across all ${sceneCount} lines so the spoken narration's natural length fits comfortably within the video — a script that runs noticeably longer risks getting cut off once the audio is laid over the video.
Each line = ONE complete sentence, 6-9 words. Hard cap at 10 words.

HARD RULES
- Mention "${businessName}" by name AT MOST ONCE across the whole script, at the point where it's most natural (Act 2, the discovery).
- Never use jargon or technical/clinical language.
- Never use em dashes, semicolons, quotation marks, parentheses, asterisks, hashes, emojis, or ALL CAPS.
- One sentence per line, plain conversational ${language || "English"}.
- Avoid tongue-twisters, clusters of similar consonant sounds, and rare or hard-to-pronounce words — prefer short, common, everyday words a voice actor could read smoothly in one breath. This is spoken narration, so clarity of delivery matters as much as meaning.

HARD CONSTRAINT — NEVER INVENT A NUMBER, OFFER, OR DATE
Do not state any price, percentage, discount, or date anywhere in the script unless that exact figure is explicitly present in the business context or brief above.

IF THIS BUSINESS'S OWN INDUSTRY/OFFERINGS ABOVE ARE HEALTH, MEDICAL, OR COSMETIC
Also forbid:
1. Surgical, procedural, or recovery descriptions
2. Pain, blood, needles, instruments, side effects, risks
3. Medical jargon (e.g. alopecia, malocclusion, obesity, rhinophyma) — describe things the way a real person would, not a clinician
4. Time markers (three weeks later, six months on, before, after, suddenly)
For any other kind of business, this section does not apply.

OUTPUT FORMAT — STRICT
Return ONLY valid JSON. No markdown fences. No commentary.
{
  "visual_mood": "one of: CLEAN_PRECISE | WARM_APPROACHABLE | PREMIUM_CONSIDERED | BOLD_ENERGETIC | PLAYFUL",
  "script": [
    "Line one.",
    "Line two."
  ]
}
Rules:
- "visual_mood" is the ONE visual archetype that best matches this business's own voice/description above — pick deliberately, never the same one every time just because it's safe.
- "script" must be a JSON array of EXACTLY ${sceneCount} strings, one sentence per element, in order.
- No extra fields, no trailing commas.`;
}
