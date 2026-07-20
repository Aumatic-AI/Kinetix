/**
 * Outreach (cold email) prompts. Ported from the legacy Outreach app's n8n
 * GPT-4o-mini agent — one templated email per campaign, personalized per
 * recipient via merge tags at send time (not a distinct AI-written line
 * per lead — that was never how the legacy system worked either, see the
 * build guide's "what's deliberately not in v1" section).
 */

export interface OutreachBusinessContext {
  name: string;
  industry?: string | null;
  core_offerings?: string | null;
  business_voice?: string | null;
  target_audience?: string | null;
  website_url?: string | null;
}

const STRUCTURE_RULES = `Return ONLY valid JSON — no markdown, no commentary:
{
  "subject": "under 60 characters, reads like a personal email, never like a mass campaign",
  "body": "2-4 short paragraphs. Must include the literal placeholders {{first_name}} and {{company}} naturally in the opening line. Never use ALL CAPS, never more than one exclamation mark in the whole email."
}`;

export function getOutreachDraftPrompt(
  business: OutreachBusinessContext,
  input: { goal: string; tone: string; messageBrief: string; serviceType: string; targetRegion: string; ctaText?: string; ctaLink?: string }
): { system: string; user: string } {
  const ctaLine = input.ctaText
    ? `\n\nEnd the email with a clear call to action using this exact button text as a short closing line: "${input.ctaText}"${input.ctaLink ? ` (linking to ${input.ctaLink})` : ""}.`
    : "";
  return {
    system: `You are an expert cold-email copywriter for ${business.name}, a ${business.industry || "business"}.

What we offer: ${business.core_offerings || "Not specified"}
Target audience: ${business.target_audience || "Not specified"}
Service focus for this campaign: ${input.serviceType}
Target region: ${input.targetRegion}
Requested tone: ${input.tone}

Write a single cold outreach email. It must feel personally written, not templated or salesy. Never use spam-trigger words (free, guaranteed, act now, limited time, buy now). Never make claims not supported by the business context above.${ctaLine}

${STRUCTURE_RULES}`,
    user: `Goal: ${input.goal}\n\nWhat to say: ${input.messageBrief}`,
  };
}

export function getOutreachRevisionPrompt(business: OutreachBusinessContext, input: { goal: string; tone: string; messageBrief: string; serviceType: string; targetRegion: string; ctaText?: string; ctaLink?: string }, previousContent: unknown, feedback: string): { system: string; user: string } {
  const base = getOutreachDraftPrompt(business, input);
  return {
    system: base.system,
    user: `Here is the previous draft:\n${JSON.stringify(previousContent, null, 2)}\n\nThe user asked for this change: "${feedback}"\n\nRewrite the email, applying that feedback, following the same JSON schema.`,
  };
}
