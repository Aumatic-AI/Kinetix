# Ad Prompt Upgrade Playbook
**For: Claude Code — rewriting `getStudioAdPrompt`, `getAdBriefQuestionsPrompt`, `strategy.ts`, `getAdEditPrompt`**

This is not a theory textbook. It's the minimum set of psychology, copy, and visual-design principles your current prompts are missing — each one mapped to a specific code change. Sources are inline. Implement top to bottom; each section is independent.

---

## 0. The one structural change everything else depends on

Right now the model outputs the *artifact* (headline, primary_text, overlay_text, visual_prompt) with no forcing function to think strategically first. Every improvement below only works if you add a **`strategy` object to the output schema** that the model must fill *before* it writes the artifact, and that gets shown to the client (per your call — this builds trust and also makes the model's output better, because reasoning-before-generation reduces cliché convergence).

New schema for `getStudioAdPrompt`:

```json
{
  "strategy": {
    "big_idea": "The single core idea/mechanism this whole ad is built on, in one sentence",
    "desire_type": "FUNCTIONAL | EMOTIONAL | ASPIRATIONAL",
    "desire_reasoning": "Why this desire type fits this business + this brief, in plain client-facing language",
    "hook_type": "one of the hook types",
    "hook_reasoning": "Why this hook fits the sophistication level and the brief",
    "persuasion_principle": "the primary Cialdini lever used (see §1)",
    "persuasion_reasoning": "why this lever, specifically, for this audience",
    "visual_reasoning": "Why this exact scene proves the headline — not just 'relevant to the business'",
    "headline_reasoning": "Why this specific phrasing/number was chosen over alternatives"
  },
  "headline": "...",
  "primary_text": "...",
  "overlay_text": "... | null",
  "visual_prompt": "..."
}
```

Every reasoning field should be **one sentence, plain language, client-readable** — not marketing jargon. Same "translate the theory into a business owner's words" rule your `getAdBriefQuestionsPrompt` already applies to its questions should apply here to the *answers*.

Add one line to the system instructions of `getStudioAdPrompt`:
> "Every choice you make — the hook, the desire type, the visual, the headline wording — must have a specific reason tied to this business and this brief. If you can't articulate why a choice beats the obvious alternative, pick a different choice."

That last sentence matters more than it looks — it's what stops the model from defaulting to the safest, most generic option.

---

## 1. Expand `HOOK_TYPES` into full Cialdini coverage

Your current six hook types already smuggle in three of Cialdini's seven principles (PROOF ≈ social proof, TRUST ≈ authority, URGENCY ≈ scarcity) but do it without naming the mechanism, which means the model can't reason about *when* each one applies. Cialdini's seven levers — reciprocity, commitment/consistency, social proof, authority, liking, scarcity, and unity — are levers that <cite index="4-1">describe how people are influenced, but not when or why to use each one</cite>, which is exactly the gap your `strategy.persuasion_reasoning` field (§0) should close.

Add two missing levers as new hook types:

- **RECIPROCITY**: lead with something genuinely free/given first (a free assessment, a guide, a no-obligation quote) before asking for anything — <cite index="7-1">offering genuine value up front creates a sense of indebtedness that increases the likelihood of a positive response</cite>.
- **UNITY / BELONGING**: frame the offer around identity/group ("for people who refuse to settle for X"), not just outcome. This is the principle behind why identity-driven brands build the deepest loyalty — <cite index="9-1">identity is the deepest moat in marketing</cite>.

Keep your existing rule that the model must pick exactly ONE and justify it — don't let it stack levers, that's how ads end up feeling like a manipulative checklist instead of one clean idea.

**Ethics guardrail to add explicitly to the prompt** (cheap insurance against brand damage): never generate fake scarcity, fake numbers, or fake testimonials to satisfy a hook. If the brief/business context doesn't support a lever honestly, the model should fall back to a lever it *can* support. This is directly stated in your existing "Do NOT invent stats, claims, or proof" line — just extend it explicitly to cover manufactured urgency and fake social proof, since <cite index="9-1">manufactured urgency and fake reviews destroy brand trust faster than any campaign can rebuild it, even though they work in the short term</cite>.

---

## 2. Add a "Big Idea" step before hook selection (Eugene Schwartz / Ogilvy)

This is the single highest-leverage addition. Right now the model goes brief → hook → headline/visual in one pass, which is why AI ad copy often feels like disconnected pieces. Insert a mandatory intermediate step in `getStudioAdPrompt`:

> "Before choosing a hook, state the ONE big idea this entire ad will be built around — the single thought that connects the headline, the copy, and the visual. Every other field must derive from this idea, not run in parallel with it."

This is a direct application of the classic direct-response principle (Schwartz, *Breakthrough Advertising*; Ogilvy, *Confessions of an Advertising Man*): a "big idea" test is whether the visual and the headline could be swapped between two different ads without anyone noticing — if yes, there's no big idea, just decoration.

Concretely: your current `visual_prompt` instruction already says "not just something generically relevant to businessName" — good instinct, but it's asking for the *symptom* of a big idea without asking for the *idea itself*. Adding the explicit big-idea field fixes the root cause.

---

## 3. Specificity principle — tighten the headline rule

Your rule "headline: max 6 words, must include a specific benefit or number" is already correct and backed by long-standing direct-response research (Claude Hopkins, *Scientific Advertising*): concrete, specific numbers read as more credible than vague superlatives ("throughout" vs "fast"). Strengthen it with one clarifying line so the model doesn't cheat with vague pseudo-numbers:

> "The number or benefit must be a plausible real figure for this business (from the business context or brief) — never a round, generic-sounding number invented for effect (e.g. avoid '10X better' unless the data actually supports it)."

---

## 4. Brand DNA — the part actually missing for "crafted with the brand"

This is the gap behind your core ask. `businessContextBlock(business)` presumably passes name/industry/tone in prose, but there's no structured slot forcing the visual and copy to lock onto a consistent brand identity across generations. Since this is a multi-brand hosted system (not single-tenant), each brand needs a **Brand DNA object** captured once and reused on every generation:

```ts
interface BrandDNA {
  visualTone: "clinical-clean" | "warm-approachable" | "luxe-premium" | "bold-energetic" | "playful";
  colorPalette?: string[];        // hex codes, used to steer visual_prompt lighting/props, not painted text
  photographyStyle: "native-authentic" | "editorial-polished" | "studio-clean";
  voiceDescriptors: string[];     // e.g. ["reassuring", "no-jargon", "direct"]
  avoid: string[];                // things this brand never wants shown/said (e.g. "no clinical white coats")
}
```

Feed this into `getStudioAdPrompt` as its own labeled block, and add an instruction:
> "The visual_prompt's lighting, setting, and mood must match this brand's `visualTone` and `photographyStyle` — the same idea should look different for a luxe-premium brand than a bold-energetic one."

This is what turns "generic AI ad photo" into "this brand's ad photo" without hand-holding every single generation.

---

## 5. Visual psychology — additions to `AD_DESIGN_PRINCIPLES`

Your current design principles (bottom-third clearance, single focal point, no baked-in text) are correct fundamentals. Add three more that materially change output quality:

**a. Native over polished, by default.** This is the single biggest 2026 finding in Meta creative performance: <cite index="12-1">ads that look like ads often underperform ads that look like organic content, because polished production value signals "advertisement" to the feed-trained user's pattern-recognition system and the response is automatic — scroll past</cite>. Add to `AD_DESIGN_PRINCIPLES`:
> "Unless the brand's `photographyStyle` is explicitly editorial-polished or studio-clean, default to a natural, slightly imperfect, authentic photographic style — real environments, natural light, unposed body language — over glossy studio/stock-photo lighting. The photo should look like it could be a real customer moment, not a catalog shot."

This directly answers "how do I make these look less like generic AI stock photos" — it's not a prompt-wording trick, it's choosing the right aesthetic target in the first place.

**b. Gaze and eye-line direction.** If a person is in the photo, their gaze should either meet the camera (builds direct trust/connection — best for TRUST/AUTHORITY hooks) or look toward the open space where the overlay text will land (guides the viewer's eye into the hook — best for EMOTIONAL/ASPIRATIONAL hooks). Add this as a one-line rule and let the model choose based on `hook_type`.

**c. Color contrast as a pattern-interrupt.** Add: "The dominant color(s) in the scene should read as distinct from a typical blue/white Meta feed UI, so the photo visually interrupts the scroll — avoid washed-out, low-contrast, or all-neutral color schemes unless the brand's palette specifically calls for it." This operationalizes the general "scroll-stopping visual" requirement that shows up consistently in 2026 creative research as one of the five traits shared by top-performing image ads.

---

## 6. Copy scaffolding for `primary_text`

Your rule (2-4 short sentences, plain language, low-commitment CTA) is good but freeform. Give the model an explicit, provable structure to hit reliably — PAS (Problem → Agitate → Solve), the oldest reliable direct-response copy skeleton:

> "Structure primary_text as: (1) name the specific pain point from the brief in the reader's own words, (2) make it concrete/relatable in one sentence — not generic, (3) present the service as the plain, low-friction resolution, ending in the low-commitment CTA."

This keeps output consistent across hundreds of generations instead of quality varying by how well the model "felt" that particular prompt.

---

## 7. `getAdBriefQuestionsPrompt` — one addition

This file is already well-built (plain-language translation of the private framework is a genuinely good pattern — keep it exactly as is). One addition: have it also ask about brand visual preference in plain language if the brand doesn't already have a saved Brand DNA object, e.g. *"Do you want the photo to feel more like a real moment (candid, natural) or more like a magazine-style shot (polished, styled)?"* — this is the plain-English version of `photographyStyle` and lets a brand set it once.

---

## 8. `getAdEditPrompt` — no change needed

This one is already tightly scoped and correct (do exactly what's asked, touch nothing else). Leave it.

---

## 9. Quick QA checklist for the rewritten prompts

Before shipping, verify the new prompts force the model to satisfy all of these, in order, for every generation:
1. States one Big Idea (§2)
2. Picks ONE desire type + ONE hook/persuasion lever, with plain-language reasoning tied to *this* brief (§0, §1)
3. Headline number/benefit is plausible and specific (§3)
4. Visual matches the brand's saved visual DNA, not a generic version of the industry (§4)
5. Visual defaults to native/authentic look unless brand says otherwise (§5a)
6. primary_text follows Problem→Agitate→Solve (§6)
7. No fabricated stats, testimonials, or urgency (§1 guardrail)

---

## Sources
- Cialdini, R. — *Influence: The Psychology of Persuasion* (1984); *Pre-Suasion* (2016) — seven principles of persuasion
- Schwartz, E. — *Breakthrough Advertising* — market sophistication stages, "big idea" concept (already partially reflected in your `SOPHISTICATION_STRATEGY`)
- Ogilvy, D. — *Confessions of an Advertising Man*, *Ogilvy on Advertising* — big idea test, headline specificity
- Hopkins, C. — *Scientific Advertising* — specificity principle, testable claims
- CXL / Cognitigence / ADGY — 2026 execution guides on Cialdini's principles in digital ads
- SEA Digital, AdStellar, Superscale, GetHookd — 2026 Meta creative performance research on native-vs-polished aesthetic and format specs
