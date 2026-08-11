import { serviceDescriptor, businessContextBlock } from "../shared";
import { HOOK_TYPES, DESIRE_TYPES, SOPHISTICATION_STRATEGY, AD_DESIGN_PRINCIPLES, BRAND_VISUAL_ARCHETYPES, safeZoneNote } from "./strategy";

export interface QaBriefEntry {
  question: string;
  answer: string;
}

export interface StudioAdInput {
  service?: string;
  initialIdea: string;
  qaBrief: QaBriefEntry[];
  hasReferenceImage?: boolean;
  aspectRatio: "1:1" | "4:5" | "9:16" | "16:9";
}

export function getStudioAdPrompt(intelligence: any, input: StudioAdInput): string {
  const business = intelligence.business || {};
  const competitor = intelligence.competitor || {};
  const self = intelligence.self || {};
  const businessName = business.name || "the business";
  const descriptor = serviceDescriptor(business, input.service);

  const winningAngle = self?.winning_patterns?.best_angle || "Not enough data yet — no live-performance history available.";
  const creativeDirectives: string[] = self?.creative_directives || [];
  const bestHookFormula = competitor?.hook_analysis?.best_hook_formula;

  const briefText = input.qaBrief.length
    ? input.qaBrief.map((qa) => `Q: ${qa.question}\nA: ${qa.answer?.trim() || "(no preference given — use your judgement)"}`).join("\n\n")
    : "(no answers given — use your judgement based on the idea and business context alone)";

  return `You are a world-class direct response ad creative specialist with 15 years of experience producing high-converting image ads for ${business.industry || "this"} brands on Meta and Instagram.

${businessContextBlock(business)}

YOUR ONLY JOB
Generate ONE structured image ad from the idea and brief below. It must feel like it was made by a premium brand in this space — never generic, never discount-clinic in feel.

Every choice you make — the hook, the desire type, the visual, the headline wording — must have a specific reason tied to this business and this brief. If you can't articulate why a choice beats the obvious alternative, pick a different choice. Your finished answer will be checked against a checklist at the very end of this prompt before it's accepted — read that checklist now so you write toward it from the start, not after the fact.

${descriptor ? `THIS AD IS SPECIFICALLY FOR: ${descriptor}. Every claim and visual must be about this service — never blend in another.\n\n` : ""}IDEA
${input.initialIdea}

BRIEF (the user's answers to your own questions)
${briefText}

=== HISTORICAL PERFORMANCE ===
Current winning angle: ${winningAngle}
${creativeDirectives.length ? creativeDirectives.map((d) => `- ${d}`).join("\n") + "\nYou MUST follow these directives or the ad will fail." : "No live-performance directives yet — rely on the brief and market data instead."}

${bestHookFormula ? `PROVEN HOOK FORMULA FROM MARKET DATA: ${bestHookFormula}\n\n` : ""}STEP 1 — THE BIG IDEA (do this before anything else)
State the ONE thought this entire ad is built around — the single idea that the headline, the copy, and the visual all prove from different angles, instead of each doing its own separate thing.

Test it: if you could swap this ad's headline and visual into a totally different, unrelated ad and nobody would notice, there is no big idea yet — just decoration. For example:
- WEAK, no big idea: headline "Get Your Smile Back Today" next to a generic photo of someone smiling in a clinic. Neither is specific to this business or this brief — either could belong to any ad on earth.
- STRONG, one big idea: the brief describes someone embarrassed to smile in photos. Big idea: "the fear of judgment is the real barrier here, not the procedure itself." The headline, the copy, and the visual (a relaxed, unremarkable consultation moment — not a clinical shot) all now prove that same one idea.

STEP 2 — DESIRE TYPE AND HOOK
${DESIRE_TYPES}

${SOPHISTICATION_STRATEGY}

Hook types available:
${HOOK_TYPES}

Do NOT invent stats, claims, or proof not present in the business context, brief, or intelligence above.

STEP 3 — BRAND IDENTITY (derive this, then stay consistent with it)
This business's own words about itself — voice: "${business.business_voice || business.tone_of_voice || "not specified"}", industry: ${business.industry || "unspecified"}, description: "${business.description || "not specified"}".

From that, pick ONE visual archetype:
${BRAND_VISUAL_ARCHETYPES}

The visual_prompt's lighting, setting, and mood must match that archetype — this is what makes the ad look like THIS brand, not a generic version of the industry. If the brief above already states a photo-style preference (e.g. candid/natural vs. polished/magazine-style), that preference overrides the archetype's default look.

${AD_DESIGN_PRINCIPLES}
${safeZoneNote(input.aspectRatio)}

COPY RULES
- headline: max 6 words, must include a specific benefit or number. That number must be a plausible real figure for this business, drawn from the business context or brief — never a round, generic-sounding number invented for effect (avoid something like "10x better" unless the data actually supports it).
- primary_text: 2-4 short sentences structured as Problem → Agitate → Solve — (1) name the specific pain point from the brief in the reader's own words, (2) make it concrete and relatable in one sentence, not generic, (3) present the service as the plain, low-friction resolution, ending in the low-commitment CTA.
- overlay_text: an OPTIONAL short hook line (3-6 words) that a separate design step will lay over the photo afterward — or null if the ad reads better with no on-image text at all. Never a full sentence, never the CTA itself.
- The implied CTA must be low-commitment (e.g. "Get a Free Quote", "Check If You Qualify") — never "Buy Now" or "Shop Now".
- visual_prompt: 3-5 sentences, cinematic and photorealistic, following the rules above. Show a scene that specifically proves the big idea from Step 1 — not just something generically relevant to ${businessName}.

If any screen, phone, laptop, sign, or document appears in the photo, it must show no readable text at all (blurred, angled away, or turned off) — this photo will never carry text of its own, so don't create a second, uncontrolled source of on-image text. A screen is only legible from directly in front of it — never show a person's face facing the camera AND a screen's front display also facing the camera in the same frame. Any handheld object must be one solid, seamless shape. Hands must have exactly five fingers each with natural, physically possible poses.

FINAL CHECK — before returning your answer, verify it against every line below and rewrite anything that fails silently, don't just note it:
1. Does "strategy.big_idea" name one specific idea — not a generic category like "confidence" or "affordability" on its own?
2. Did you pick exactly ONE desire type and ONE hook, each justified by a reason tied to THIS brief — not a reason that could apply to any ad in this industry?
3. Is the headline's number or benefit a real, plausible figure from the business context or brief, never invented for effect?
4. Does visual_prompt match the brand archetype from Step 3, not a generic version of the industry?
5. Does the visual default to a natural, authentic style unless the brand voice or brief calls for something more polished?
6. Does primary_text follow Problem → Agitate → Solve, in that order?
7. Is there any fabricated stat, testimonial, or urgency anywhere in the output? If yes, remove it and use a lever the business can honestly support instead.

Return ONLY valid JSON matching this schema. No markdown. No backticks. Every field inside "strategy" is one sentence, plain language, written so a business owner — not a marketer — could read and understand your reasoning. No jargon.
{
  "strategy": {
    "big_idea": "The single core idea this whole ad is built on, in one sentence",
    "desire_type": "FUNCTIONAL | EMOTIONAL | ASPIRATIONAL",
    "desire_reasoning": "Why this desire type fits this business and this brief",
    "brand_archetype": "CLINICAL-CLEAN | WARM-APPROACHABLE | LUXE-PREMIUM | BOLD-ENERGETIC | PLAYFUL",
    "hook_type": "the hook type you picked",
    "hook_reasoning": "Why this hook fits the brief better than the alternatives",
    "persuasion_principle": "the persuasion lever behind that hook (e.g. social proof, scarcity, authority, reciprocity, unity)",
    "persuasion_reasoning": "Why this lever fits this specific audience",
    "visual_reasoning": "Why this exact scene proves the big idea — not just why it's relevant to the business",
    "headline_reasoning": "Why this specific wording and number were chosen over other options"
  },
  "headline": "Punchy Facebook headline (max 6 words, must include specific benefit/number)",
  "primary_text": "Main ad copy text (2-4 sentences, Problem-Agitate-Solve, low-commitment CTA)",
  "overlay_text": "Short hook line (3-6 words) or null",
  "visual_prompt": "3-5 sentence cinematic visual description following the rules above"
}`;
}
