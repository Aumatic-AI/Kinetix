import { serviceDescriptor } from "../meta-ads/shared";
import { sceneCountForDuration, AD_MODES, AD_MODE_STRUCTURES } from "../meta-ads/video";
import { businessContextBlock } from "./index";

/** Video post generation — reuses the same 8 narrative modes proven for
 * Meta Ads video ads (`AD_MODES`/`AD_MODE_STRUCTURES` in `meta-ads/video.ts`)
 * instead of forcing every organic social video into one fixed SAD -> MEET
 * BUSINESS -> JOURNEY -> HAPPY transformation arc, which is what this file
 * used to do unconditionally regardless of the idea. Organic content
 * genuinely benefits from the same variety an ad does — a behind-the-scenes
 * moment, an announcement, an educational tip, social proof — not just
 * personal-journey stories, so the same reasoned "pick exactly ONE mode"
 * step is used here too, just with social-native framing instead of an
 * ad's. Scenes are still handed to the SAME visual-prompts system
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

STEP 0 — DECIDE THE VIDEO'S MODE (do this first, silently — this decides everything below)
Read the idea and the business context, then pick exactly ONE mode that genuinely fits — never default to TRANSFORMATION just because it's the most detailed option below. Be able to justify your choice from the idea itself.
${AD_MODES}

Convert the idea above into a polished voiceover script with a clean arc and TTS-friendly rhythm, following the ACT STRUCTURE for your chosen mode:

${Object.entries(AD_MODE_STRUCTURES).map(([mode, structure]) => `--- ${mode} ---\n${structure}`).join("\n\n")}

IF YOUR MODE HAS A PROBLEM/NEED AT ITS CORE (TRANSFORMATION, PROMOTION_OFFER, SERVICE_SPOTLIGHT)
Before writing Act 1, silently work out: what specific real-world condition or dissatisfaction is this idea actually about${descriptor ? ` — this is for "${descriptor}", so ground your answer in what that service actually treats` : ""}? Then write 2-3 concrete, natural ways a real person would describe that exact condition (specific and sensory, never a vague "something is wrong"). Use that grounding for every relevant line below.

IF YOUR MODE CENTERS ONE PERSON'S STORY (TRANSFORMATION, PROMOTION_OFFER following a customer, TESTIMONIAL_PROOF)
ASSIGN ONE NAME, use it throughout — use "${characterName}" (or another common name matching the ${input.character} character) in line 1 at minimum; other lines use he / she. Never switch the name or pronoun — check every line before returning.

IF YOUR MODE IS NOT ABOUT ONE PERSON'S STORY (BRAND_INTRO, EDUCATIONAL_AUTHORITY, ANNOUNCEMENT, EVENT_SEASONAL)
Write in second person ("you") or about the business directly — no named individual required.

LENGTH — EXACT, NOT A GUIDELINE: each script line becomes one video scene downstream, so the script array MUST have EXACTLY ${sceneCount} lines — no more, no fewer. Target about ${targetWords} words total across all ${sceneCount} lines so the spoken narration's natural length fits comfortably within the video — a script that runs noticeably longer risks getting cut off once the audio is laid over the video.
Each line = ONE complete sentence, 6-9 words. Hard cap at 10 words.

HARD RULES
- Mention "${businessName}" by name AT MOST ONCE across the whole script, at the point where it's most natural for your chosen mode's structure.
- Never use jargon or technical/clinical language.
- Never use em dashes, semicolons, quotation marks, parentheses, asterisks, hashes, emojis, or ALL CAPS.
- One sentence per line, plain conversational ${language || "English"}.
- Avoid tongue-twisters, clusters of similar consonant sounds, and rare or hard-to-pronounce words — prefer short, common, everyday words a voice actor could read smoothly in one breath. This is spoken narration, so clarity of delivery matters as much as meaning.

HARD CONSTRAINT — NEVER INVENT A NUMBER, OFFER, OR DATE
Do not state any price, percentage, discount, or date anywhere in the script unless that exact figure is explicitly present in the business context or brief above. This applies especially to PROMOTION_OFFER and EVENT_SEASONAL — a real, specific offer is welcome and expected in those modes, but only ever the real one, never a plausible-sounding invented one.

IF (AND ONLY IF) YOUR MODE IS TRANSFORMATION *AND* THIS BUSINESS'S OWN INDUSTRY/OFFERINGS ABOVE ARE HEALTH, MEDICAL, OR COSMETIC
Also forbid:
1. Surgical, procedural, or recovery descriptions
2. Pain, blood, needles, instruments, side effects, risks
3. Medical jargon (e.g. alopecia, malocclusion, obesity, rhinophyma) — describe things the way a real person would, not a clinician
4. Time markers (three weeks later, six months on, before, after, suddenly)
For any other mode, or any other kind of business, this section does not apply.

OUTPUT FORMAT — STRICT
Return ONLY valid JSON. No markdown fences. No commentary.
{
  "ad_mode": "one of: ${Object.keys(AD_MODE_STRUCTURES).join(" | ")}",
  "visual_mood": "one of: CLEAN_PRECISE | WARM_APPROACHABLE | PREMIUM_CONSIDERED | BOLD_ENERGETIC | PLAYFUL",
  "script": [
    "Line one.",
    "Line two."
  ]
}
Rules:
- "ad_mode" must be exactly one of the modes above, chosen genuinely, not defaulted.
- "visual_mood" is the ONE visual archetype that best matches this business's own voice/description above — pick deliberately, never the same one every time just because it's safe.
- "script" must be a JSON array of EXACTLY ${sceneCount} strings, one sentence per element, in order.
- No extra fields, no trailing commas.`;
}
