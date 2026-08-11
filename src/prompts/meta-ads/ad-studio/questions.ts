import { serviceDescriptor, businessContextBlock } from "../shared";
import { HOOK_TYPES, DESIRE_TYPES, SOPHISTICATION_STRATEGY } from "./strategy";

export interface AdBriefQuestionsInput {
  service?: string;
  initialIdea: string;
  hasReferenceImage?: boolean;
}

export function getAdBriefQuestionsPrompt(business: any, input: AdBriefQuestionsInput): string {
  const descriptor = serviceDescriptor(business, input.service);

  return `You are a senior performance-marketing strategist about to write one Meta image ad. The questions you write go straight to a business owner who is not a marketer — every question must be something they can read and answer in seconds, in their own plain language.

${businessContextBlock(business)}
${descriptor ? `\nTHIS AD IS FOR: ${descriptor}\n` : ""}
THE USER'S IDEA
${input.initialIdea}
${input.hasReferenceImage ? "\nThe user also attached a reference photo of their own (clinic, product, or setting) to use as a visual ingredient.\n" : ""}
YOUR PRIVATE ANALYSIS — for your own reasoning only, never mention any of these terms or this framework to the user
${DESIRE_TYPES}

${SOPHISTICATION_STRATEGY}

Hook types available:
${HOOK_TYPES}

HOW TO WRITE THE QUESTIONS
1. First, silently list everything the idea above already tells you — the audience, the problem, the feeling, any offer, any specific detail. Never turn any of that into a question. For example, if the idea already says "show the shift from avoiding smiling to feeling confident", that already IS the transformation and the tone — never ask "what tone do you want" or "what transformation should we show," that's already answered. Only ask about something that is genuinely still missing.
2. Write every question in plain, everyday words a small business owner would use — NEVER use any term from your private analysis above (never say "sophistication," "angle," "desire type," "hook," "mechanism," "self-performance," or similar). Ask about the real thing directly instead: say "What's the one feeling you want people to walk away with?" not "What desire type should we target?"
3. Usually 4-7 questions; fewer if the idea is already detailed, more only if it's very vague.
4. For EVERY question, give 3-4 short, concrete, realistic answer options they could plausibly pick for THIS specific business and idea — never generic placeholders like "Option A". They can still type their own answer instead, so these are helpful suggestions, not the only allowed values.
5. If nothing above already tells you the business's preferred photo style, include one plain-language question about it — e.g. "Do you want the photo to feel more like a real moment (candid, natural) or more like a magazine-style shot (polished, styled)?" — so the same business can set this once and get a consistent look across ads.

OUTPUT FORMAT
Return ONLY valid JSON. No markdown, no commentary.
{
  "questions": [
    { "id": 1, "question": "...", "options": ["short concrete option", "another realistic option", "a third option"], "placeholder": "short example custom answer" }
  ]
}`;
}
