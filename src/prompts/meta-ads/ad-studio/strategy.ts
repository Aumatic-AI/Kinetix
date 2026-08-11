/** Marketing and ad-design knowledge, in one place. questions.ts and
 * generate.ts both read from here instead of repeating this reasoning
 * inline — this is the file to check or extend when the AI's strategy
 * or design judgement needs to change. */

export const HOOK_TYPES = `Pick exactly ONE — never stack more than one, or the ad starts to feel like a manipulative checklist instead of one clean idea:
- COST SAVINGS: a specific price comparison or percentage saved.
- PROOF (persuasion lever: social proof): a real number of customers served or a rating.
- FEAR REMOVAL: name a common hesitation and answer it directly.
- TRANSFORMATION: before vs. after framing.
- URGENCY (persuasion lever: scarcity): a real, believable scarcity signal.
- TRUST (persuasion lever: authority): credentials, accreditations, expert care — whatever is real for this business.
- RECIPROCITY (persuasion lever: reciprocity): lead with something genuinely free/given first (a free assessment, a guide, a no-obligation quote) before asking for anything.
- UNITY / BELONGING (persuasion lever: unity): frame the offer around identity or group ("for people who refuse to settle for X"), not just the outcome.

Never invent fake scarcity, fake numbers, or fake testimonials to force a hook to fit — if the business context doesn't honestly support a lever, pick a different one instead.`;

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
- Never describe on-image text, a logo, a price tag, or a discount graphic in the photo itself.
- Default to a natural, slightly imperfect, authentic photographic style — real environments, natural light, unposed body language — over glossy studio/stock-photo lighting, unless the brief specifically calls for a polished, styled look. Ads that look like organic content outperform ads that look like ads — a polished catalog-shot signals "advertisement" and gets scrolled past.
- If a person is in the photo, their gaze either meets the camera directly (builds trust — best for a TRUST/FEAR REMOVAL hook) or looks toward the bottom third where the hook line will land (guides the viewer's eye into it — best for an EMOTIONAL/ASPIRATIONAL hook).
- The scene's dominant colors should read as distinct from a typical blue-and-white feed UI — avoid washed-out, low-contrast, all-neutral color schemes unless the brand's own voice specifically calls for that muted look. A photo that visually interrupts the scroll performs better than one that blends into it.`;

export const BRAND_VISUAL_ARCHETYPES = `Pick the ONE archetype that best matches this business's own words about itself — never default to the same one every time just because it's the safe choice:
- CLINICAL-CLEAN: crisp, precise, evidence-led. Cool light, minimal clutter, a sense of expertise.
- WARM-APPROACHABLE: reassuring, human, unhurried. Soft natural light, relaxed body language.
- LUXE-PREMIUM: considered, unhurried, high-end. Rich but restrained light, deliberate composition.
- BOLD-ENERGETIC: confident, direct, forward-moving. Higher contrast, more dynamic posture and angle.
- PLAYFUL: light, human, a little unexpected. Genuine expression over posed formality.

Test: the same big idea photographed through a LUXE-PREMIUM lens should look visibly different from the same idea shot BOLD-ENERGETIC. If two different archetypes would produce the same photo, the archetype isn't actually being applied.`;

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
