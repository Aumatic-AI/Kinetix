import { serviceDescriptor, businessContextBlock } from "./shared";

/** Each script line becomes one fixed ~4-second video scene, so the number
 * of scenes is what actually determines the final stitched video's length.
 * Accepts either a plain number of seconds (Social's `duration`) or a
 * dropdown string like "40 seconds" (Meta Ads' `duration`). */
export function sceneCountForDuration(duration: string | number | undefined): number {
  const seconds = typeof duration === "number" ? duration : parseInt(String(duration || "").match(/\d+/)?.[0] || "28", 10);
  return Math.max(4, Math.round(seconds / 4));
}

/** The 8 narrative shapes a video ad can take. Fixed-but-rich on purpose —
 * NOT a free-form "invent any structure," because each mode needs its own
 * tailored act-by-act writing guidance to keep output quality high; an
 * unbounded, model-invented structure has no such scaffold. The model
 * picks exactly ONE per video, based on the idea + business context —
 * never defaulted to TRANSFORMATION just because that's the original
 * use case this was built for. */
export const AD_MODES = `- TRANSFORMATION: a specific person's before/after journey — genuine personal transformation stories only.
- PROMOTION_OFFER: a sale, discount, or limited-time deal — the offer itself is the point.
- SERVICE_SPOTLIGHT: introduces and explains one specific service or offering.
- BRAND_INTRO: general awareness — who this business is, what makes it different, an invitation to visit.
- TESTIMONIAL_PROOF: leans on real social proof (reviews, ratings, outcomes people report) rather than one personal journey.
- EDUCATIONAL_AUTHORITY: teaches or corrects a common question/misconception, building trust through expertise.
- ANNOUNCEMENT: introduces something genuinely new (a new service, location, product, or feature).
- EVENT_SEASONAL: tied to a specific time-bound occasion — a season, holiday, or limited dates.`;

/** Per-mode 3-act writing guidance. Every mode keeps the same proven shape
 * (hook first, three beats, one throughline) — only WHAT each beat covers
 * changes per mode, never the underlying discipline that keeps a script
 * tight and scroll-stopping. */
export const AD_MODE_STRUCTURES: Record<string, string> = {
  TRANSFORMATION: `ACT 1 — PROBLEM (hook + escalation). Line 1 is the HOOK — the first 2 seconds decide if the listener stays. Each line must combine: character name + emotional state word, the SPECIFIC problem, and a recognisable everyday moment.
  The moment comes from the idea/brief above FIRST, always — if it already describes or clearly implies a specific situation, setting, or moment, use exactly that, don't substitute a different one you invented. Only when the idea genuinely doesn't specify one do you invent a fitting moment yourself — and even then it can be absolutely anything a real person's life actually touches (home, family, a relationship, a hobby, exercise, travel, a health checkup, a quiet moment completely alone, or, yes, sometimes work): never assume or default to any one of these just because it's common or was used last time, and vary your choice across different scripts rather than settling on the same reliable one repeatedly. In short: follow the idea's own specifics when it has them; only fall back to inventing (with real variety, not a default) when it doesn't.
  Format: "[Name] feels [emotion] about [problem] when [moment]." or "[Name] hides [problem] every time [moment]."
  GOOD (format example only — invent your own moment, don't reuse this one): "James feels embarrassed by his receding hairline every time he meets new people at work."
  BAD: "James has a hair problem." (vague) / "James thinks about getting help." (no emotional pain)
ACT 2 — THE BUSINESS'S JOURNEY. Narrate the calm, supported path using only these safe verbs: discovers, lands, meets, listens, examines, explains, plans, guides, supports, reassures. Pick beats to fill your line budget, in order: Decision (discovers the business and books a consultation) -> First contact (arrival or first real interaction with the team) -> Expert (meets the specialist who listens and plans the path) -> Confidence (feels safe and understood). Tone: warm, reassuring, calm.
ACT 3 — NEW STATE (payoff). Narrate the change as LIVED MOMENTS with WITNESSES who notice — never as a tagline. Second-to-last line: a first confident behaviour in daily life. Final line: the strongest emotional payoff, through one concrete moment — mirror whatever kind of moment Act 1 actually used (a birthday, a photo, and a family are just two examples below, not the default; the payoff moment should feel like it belongs to the same specific life Act 1 already set up, not a generic one bolted on).
  STRONG FINAL LINES (illustrating the FEELING to hit, not the specific moment to copy): "James laughs open-mouthed at his daughter's birthday and his family freezes in surprise." / "Sarah steps into the family photo without hesitation for the first time in years."
  Never end with a CTA, a slogan, a price, or a website — the transformation must speak for itself.`,
  PROMOTION_OFFER: `ACT 1 — THE OFFER, STATED PLAINLY. Line 1 is the HOOK — lead with the specific deal itself (only real figures/dates present in the business context or brief — never invent one). No vague teasing ("something special is coming") — say what it actually is.
ACT 2 — WHY IT'S GENUINELY GOOD. Explain what's included and remove hesitation (e.g. no strings attached, easy to claim, real value) — concrete, not generic hype.
ACT 3 — URGENCY + CTA. State the real time/quantity constraint if one exists in the brief, then a direct spoken call to action. Unlike other modes, ending on a clear CTA/price mention here is correct, not a mistake — that's the whole point of a promotional ad.`,
  SERVICE_SPOTLIGHT: `ACT 1 — THE NEED. Hook on the specific question or need this service answers — concrete and relatable, not a category label.
ACT 2 — WHAT IT ACTUALLY IS. Plainly explain what the service does or involves, in everyday words a non-expert would use — no jargon.
ACT 3 — REASSURANCE + CTA. Why this is a safe, easy choice (credibility, ease, support), then an inviting call to action.`,
  BRAND_INTRO: `ACT 1 — WHO WE ARE, IN ONE LINE. Hook on a single sentence that captures what this business is about or stands for.
ACT 2 — WHY TRUST US. Warm, plain-language beats on values, what's different, real credibility or achievements — grounded in the business's own context, never invented.
ACT 3 — INVITATION. A warm, open invitation to visit or learn more — no hard sell.`,
  TESTIMONIAL_PROOF: `ACT 1 — THE PROOF, UP FRONT. Hook on a real, specific piece of social proof from the business context (a rating, a real outcome pattern) — if no real figure exists, hook on a plain "people genuinely love this" framing instead; never invent a number.
ACT 2 — WHAT PEOPLE SAY. The essence of real, generalized customer sentiment in plain words — never a fabricated quote attributed to a specific named person unless real data supports it.
ACT 3 — WHY IT MATTERS + CTA. Tie the proof back to what the viewer can expect for themselves, then invite action.`,
  EDUCATIONAL_AUTHORITY: `ACT 1 — THE QUESTION. Hook on a common question or misconception, stated the way a real person would actually ask or think it.
ACT 2 — THE ANSWER. Teach or correct it simply and usefully, in the business's own voice — genuinely informative, not a disguised pitch.
ACT 3 — WHY THIS BUSINESS + CTA. Connect the expertise just shown back to this business's own credibility, then an inviting call to action.`,
  ANNOUNCEMENT: `ACT 1 — SOMETHING NEW. Hook by naming what's new (a service, location, product, or feature) plainly and with genuine energy.
ACT 2 — WHAT IT MEANS FOR THEM. Explain why this new thing actually matters to the viewer specifically, not just that it exists.
ACT 3 — CTA. Invite them to be among the first to try or see it.`,
  EVENT_SEASONAL: `ACT 1 — THE OCCASION. Hook by naming the specific season, holiday, or date window this ad is tied to.
ACT 2 — WHAT'S HAPPENING. What's on offer around this occasion — real details only, from the business context or brief.
ACT 3 — URGENCY + CTA. The real date window, then an inviting call to action before it ends.`,
};

/** Modes that center one person's story and benefit from a consistently
 * named protagonist. Everything else may be written in second person or
 * about the business itself, with no named individual required. Exported
 * so generate-video-ad.ts can skip resolving a reference-photo face-lock
 * entirely for modes that don't center one person — that lock should
 * never be forced onto every video regardless of what the ad is about. */
export const MODES_WITH_PROTAGONIST = new Set(["TRANSFORMATION", "PROMOTION_OFFER", "TESTIMONIAL_PROOF"]);

/** Cinematic color-grade phrase per brand archetype (the script-generation
 * call picks one of these as `visual_mood`, the same way it picks
 * `ad_mode`) — shared by the Meta Ads and Social video jobs so a fixed
 * "medical tourism, golden 3200K" style sentence never goes out for every
 * video regardless of business or story. */
export const MOOD_CINEMATOGRAPHY: Record<string, string> = {
  CLEAN_PRECISE: "a cool, crisp color grade with minimal contrast and clean, evidence-led lighting",
  WARM_APPROACHABLE: "a warm, soft color grade with gentle, reassuring natural light",
  PREMIUM_CONSIDERED: "a rich but restrained color grade, deep warm tones, unhurried and deliberate lighting",
  BOLD_ENERGETIC: "a high-contrast, saturated color grade with confident, dynamic lighting",
  PLAYFUL: "a bright, light color grade with a little unexpected energy",
};

export function getVideoAdScriptPrompt(intelligence: any, creative: any): string {
  const business = intelligence.business || {};
  const competitor = intelligence.competitor || {};
  const self = intelligence.self || {};

  const businessName = business.name || "the business";
  const winningAngle = self?.winning_patterns?.best_angle || "Not enough data yet";
  const creativeDirectives: string[] = self?.creative_directives || [];
  const bestHookFormula = competitor?.hook_analysis?.best_hook_formula;
  const topHooks = (competitor?.hook_analysis?.top_hook_patterns || [])
    .slice(0, 3)
    .map((p: any) => p.example)
    .filter(Boolean);
  const descriptor = serviceDescriptor(business, creative.service);
  const language = creative.language && creative.language !== "English" ? creative.language : null;
  const sceneCount = sceneCountForDuration(creative.duration);
  // Conservative words-per-second estimate (natural pace, not a rushed
  // reading) — deliberately lower than a raw speech-rate average, since
  // the generated audio running even slightly longer than the fixed-length
  // video underneath it cuts the narration off mid-word. Undershooting
  // this budget is a safe outcome; overshooting it is not.
  const targetWords = Math.round(sceneCount * 4 * 2.0);

  return `${language ? `OUTPUT LANGUAGE: Write the ENTIRE script in ${language}. Every single line must be in ${language}, not English. Do not mix languages.\n\n` : ""}Generate the voiceover script from this input. Return only the JSON object — no other text.

Input:
{
  "duration": "${creative.duration || "28 seconds"}",
  "audioStyle": "${creative.audioStyle || "Voiceover"}",
  "videoStyle": "${creative.videoStyle || "Cinematic"}",
  "idea": "${creative.ideaPrompt || ""}",
  "character": "${creative.character || "male"}"
}

You are an expert voiceover scriptwriter for ${businessName}, a ${business.industry || "business"}.

${businessContextBlock(business)}

PROVEN HOOKS FROM MARKET INTELLIGENCE (use as inspiration for the opening line, never copy verbatim): ${JSON.stringify(topHooks)}
${bestHookFormula ? `Proven hook formula: ${bestHookFormula}` : ""}

You write AUDIO ONLY. Your output is spoken narration that will be read aloud by ElevenLabs TTS over background music. No camera directions, no shot lists, no on-screen text — just the words the voice will say.

=== HISTORICAL PERFORMANCE RULES (FROM YOUR LIVE ADS) ===
Our current winning angle is: ${winningAngle}
MANDATORY DIRECTIVES BASED ON REAL AD DATA:
${creativeDirectives.length ? creativeDirectives.map((d: string) => `- ${d}`).join("\n") : "- No live-performance directives yet."}
You MUST follow these directives or the ad will fail.

STEP 0 — DECIDE THE AD'S MODE (do this first, silently — this decides everything below)
Read the idea and the business context, then pick exactly ONE mode that genuinely fits — never default to TRANSFORMATION just because it's the most detailed option below. Be able to justify your choice from the idea itself.
${AD_MODES}

Convert the idea in the input into a polished voiceover script with a clean arc and TTS-friendly rhythm, following the ACT STRUCTURE for your chosen mode:

${Object.entries(AD_MODE_STRUCTURES).map(([mode, structure]) => `--- ${mode} ---\n${structure}`).join("\n\n")}

Required fields:
- idea       → source description of what this ad should be about
- duration   → total audio length in seconds
- character  → male / female / couple (only relevant for modes with a protagonist)

${descriptor ? `THIS AD IS SPECIFICALLY FOR: ${descriptor}. Every claim must be about this service — never blend in another.\n\n` : ""}IF YOUR MODE HAS A PROBLEM/NEED AT ITS CORE (TRANSFORMATION, PROMOTION_OFFER, SERVICE_SPOTLIGHT)
Before writing Act 1, silently work out: what specific real-world need or dissatisfaction is this idea actually about${descriptor ? ` — this is for "${descriptor}", so ground your answer in what that service actually treats` : ""}? Then write 2-3 concrete, natural ways a real person would describe it (specific and sensory, never a vague "something is wrong"). Use that grounding for every relevant line below.

IF YOUR MODE CENTERS ONE PERSON'S STORY (TRANSFORMATION, PROMOTION_OFFER following a customer, TESTIMONIAL_PROOF)
ASSIGN ONE NAME, use it throughout:
- Male:   James, David, Mark, Daniel, Thomas, Michael
- Female: Sarah, Emma, Maria, Anna, Lisa, Sophia
- Couple: Mark and Anna, David and Lisa, Thomas and Emma
Use the character's name in line 1 at minimum; other lines use he / she / they. Never switch the name or pronoun — check every line before returning.

IF YOUR MODE IS NOT ABOUT ONE PERSON'S STORY (BRAND_INTRO, EDUCATIONAL_AUTHORITY, ANNOUNCEMENT, EVENT_SEASONAL)
Write in second person ("you") or about the business directly — no named individual required.

LINE COUNT AND LENGTH — EXACT, NOT A GUIDELINE
Each script line becomes one fixed ~4-second video scene downstream — the final video's length is EXACTLY (number of lines x 4) seconds, a hard technical constraint, not a stylistic choice. The script array MUST have EXACTLY ${sceneCount} lines — no more, no fewer — to produce a ${sceneCount * 4}-second video for the requested ${creative.duration || "28 seconds"}.
HARD CONSTRAINT: total word count across all ${sceneCount} lines must NOT exceed ${targetWords} words — stay at or under this, never noticeably over. This is not a soft guideline: if the spoken narration runs longer than the fixed-length video underneath it, the audio gets cut off mid-word when the video ends, which is a broken, unusable result. Aim for meaningfully under the limit, not right at the edge of it — a slightly shorter script that finishes speaking with room to spare is always the safer choice over one that risks running long.
Each line = ONE complete sentence, 6-9 words. Hard cap at 10 words — a line at the cap is already a full scene's worth of natural spoken pace, so most lines should be shorter than that, not at it.

TTS-FRIENDLY WRITING RULES
- End every line with a period. One sentence per line. Use commas for natural breath pauses inside a line.
- NEVER use: em dashes, semicolons, colons, ellipses, quote marks, parentheses, asterisks, hashes, slashes, ALL CAPS.
- Plain, conversational ${language || "English"} at a natural everyday reading level${language ? "" : " (5th-8th grade)"}. Spell out numbers under twenty. Avoid abbreviations${language ? "" : ", foreign words"}, technical jargon.
- Mention "${businessName}" by name AT MOST ONCE across the whole script, at the point where it's most natural for your chosen mode's structure.
- Avoid tongue-twisters, clusters of similar consonant sounds, and rare or hard-to-pronounce words — prefer short, common, everyday words a voice actor could read smoothly in one breath. This is spoken narration, so clarity of delivery matters as much as meaning.

HARD CONSTRAINT — NEVER INVENT A NUMBER, OFFER, OR DATE
Do not state any price, percentage, discount, or date anywhere in the script unless that exact figure is explicitly present in the business context or brief above. This applies especially to PROMOTION_OFFER and EVENT_SEASONAL — a real, specific offer is welcome and expected in those modes, but only ever the real one, never a plausible-sounding invented one.

FORBIDDEN CONTENT — ALWAYS
1. Body-shaming words: fat, ugly, gross, deformed, hideous
2. One-time accidents as the cause (fell off a ladder, car crash) unless the idea explicitly describes one
3. Multi-action sentences (he sits and smiles and drinks)
4. Quotation marks, em dashes, asterisks, emojis, hashtags, ALL CAPS
5. Dialogue ("he says", "she tells him")
6. Naming competitors, other clinics, or other brands
7. Switching identity, gender, age, or name mid-script
8. Repeating the business name more than once across the whole script

IF (AND ONLY IF) YOUR MODE IS TRANSFORMATION *AND* THIS BUSINESS'S OWN INDUSTRY/OFFERINGS ABOVE ARE HEALTH, MEDICAL, OR COSMETIC
Also forbid, in addition to the list above:
1. Surgical, procedural, or recovery descriptions
2. Pain, blood, needles, instruments, side effects, risks
3. Medical jargon (e.g. alopecia, malocclusion, obesity, rhinophyma) — describe things the way a real person would, not a clinician
4. Time markers (three weeks later, six months on, before, after, suddenly)
Never narrate: surgery, anesthesia, instruments, pain, recovery, swelling, stitches, specific medical/technical procedure names, risk/complication/warning/side-effect language.
For any other mode, or any other kind of business, this section does not apply — do not apply medical-sensitivity language to a business or ad type it has nothing to do with.

OUTPUT FORMAT — STRICT
Return ONLY valid JSON. No markdown fences. No commentary. No preamble.

{
  "ad_mode": "one of: ${Object.keys(AD_MODE_STRUCTURES).join(" | ")}",
  "visual_mood": "one of: CLEAN_PRECISE | WARM_APPROACHABLE | PREMIUM_CONSIDERED | BOLD_ENERGETIC | PLAYFUL",
  "script": [
     "Line one.",
     "Line two.",
     "Line three.",
     "Line four."
  ]
}

Rules:
- "ad_mode" must be exactly one of the 8 modes above, chosen genuinely, not defaulted.
- "visual_mood" is the ONE visual archetype that best matches this business's own voice/description above — pick deliberately, never the same one every time just because it's safe.
- "script" must be a JSON array of strings, one sentence per element, in order.
- Array length must exactly match the line-count-by-duration rule above.
- No extra fields, no trailing commas.

SELF-CHECK BEFORE RETURNING (silently confirm each):
1. ad_mode genuinely fits the idea — not defaulted to TRANSFORMATION out of habit
2. The chosen mode's ACT STRUCTURE was followed, not the wrong mode's
3. If a protagonist mode: same name and pronouns in every line
4. Line 1 is a scroll-stopping HOOK matching the chosen mode's Act 1
5. Script array has EXACTLY ${sceneCount} elements — no more, no fewer
6. Count the actual total words across every line — it must be AT OR UNDER ${targetWords}, not just "close." If it's over, shorten lines now, before returning, not after.
7. "${businessName}" appears at most once
8. No fabricated number, price, or date anywhere
9. Medical-sensitivity list applied only if TRANSFORMATION + a genuinely health/medical/cosmetic business — never otherwise
10. No forbidden punctuation, abbreviations, or characters
11. JSON is valid, script is an array of strings, no markdown fences, no extra fields
${language ? `12. Every single line is written entirely in ${language} — not English, not mixed\n` : ""}If any check fails, fix before returning.
`;
}

export function getVisualPromptsPrompt(scriptLines: string[], creative: any, business?: any): string {
  const businessName = business?.name || "the business";
  const n = scriptLines.length;
  const descriptor = serviceDescriptor(business, creative?.service);
  const protagonistGender = creative.character || "male";
  const hasReferenceImage = !!creative.hasReferenceImage;
  const adMode: string = creative.adMode || "TRANSFORMATION";
  const isTransformation = adMode === "TRANSFORMATION";
  const hasProtagonist = MODES_WITH_PROTAGONIST.has(adMode);
  const isPosterMode = creative.videoMode === "animated_poster";
  const hasLogo = !!creative.hasLogo;
  const brandColor: string | null = creative.brandColor || null;

  return `Generate visual prompts for the script below. Return ONLY the JSON object — no markdown, no preamble.

INPUTS
- Business: ${businessName}
- Ad mode: ${adMode}
- Video format: ${isPosterMode ? "ANIMATED POSTER & GRAPHICS — every scene is a designed graphic composition, not live-action photography (see the POSTER MODE section below)" : "LIVE ACTION — photorealistic scenes"}
- Character gender: ${creative.character || "male"} (only relevant if this mode has a protagonist — see below)
- Video style: ${creative.videoStyle || "Cinematic"}
- Duration: ${creative.duration || "28 seconds"}
- Scenes to generate: ${n}

SCRIPT LINES (one prompt per line, in order)
${scriptLines.map((item, index) => (index + 1) + ". " + item).join("\n")}

MANDATORY EXECUTION
Generate exactly ${n} objects in visual_prompts, in the same order as the lines above. Script content is the HARD rule for what each scene shows — never invent a different subject or setting than what the line describes.

${isPosterMode ? `POSTER MODE — every scene is a designed graphic, not a photograph
This entire video is a sequence of composed, poster-style graphics with slow camera movement — think of it as a real, professionally designed motion-graphic ad, the kind many brands actually run as social ads, not a photo slideshow. All ${n} scenes must look like ONE consistent design system, not ${n} different ads stitched together — decide these three things ONCE, before writing scene 1, then describe them in the EXACT SAME words in every single scene's prompt below, changing only the on-scene text and any scene-specific photo/element:
- BACKGROUND: ${brandColor ? `this business's real brand color is ${brandColor} — use it (or one specific, fixed gradient/variant of it, decided once) as the primary color of every scene's background, never a generic guessed color and never a different color per scene.` : "one specific, deliberately designed background treatment matching the visual mood below (a solid or gradient color, soft abstract accents, a faint motif genuinely relevant to this business) — decide the exact treatment once and reuse it, word-for-word, in every scene."} Never a blank or generic template, and never a different background style from one scene to the next.
- TYPOGRAPHY: decide ONE specific font style/treatment once (e.g. "bold modern sans-serif headlines in white") and describe it identically in every scene's prompt — never a different font style, weight, or text color scheme per scene.
- PHOTO/ELEMENT (optional): if this specific scene benefits from a photo or icon-like element, integrate it as one part of the composition, not a full-bleed background. Not every scene needs a photo — a scene may also be a purely typographic/graphic composition, an icon or symbol representing the service, or an abstract design moment.
${hasLogo ? `- LOGO: a reference image of this business's logo is attached alongside this prompt — incorporate it into this scene ONLY if it genuinely fits (small, unobtrusive, undistorted); do not force it into every single scene.` : `- This business has no logo on file — do not depict a logo or brand mark.`}
- ACCENTS: decide ONE recurring accent motif once (e.g. "a thin gold divider line above the CTA area") and describe it identically wherever it appears — genuinely tied to this business, never unrelated decoration, and never a different accent style per scene.

For this mode, the IMAGE PROMPT FORMULA and VIDEO SCENARIO FORMULA below are replaced with:
IMAGE PROMPT FORMULA (poster mode): [BACKGROUND TREATMENT, identical wording every scene] + [TYPOGRAPHY STYLE, identical wording every scene] + [PHOTO/ELEMENT, if any] + [ON-SCENE TEXT for this line, quoted exactly] + [ACCENTS, identical wording every scene] + [overall composition/framing note], 3-5 sentences.
VIDEO SCENARIO FORMULA (poster mode, 10-20 words): describe the CAMERA MOVEMENT over this static design — a slow zoom, a gentle pan, a subtle parallax drift — never a person's physical action, since nothing in the frame moves on its own.
GOOD: "Slow, gentle zoom into the headline text as the soft background gradient drifts almost imperceptibly."
BAD: "Man pauses at the mirror." (this is a live-action description, wrong for poster mode)
Skip the STEP 1-4 sections below entirely — they describe live-action condition/phase logic that doesn't apply to a graphic composition. Skip MAIN CHARACTER CONSISTENCY too unless a specific scene genuinely includes a photo of a person.

` : `STEP 1 — DIAGNOSE THE CONDITION AND ITS SENSITIVITY (only if ad_mode is TRANSFORMATION and the script is about a physical/health transformation — otherwise skip this step entirely and move to STEP 2)
${isTransformation ? `Read the full script${descriptor ? ` (this is for "${descriptor}")` : ""} and identify the specific real-world condition or dissatisfaction it's actually about — describe it in plain words, not a category label. Then decide its depiction tier:
- Tier 1 — a purely physical/cosmetic appearance concern (hair, skin, teeth, body shape, vision): may be shown directly but tastefully.
- Tier 2 — something better implied than shown outright (aging, weight/body contouring, facial profile): imply through posture, wardrobe, and mirror moments rather than graphic depiction.
- Tier 3 — a private, sensitive, or non-visual condition (fertility, mental health, an internal or chronic illness, oncology): never depict the body or condition — use consultation and quiet-emotion framing only (a warm room, a caring listener, a moment of relief).
If genuinely unsure which applies, default to the more conservative tier.` : `This ad's mode is ${adMode}, not TRANSFORMATION — there is no physical condition to diagnose or depict. Skip straight to STEP 2.`}

STEP 2 — PHASE (mood only, never overrides script content)
${isTransformation
    ? `Phase 1 (roughly the first third of scenes) = PROBLEM mood: cooler, dimmer lighting, more withdrawn body language.
Phase 2 (roughly the middle third) = JOURNEY mood: warm-neutral light, curious/hopeful body language.
Phase 3 (roughly the final third) = RESOLUTION mood: warm golden light, open/confident body language.
The phase sets lighting and mood only — the literal action and setting always come from the script line.`
    : `This mode doesn't need a forced problem-to-resolution mood arc. Keep a consistent, confident, on-brand mood throughout that matches the visual mood below — the literal action and setting always come from the script line, not from a phase.`}

STEP 3 — WRITE SCENES LITERALLY FROM THE SCRIPT
${isTransformation
    ? `If a line's content matches a milestone in the customer's journey (first contact, arrival, meeting an expert, a consultation), write that scene literally and specifically rather than generically:
- First-contact / arrival scene: a warm handshake or welcome moment with a team member, visible relief.
- Expert/consultation scene: write it specifically for the actual condition diagnosed in STEP 1 — the doctor and setting should visibly relate to that exact body part or concern (e.g. examining hair/scalp, a dental chair with a mirror and light, a skin-analysis monitor, an eye device), not a generic "doctor talking to patient" shot. For a Tier 3 condition, skip the physical exam entirely — a compassionate consultation instead: patient seated across from a kind expert in a soft, warm room, a supportive hand on the shoulder, dignified composition, no medical equipment, no gown.`
    : `Write each scene literally and specifically from its own script line's content — a concrete, real moment (a specific place, a specific action, a specific interaction), never a generic stock-photo-feeling shot that could belong to any business.`}

STEP 4 — THE CONDITION MUST VISIBLY CHANGE, BEFORE VS. AFTER (TRANSFORMATION mode only — skip entirely for every other mode)
${isTransformation ? `The specific condition STEP 1 diagnosed from the script must look UNMISTAKABLY, OBVIOUSLY PRESENT in every Phase 1 scene and UNMISTAKABLY, OBVIOUSLY RESOLVED in every Phase 3 scene — not subtle, not implied, not a near-identical shot with a slightly different mood. Apply this test: someone glancing at only a Phase 1 frame and only a Phase 3 frame, side by side, with no other context, must immediately see two visibly different states of the same person's specific condition — if they could be mistaken for the same shot, the difference is not strong enough. This is true even for Tier 1 conditions where "tasteful" applies — tasteful means not graphic or exploitative, it does NOT mean subtle or barely visible; the condition itself must still read clearly at a glance. Tier 2/3 conditions stay within their own softer depiction rule from STEP 1, but the shift in posture, confidence, and framing between phases must still be obvious, not ambiguous. Do not default to the protagonist's normal, healthy, camera-ready appearance throughout the whole video — that erases the entire transformation the script is telling. Read the exact words the script uses to describe the "before" state and depict that specific, strong visible difference in Phase 1; read the script's own words for the resolved "after" state and depict that instead in Phase 3.
This still applies — and is NOT optional — when a reference photo is configured: the reference photo locks the protagonist's face and identity, but the ONE specific visual attribute the diagnosed condition concerns (derive it from the condition itself — e.g. hair thickness/coverage for a hair condition, tooth appearance for a dental one, skin clarity for a skin one) MUST still visibly and strongly differ between Phase 1 and Phase 3, overriding the reference photo's default appearance for that one attribute only — this explicitly overrides MAIN CHARACTER CONSISTENCY's "don't invent new features" rule below for that one attribute alone. Every other feature of their face and identity stays exactly as the reference photo defines.` : `Not applicable to ${adMode} — do not force a before/after visual difference where the script doesn't call for one.`}

MAIN CHARACTER CONSISTENCY (whenever a scene actually shows the protagonist)
${hasProtagonist ? `Whenever a script line calls for showing the protagonist, they are always ${protagonistGender} and must be the clear PRIMARY subject of that frame — described first in the prompt and unambiguously the visual focus (largest in frame, sharpest focus, centered or rule-of-thirds placement). Not every scene needs to include them, though — per SCENE VARIETY below, a scene may instead show the business, an environment, equipment, or something else with no person in it at all, whenever that's what the script line actually describes. If a scene naturally includes another person (a doctor, specialist, staff member, family member, or friend) alongside the protagonist, describe that person as a clearly SECONDARY presence with their own distinct age/role framing — never in a way that could be confused with or visually substitute for the protagonist. Never contradict the protagonist's gender anywhere in the prompt, even implicitly through pronouns or wardrobe.
${hasReferenceImage ? `A reference photo of the ${protagonistGender} protagonist is injected downstream and will lock their face to it in any scene where they appear — this makes the PRIMARY-subject framing above critical, since the face-lock is applied to whichever person the image model treats as the main subject of the frame. Do not invent new facial features, hair color/style, skin tone, or ethnicity for the protagonist in the prompt text beyond what STEP 4 requires — the reference photo already defines their face and identity; only describe their wardrobe, posture, and expression/emotion${isTransformation ? ", EXCEPT for the one condition attribute STEP 4 requires you to override (e.g. hair thickness for a hair condition), which takes precedence over this reference-lock for that attribute only" : ""}. Any secondary person in the scene keeps their own separate, different appearance so they are never mistaken for the reference-locked protagonist. The reference photo locks FACE AND IDENTITY ONLY — this scene's lighting, mood, background, and setting always come from STEP 2's phase and the script line, never from the reference photo.\n` : ""}` : `This mode (${adMode}) doesn't center one person's story — scenes may show the business, team, environment, product, or multiple different people without needing one consistent locked individual. If a specific person does appear in a scene (e.g. a team member, a customer moment), keep them realistic and consistent WITHIN that one scene, but there's no cross-scene identity to lock.`}

IMAGE PROMPT FORMULA (3-5 sentences per prompt)
[CHARACTER + WARDROBE, matching the phase's body language] + [LITERAL ACTION from the script line] + [LITERAL SETTING from the script line] + [LIGHTING + PHASE MOOD] + [CAMERA ANGLE + MOVEMENT + SHALLOW DEPTH OF FIELD] + [REALISM ANCHORS + STYLE MODIFIER]

Mandatory realism anchors: photorealistic, cinematic, 35mm lens, shallow depth of field, natural skin texture, hyperdetailed, 8k.
Style modifier by video style:
- "Bold & Colorful" → vibrant saturated color grade, punchy contrast
- "Cinematic" → teal-and-orange grade, film grain
- "Documentary" → neutral grade, available light
- any other style → interpret literally and stay photorealistic

NEVER include: UI elements, speech bubbles, watermarks, brand names other than ${businessName}, surgical wounds, blood, exposed bodies, illegible or misspelled on-screen text, devices shown at an impossible or backwards angle, anatomically incorrect hands or limbs, physically impossible object interactions${isTransformation ? ", or (for Tier 3 conditions) any depiction of the body or condition itself" : ""}. On-screen text/logos are not forbidden outright — see BRANDED SIGNAGE below for the one narrow, controlled case where they're allowed.

VIDEO SCENARIO FORMULA (10-20 words)
Verbs first, matching the script line's literal action.
GOOD: "Man pauses at the mirror, hand runs through his hair, slow push-in."
BAD: "Man looks in mirror." (too vague, no specific action)

`}
${hasLogo ? `HARD CONSTRAINT — BRANDED SIGNAGE MUST USE THE REAL LOGO, NEVER AN INVENTED ONE
A reference image of this business's real logo is attached alongside this prompt (in addition to any protagonist reference photo — a logo looks like a graphic or wordmark, not a photograph, so tell them apart by that). This is the ONLY logo that may ever appear: if — and only if — a script line genuinely calls for a scene showing this business's own signage, storefront, building sign, or an on-screen graphic bearing its name, that logo must be reproduced faithfully from the attached reference — same mark, same lettering, same colors${brandColor ? `, matching this business's real brand color, ${brandColor}` : ""} — never a different icon, symbol, font, or color scheme invented for that scene. If a scene has no genuine reason to show branding at all, don't insert a logo or signage into it just because the reference image is available. Getting this wrong is a real, visible brand-consistency failure, not a minor stylistic slip — treat it with the same seriousness as the anti-fabrication rules above.

` : `This business has no logo on file — if a scene shows generic signage, it must be blank, abstract, or otherwise free of any specific brand mark or invented logo.

`}SCENE VARIETY — not every scene needs to show a person as its main subject
Depending on what each script line actually describes, a scene may instead show: the business's building or facility exterior, an aerial or drone establishing shot of the location, the interior environment or atmosphere on its own, a close-up on relevant equipment, tools, or materials used in the service, signage or branding elements, a hands-only shot of an activity in progress, a detail or texture shot that sets a mood, or a time-of-day/atmosphere shot of the setting. Use whichever genuinely matches that specific script line — never force a person into a scene by default just because other scenes have one. This applies even in modes with a protagonist: an establishing or atmosphere scene without them is often a stronger transition than another shot of the same person.

LOGICAL / TECHNICAL CONSISTENCY (always required, in every mode and format — these are the most common AI-image failures, avoid them explicitly)
- Any text visible anywhere in the frame (screens, signage, documents, labels${isPosterMode ? ", the on-scene text itself" : ""}) must be spelled correctly and rendered sharp and legible — never blurred or hidden. Keep any such text short and simple rather than full sentences, so it renders correctly.
- ON-SCREEN NUMBERS AND CLAIMS — any number, price, percentage, or date depicted as visible text in a scene (a screen, a sign, a document, a billboard${isPosterMode ? ", the poster's own on-scene text" : ""}) must be IDENTICAL to the real figure stated in the business context or brief above — never a different, rounder, or more dramatic number for visual effect, even if the script itself states the real one correctly. If no real number exists for what a scene would naturally show, depict that surface as generic or textless rather than inventing a number on it.
${!isPosterMode ? `- DEVICE / SCREEN CAMERA GEOMETRY — the single most common failure: a screen is only legible from directly in front of it, never from behind it or from where the person using it already stands. For ANY scene with a laptop, phone, tablet, or monitor, pick exactly ONE of these two shots and follow it precisely — never blend them: (a) OVER-THE-SHOULDER — camera behind or beside the person, looking past them at the screen, so we see the person from behind/the side and the screen's content faces both them and the camera, since they share the same side of it; or (b) FACE-ON, SCREEN AS PROP — camera in front of the person's face, and the screen faces AWAY from camera (we see only its back, lid, or a soft glow on the person's face) — never describe its front display or any content on it in this framing. NEVER put a screen's front/display panel facing the camera in the same frame as the person's face also facing the camera — that requires two contradictory camera positions at once and is the exact failure to avoid. Whichever shot you pick, the person's eye-line and head direction must be physically consistent with actually looking at wherever the screen really is in the frame — never describe a person as looking at or reading a screen while their gaze/head direction points somewhere else; if the action doesn't actually require them to be looking at the screen, don't describe the screen as something they're viewing at all. The same rule applies to any other reflective or legible surface a scene might include (a mirror, a window, glass) — it only shows its reflection or content to a viewer standing where it actually faces, never to both sides at once.
- MULTI-PERSON ANATOMY — when two or more people share a frame, each person's head, neck, and torso must be anatomically continuous, correctly proportioned, and correctly attached — no visible seams, no neck stretching or elongation, no head/body misalignment, no floating or duplicated limbs. Each person must read as one coherent physical body, not a composite of mismatched parts.
- HAND GESTURES — avoid describing precise, fine-grained gestures that are commonly misrendered (holding up an exact number of fingers, an OK sign, a specific counting gesture). These frequently render ambiguous, malformed, or unrecognizable. Prefer broad, clearly legible body language instead (an open welcoming palm, a natural conversational hand movement, a relaxed gesture toward something) that reads correctly as intended even without fine anatomical precision.
- SMALL HELD OBJECTS (phones, cups, books, and similar) — always one single, solid, seamless object held naturally in one hand, its full outline clear and continuous — never multiple overlapping pieces, never fragmented, floating, or disconnected parts. Prefer a medium shot with the object naturally in-hand over an extreme close-up on the object itself, which is far more likely to render malformed.
- Hands must have exactly five fingers each, correct proportions, and natural, physically possible poses — no distorted, extra, fused, or missing digits or limbs.
- Every object and interaction must obey real-world physics and logic — correct hand-to-object contact, correct scale between objects and people, correct reflections and shadows, nothing floating, interpenetrating, duplicated, or arranged in a physically impossible way.` : "- Keep the composition clean and uncluttered — every element (text, photo/icon, accents) must sit legibly within the frame with no overlapping or cut-off pieces."}

CORE PRINCIPLE
Script content is the HARD rule.${!isPosterMode ? " Phase is a SOFT mood guide." : ""} Write positive, story-accurate, ${isPosterMode ? "cleanly designed" : "cinematically composed"} scenes — do not invent distress or damage beyond what the script line actually describes.

OUTPUT FORMAT — STRICT
Return ONLY valid JSON. No markdown fences. No commentary. No preamble.
{
  "visual_prompts": [
    {
      "scene": 1,
      "phase": ${isTransformation ? "1" : "null"},
      "script_line": "...",
      "prompt": "3-5 sentence ${isPosterMode ? "poster-composition" : "cinematic image"} description following the formula above.",
      "video_scenario": "10-20 word ${isPosterMode ? "camera movement" : "action"} description, verbs first."
    }
  ]
}
Array length must be exactly ${n}, in the same order as the script lines.`;
}
