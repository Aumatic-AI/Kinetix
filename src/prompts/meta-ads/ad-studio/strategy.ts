/** Marketing and ad-design knowledge, in one place. questions.ts and
 * generate.ts both read from here instead of repeating this reasoning
 * inline — this is the file to check or extend when the AI's strategy
 * or design judgement needs to change. */

export const HOOK_TYPES = `- COST SAVINGS: a specific price comparison or percentage saved.
- PROOF: a real number of customers served or a rating.
- FEAR REMOVAL: name a common hesitation and answer it directly.
- TRANSFORMATION: before vs. after framing.
- URGENCY: a real, believable scarcity signal.
- TRUST: credentials, accreditations, expert care — whatever is real for this business.`;

export const DESIRE_TYPES = `Pick exactly ONE desire type for this ad, based on what the brief actually supports — never default to emotional automatically:
- FUNCTIONAL: what the service literally does (no downtime, one visit, a higher success rate).
- EMOTIONAL: how it feels (relief, confidence, no longer hiding something).
- ASPIRATIONAL: who it makes the person — the version of themselves they want to be seen as.`;

export const SOPHISTICATION_STRATEGY = `Read the self-performance data before choosing a style:
- Angle barely used yet: a direct claim is fine — state the benefit plainly.
- Angle already run several times: lead with a NEW mechanism or reason instead of repeating the same claim.
- Angle clearly worn out: drop the claim entirely and rely on a pure feeling/identification image — no explicit pitch at all.`;

/** Real ad-design research (scrim over solid box, one focal point, minimal
 * on-image text, subtle corner logo, native over banner) lives in the
 * compositor (src/services/creative-render/), since that's the code that
 * actually draws it. This is only what the PHOTO itself needs to leave
 * room for. */
export const AD_DESIGN_PRINCIPLES = `You are generating a PHOTO only — a separate design step lays a hook line over the LOWER portion of it afterward (a dark-to-transparent gradient, not a solid box). So:
- Keep the bottom third of the frame relatively simple and uncluttered — that's where the hook line will sit, legible over a darkened gradient.
- One dominant focal point only — the subject/scene must be the clearest, largest thing in frame, nothing competing with it.
- Never describe on-image text, a logo, a price tag, or a discount graphic in the photo itself.`;

export function safeZoneNote(aspectRatio: "1:1" | "4:5" | "9:16" | "16:9"): string {
  switch (aspectRatio) {
    case "9:16":
      return "This is a tall 9:16 frame — leave the top and bottom ~15% of the height clear of important detail (Meta's own UI covers those strips on vertical placements); keep the subject and any text negative space within the vertical middle.";
    case "16:9":
      return "This is a wide 16:9 frame — keep the subject and any text negative space at least 10% away from the left and right edges.";
    case "1:1":
      return "This is a square 1:1 frame — keep the subject and any text negative space at least 10% away from all four edges.";
    default:
      return "This is a 4:5 portrait frame — keep the subject and any text negative space at least 10% away from all four edges.";
  }
}
