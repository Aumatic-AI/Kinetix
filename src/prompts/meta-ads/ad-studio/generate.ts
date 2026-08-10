import { serviceDescriptor, businessContextBlock } from "../shared";
import { HOOK_TYPES, DESIRE_TYPES, SOPHISTICATION_STRATEGY, AD_DESIGN_PRINCIPLES, safeZoneNote } from "./strategy";

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

${descriptor ? `THIS AD IS SPECIFICALLY FOR: ${descriptor}. Every claim and visual must be about this service — never blend in another.\n\n` : ""}IDEA
${input.initialIdea}

BRIEF (the user's answers to your own questions)
${briefText}

=== HISTORICAL PERFORMANCE ===
Current winning angle: ${winningAngle}
${creativeDirectives.length ? creativeDirectives.map((d) => `- ${d}`).join("\n") + "\nYou MUST follow these directives or the ad will fail." : "No live-performance directives yet — rely on the brief and market data instead."}

${bestHookFormula ? `PROVEN HOOK FORMULA FROM MARKET DATA: ${bestHookFormula}\n\n` : ""}HOOK & STRATEGY
${DESIRE_TYPES}

${SOPHISTICATION_STRATEGY}

Hook types available:
${HOOK_TYPES}

Do NOT invent stats, claims, or proof not present in the business context, brief, or intelligence above.

${AD_DESIGN_PRINCIPLES}
${safeZoneNote(input.aspectRatio)}

COPY RULES
- headline: max 6 words, must include a specific benefit or number.
- primary_text: 2-4 short sentences, plain language, speaks to the pain point in the brief.
- overlay_text: an OPTIONAL short hook line (3-6 words) that a separate design step will lay over the photo afterward — or null if the ad reads better with no on-image text at all. Never a full sentence, never the CTA itself.
- The implied CTA must be low-commitment (e.g. "Get a Free Quote", "Check If You Qualify") — never "Buy Now" or "Shop Now".
- visual_prompt: 3-5 sentences, cinematic and photorealistic, following the rules above. Show a scene that specifically supports the headline/hook you chose — not just something generically relevant to ${businessName}.

If any screen, phone, laptop, sign, or document appears in the photo, it must show no readable text at all (blurred, angled away, or turned off) — this photo will never carry text of its own, so don't create a second, uncontrolled source of on-image text. A screen is only legible from directly in front of it — never show a person's face facing the camera AND a screen's front display also facing the camera in the same frame. Any handheld object must be one solid, seamless shape. Hands must have exactly five fingers each with natural, physically possible poses.

Return ONLY valid JSON matching this schema. No markdown. No backticks.
{
  "headline": "Punchy Facebook headline (max 6 words, must include specific benefit/number)",
  "primary_text": "Main ad copy text (2-4 sentences, low-commitment CTA)",
  "overlay_text": "Short hook line (3-6 words) or null",
  "visual_prompt": "3-5 sentence cinematic visual description following the rules above"
}`;
}
