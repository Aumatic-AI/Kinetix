/**
 * Meta Ads creative-generation prompts (image ad, video script, video
 * visual prompts). Content and rules are ported from the legacy n8n
 * workflows (toga Image Ad Creation.json, toga Video Ads Creation.json)
 * which were proven to generate good results — only the business
 * persona is genericized (pulled from the `businesses` row instead of
 * hardcoded to one client) and competitor/self-ad intelligence is
 * threaded through more explicitly. Output JSON shapes are unchanged
 * from before this pass — the Inngest generation pipeline
 * (generate-image-ad.ts / generate-video-ad.ts) depends on them exactly
 * as they are and must not be touched.
 *
 * Beyond the original port, `getVideoAdScriptPrompt` now threads a
 * `language` input through to an explicit output-language directive (the
 * legacy prompt collected language but never used it — this was a real,
 * inherited bug). `getVisualPromptsPrompt` (shared with Social Media) also
 * adds two sections neither app had before: MAIN CHARACTER CONSISTENCY
 * (keeps the protagonist's gender/identity — and the reference photo's
 * face, when one is configured — locked to the correct person even when a
 * scene includes other people) and LOGICAL / TECHNICAL CONSISTENCY
 * (explicitly bans the recurring AI-image failure modes seen in practice:
 * illegible/misspelled on-screen text, backwards-facing device screens,
 * malformed hands, physically impossible object interactions).
 */

const SERVICE_CATEGORY_MAP: Record<string, string> = {
  "hair transplant": "HAIR",
  "dental implants": "DENTAL",
  "rhinoplasty": "RHINOPLASTY",
};

/** Maps the explicit `service` selected in Create Ad to the category vocab
 * below. Preferred over keyword-sniffing the idea text — the service is a
 * direct, reliable signal, not an inference. */
export function mapServiceToCategory(service: any): string | null {
  if (!service) return null;
  return SERVICE_CATEGORY_MAP[String(service).toLowerCase().trim()] || null;
}

/** Each script line becomes one fixed ~4-second video scene (see
 * generate-video-ad.ts / generate-social-video.ts's cinematicPrompt step,
 * which always requests a 4-second clip per scene) — so the number of
 * scenes is what actually determines the final stitched video's length,
 * never something left to the script-writing LLM's own judgment. Both
 * callers must use this exact number, not their own guess, so the video
 * comes out to (scene count x 4) seconds — as close to the requested
 * duration as a whole number of 4-second scenes allows. Accepts either a
 * plain number of seconds (Social's `duration`) or a dropdown string like
 * "40 seconds" (Meta Ads' `duration`). */
export function sceneCountForDuration(duration: string | number | undefined): number {
  const seconds = typeof duration === "number" ? duration : parseInt(String(duration || "").match(/\d+/)?.[0] || "28", 10);
  return Math.max(4, Math.round(seconds / 4));
}

function businessContextBlock(business: any): string {
  const name = business?.name || "the business";
  const industry = business?.industry || "this industry";
  const offerings = business?.core_offerings || "Not specified";
  const audience = business?.target_audience || "Not specified";
  const voice = business?.business_voice || "Professional, trustworthy, and clear";
  const painPoints = business?.pain_points || "Not specified";
  const description = business?.description;

  return `YOUR BUSINESS: ${String(name).toUpperCase()}
- Industry: ${industry}
- Core offerings: ${offerings}
${description ? `- Positioning: ${description}\n` : ""}- Target audience: ${audience}
- Customer pain points: ${painPoints}
- Brand voice: ${voice}`;
}

export function getImageAdPrompt(intelligence: any, creative: any): string {
  const business = intelligence.business || {};
  const competitor = intelligence.competitor || {};
  const self = intelligence.self || {};

  const businessName = business.name || "the business";

  const bestHookFormula = competitor?.hook_analysis?.best_hook_formula;
  const topHookPatterns = (competitor?.hook_analysis?.top_hook_patterns || []).slice(0, 3);
  const gapOpportunities = (competitor?.gap_opportunities || []).slice(0, 3);
  const ideaLower = String(creative.ideaPrompt || "").toLowerCase();
  const matchingScript = (competitor?.ready_ad_scripts || []).find(
    (s: any) => s?.topic && ideaLower.includes(String(s.topic).toLowerCase().split(" ")[0])
  );

  const winningAngle = self?.winning_patterns?.best_angle || "Not enough data yet — no live-performance history available.";
  const creativeDirectives: string[] = self?.creative_directives || [];

  return `You are a world-class direct response ad creative specialist with 15 years of experience producing high-converting image ads for ${business.industry || "this"} brands on Meta and Instagram.

${businessContextBlock(business)}

YOUR ONLY JOB
Generate ONE structured image ad from the IDEA PROMPT below. It must feel like it was made by a premium brand in this space — never generic, never discount-clinic in feel.

${creative.service ? `THIS AD IS SPECIFICALLY FOR: ${creative.service}. Every claim, visual, and word must be about ${creative.service} — never blend in another service or offering.\n\n` : ""}IDEA PROMPT
${creative.ideaPrompt}

${matchingScript ? `MATCHING COMPETITOR-INTELLIGENCE SCRIPT (use as inspiration, never copy verbatim):\n${JSON.stringify(matchingScript)}\n\n` : ""}${bestHookFormula ? `PROVEN HOOK FORMULA FROM MARKET DATA: ${bestHookFormula}\n\n` : ""}${topHookPatterns.length ? `TOP-PERFORMING HOOK PATTERNS IN THIS MARKET:\n${topHookPatterns.map((p: any) => `- ${p.pattern}: "${p.example}" (${p.why_it_works})`).join("\n")}\n\n` : ""}${gapOpportunities.length ? `GAPS NO COMPETITOR IS EXPLOITING (lean into these):\n${gapOpportunities.map((g: any) => `- ${g.gap} -> ${g.opportunity}`).join("\n")}\n\n` : ""}=== HISTORICAL PERFORMANCE RULES (FROM YOUR LIVE ADS) ===
Our current winning angle is: ${winningAngle}
MANDATORY DIRECTIVES BASED ON REAL AD DATA:
${creativeDirectives.length ? creativeDirectives.map((d: string) => `- ${d}`).join("\n") : "- No live-performance directives yet — this is an early ad, rely on the market intelligence above."}
You MUST follow these directives or the ad will fail.

AD CREATIVE RULES
1. Use a copywriting framework that fits the idea — rotate rather than reusing the same one every time: PAS (Problem-Agitate-Solve), AIDA (Attention-Interest-Desire-Action), BAB (Before-After-Bridge), Before/After, Direct, or Story.
2. Never repeat a hook angle already used recently. Hook types that convert well in this space:
   - COST SAVINGS: a specific price comparison or percentage saved.
   - PROOF: a real number of customers served or a rating.
   - FEAR REMOVAL: name a common hesitation and answer it directly.
   - TRANSFORMATION: before vs. after framing.
   - URGENCY: a real, believable scarcity signal.
   - TRUST: credentials, accreditations, expert care — whatever is real for this business.
3. Do NOT invent stats, claims, or proof not present in the business context or intelligence above.
4. The image prompt must NEVER describe text, logos, UI elements, or overlays — those are composited separately.

IMAGE PROMPT RULES (visual_prompt field)
- 3-5 sentences, cinematic and photorealistic.
- Show a scene directly relevant to ${businessName}'s offerings above — subject fills 60%+ of the frame.
- Include camera angle + movement, lighting direction + quality, shallow depth of field, and exact negative space for text overlay (rule of thirds).
- Include real-world tactile, authentic details relevant to this business and its audience — never generic stock-photo staging.
- Color temperature and grade should match the brand voice above.
- If any screen, phone, laptop, sign, or document appears, any visible text must be spelled correctly and sharp, never blurred — keep it short and simple (a single common word, a time, a short label) rather than full sentences, so it renders correctly.
- A screen is only legible from directly in front of it — never from behind it or from where its user already stands. Never show a person's face facing the camera AND a laptop/phone screen's front display also facing the camera in the same frame — that is two contradictory camera positions at once. Pick one: shoot over the person's shoulder so both they and the camera share the screen's side, or shoot the person face-on with the screen turned away from camera (its back/lid only, no visible display). Any handheld device (phone, cup, book) must be one single, solid, seamless object, never fragmented or floating pieces. Hands must have exactly five fingers each with natural, physically possible poses.

COPY RULES
- headline: max 6 words, must include a specific benefit or number.
- primary_text: 2-4 short sentences, plain language, speaks directly to the customer pain point above.
- The implied CTA must be low-commitment (e.g. "Get a Free Quote", "Check If You Qualify", "Book a Free Consult") — never "Buy Now" or "Shop Now".

Return ONLY valid JSON matching this schema. No markdown. No backticks.
{
  "headline": "Punchy Facebook headline (max 6 words, must include specific benefit/number)",
  "primary_text": "Main ad copy text (2-4 sentences, low-commitment CTA)",
  "visual_prompt": "3-5 sentence cinematic visual description following the IMAGE PROMPT RULES above"
}`;
}

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
  const serviceCategory = mapServiceToCategory(creative.service);
  const language = creative.language && creative.language !== "English" ? creative.language : null;
  const sceneCount = sceneCountForDuration(creative.duration);
  const targetWords = Math.round(sceneCount * 4 * 2.3);

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

PROVEN HOOKS FROM MARKET INTELLIGENCE (use as inspiration for Act 1, never copy verbatim): ${JSON.stringify(topHooks)}
${bestHookFormula ? `Proven hook formula: ${bestHookFormula}` : ""}

You write AUDIO ONLY. Your output is spoken narration that will be read aloud by ElevenLabs TTS over background music. No camera directions, no shot lists, no on-screen text — just the words the voice will say.

=== HISTORICAL PERFORMANCE RULES (FROM YOUR LIVE ADS) ===
Our current winning angle is: ${winningAngle}
MANDATORY DIRECTIVES BASED ON REAL AD DATA:
${creativeDirectives.length ? creativeDirectives.map((d: string) => `- ${d}`).join("\n") : "- No live-performance directives yet."}
You MUST follow these directives or the ad will fail.

Convert the first-person story idea in the input into a polished, third-person voiceover script with a clean emotional arc and TTS-friendly rhythm.

Required fields:
- idea       → source story (first-person)
- duration   → total audio length in seconds
- character  → male / female / couple

${serviceCategory
  ? `CATEGORY IS ALREADY KNOWN: ${serviceCategory} (from the selected service, "${creative.service}"). Use the ${serviceCategory} vocabulary below directly — do not re-detect it from the idea text.`
  : `If the idea describes a physical transformation, DETECT CATEGORY from keywords in the idea (this picks the vocabulary for ACT 1 below); otherwise adapt the same 3-act structure to whatever the idea is actually about:
- "hair", "bald" → HAIR
- "teeth", "smile" → DENTAL
- "weight" → BODY
- "nose" → RHINOPLASTY
- "vision" → EYE
- "aging" → FACELIFT
- "obese" → BARIATRIC
- "conceive" → IVF
- anything else appearance/health related → COSMETIC`}

PROBLEM VOCABULARY — if the category matches, use phrases like these (verbatim or close paraphrase):
- HAIR: "his thinning hair", "his receding hairline", "his bald patch", "her hair loss", "her visible scalp"
- DENTAL: "his chipped tooth", "his discolored smile", "his crooked teeth", "her uneven teeth", "her stained front tooth"
- BODY: "his midsection", "his belly", "his weight", "her fuller figure", "her body shape"
- RHINOPLASTY: "his nose shape", "the bump on his nose", "her nose profile", "her wide nostrils"
- EYE: "his poor vision", "his thick glasses", "his struggle to see clearly", "her blurry vision"
- FACELIFT: "his aging appearance", "his sagging jawline", "her loose skin", "her tired eyes"
- BARIATRIC: "his struggle with mobility", "his weight", "her difficulty breathing", "her tired body"
- IVF: "her failed attempts", "their struggle to conceive"

ASSIGN ONE NAME, use it throughout:
- Male:   James, David, Mark, Daniel, Thomas, Michael
- Female: Sarah, Emma, Maria, Anna, Lisa, Sophia
- Couple: Mark and Anna, David and Lisa, Thomas and Emma

LINE COUNT — EXACT, NOT A GUIDELINE
Each script line becomes one fixed ~4-second video scene downstream — the final video's length is EXACTLY (number of lines x 4) seconds, a hard technical constraint, not a stylistic choice. The script array MUST have EXACTLY ${sceneCount} lines — no more, no fewer — to produce a ${sceneCount * 4}-second video for the requested ${creative.duration || "28 seconds"}.
Target about ${targetWords} words total across all ${sceneCount} lines so the spoken narration's natural length fits within that ${sceneCount * 4}-second video — a script that runs noticeably longer gets cut off mid-sentence once the audio is laid over the fixed-length video.
Each line = ONE complete sentence, 10-14 words. Hard cap at 16.

3-ACT NARRATIVE ARC

ACT 1 — PROBLEM (hook + escalation). Line 1 is the HOOK — the first 2 seconds decide if the listener stays. Each line must combine: character name + emotional state word, the SPECIFIC problem (use the vocabulary above if applicable), and a recognisable everyday moment (family dinner, a friend's wedding, school pickup, a work meeting, a photo, a video call, date night).
  Format: "[Name] feels [emotion] about [problem] when [moment]." or "[Name] hides [problem] every time [moment]."
  GOOD: "James feels embarrassed by his receding hairline every time he meets new people at work."
  BAD: "James has a hair problem." (vague) / "James thinks about getting help." (no emotional pain)

ACT 2 — ${String(businessName).toUpperCase()} JOURNEY. Narrate the calm, supported path using only these safe verbs: discovers, lands, meets, listens, examines, explains, plans, guides, supports, reassures. Pick beats to fill your line budget, in order: Decision (discovers ${businessName} and books a consultation) -> First contact (arrival or first real interaction with the team) -> Expert (meets the specialist who listens and plans the path) -> Confidence (feels safe and understood). Tone: warm, reassuring, calm — the listener should feel relief.
  NEVER narrate: surgery, anesthesia, instruments, pain, recovery, swelling, stitches, specific medical/technical procedure names, risk/complication/warning/side-effect language.

ACT 3 — NEW STATE (payoff). Narrate the change as LIVED MOMENTS with WITNESSES who notice — never as a tagline. Second-to-last line: a first confident behaviour in daily life. Final line: the strongest emotional payoff, through one concrete moment.
  STRONG FINAL LINES: "James laughs open-mouthed at his daughter's birthday and his family freezes in surprise." / "Sarah steps into the family photo without hesitation for the first time in years."
  NEVER end with a CTA, a slogan, a price, a website, or "${businessName} changed his life" — the transformation must speak for itself.

TTS-FRIENDLY WRITING RULES
- End every line with a period. One sentence per line. Use commas for natural breath pauses inside a line.
- NEVER use: em dashes, semicolons, colons, ellipses, quote marks, parentheses, asterisks, hashes, slashes, ALL CAPS.
- Plain, conversational ${language || "English"} at a natural everyday reading level${language ? "" : " (5th-8th grade)"}. Spell out numbers under twenty. Avoid abbreviations${language ? "" : ", foreign words"}, technical jargon.
- Mention "${businessName}" by name AT MOST ONCE across the whole script, in Act 2 only.
- Use the character's name in line 1 at minimum; other lines use he / she / they. Never switch the name or pronoun — check every line before returning.
- Avoid tongue-twisters, clusters of similar consonant sounds, and rare or hard-to-pronounce words — prefer short, common, everyday words a voice actor could read smoothly in one breath. This is spoken narration, so clarity of delivery matters as much as meaning.

ABSOLUTE FORBIDDEN CONTENT
1.  Surgical, procedural, or recovery descriptions
2.  Pain, blood, needles, instruments, side effects, risks
3.  Body-shaming words: fat, ugly, gross, deformed, hideous
4.  Medical jargon (e.g. alopecia, malocclusion, obesity, rhinophyma)
5.  One-time accidents (fell off a ladder, car crash)
6.  Time markers (three weeks later, six months on, before, after, suddenly)
7.  Multi-action sentences (he sits and smiles and drinks)
8.  Quotation marks, em dashes, asterisks, emojis, hashtags, ALL CAPS
9.  Dialogue ("he says", "she tells him")
10. Sales lines, CTAs, slogans, prices, contact info
11. Naming competitors, other clinics, or other brands
12. Switching identity, gender, age, or name mid-script
13. Repeating the business name more than once across the whole script

OUTPUT FORMAT — STRICT
Return ONLY valid JSON. No markdown fences. No commentary. No preamble.

{
  "script": [
     "Line one.",
     "Line two.",
     "Line three.",
     "Line four."
  ]
}

Rules:
- "script" must be a JSON array of strings, one sentence per element, in order.
- Array length must exactly match the line-count-by-duration table above.
- No extra fields, no trailing commas.

SELF-CHECK BEFORE RETURNING (silently confirm each):
1. Category correctly detected (if applicable) and vocabulary used
2. Every Act 1 line has emotion + specific problem + everyday moment
3. Same name and pronouns in every line
4. Line 1 is a scroll-stopping HOOK
5. Script array has EXACTLY ${sceneCount} elements — no more, no fewer
6. "${businessName}" appears at most once, in Act 2
7. Act 3 ends on a behaviour beat with witnesses, not a tagline
8. No forbidden punctuation, abbreviations, or characters
9. JSON is valid, script is an array of strings, no markdown fences, no extra fields
${language ? `10. Every single line is written entirely in ${language} — not English, not mixed\n` : ""}If any check fails, fix before returning.
`;
}

export function getVisualPromptsPrompt(scriptLines: string[], creative: any, business?: any): string {
  const businessName = business?.name || "the business";
  const n = scriptLines.length;
  const serviceCategory = mapServiceToCategory(creative?.service);
  const protagonistGender = creative.character || "male";
  const hasReferenceImage = !!creative.hasReferenceImage;

  return `Generate visual prompts for the script below. Return ONLY the JSON object — no markdown, no preamble.

INPUTS
- Business: ${businessName}
- Character gender: ${creative.character || "male"}
- Video style: ${creative.videoStyle || "Cinematic"}
- Duration: ${creative.duration || "28 seconds"}
- Scenes to generate: ${n}

SCRIPT LINES (one prompt per line, in order)
${scriptLines.map((item, index) => (index + 1) + ". " + item).join("\n")}

MANDATORY EXECUTION
Generate exactly ${n} objects in visual_prompts, in the same order as the lines above. Script content is the HARD rule for what each scene shows — never invent a different subject or setting than what the line describes.

STEP 1 — DIAGNOSE THE CONDITION (if the script is about a physical/health transformation)
${serviceCategory ? `The service is already known: ${serviceCategory} (from "${creative.service}"). Use its row in the table below directly.\n` : ""}Identify the primary condition from keywords in the full script, and its sensitivity tier:
| Keywords | Condition | Tier | Depiction |
|---|---|---|---|
| hair, bald, thinning, scalp, receding, hairline | Hair restoration | 1 | may show the visible condition tastefully |
| teeth, smile, dental, chipped, stained, crooked, veneers | Dental | 1 | may show the visible condition tastefully |
| acne, blemish, breakout, scars, pigmentation | Skin | 1 | may show the visible condition tastefully |
| wrinkles, fine lines, aging, sagging | Anti-aging | 2 | soft, tasteful — imply, don't dramatize |
| glasses, blurry, vision | Eye / vision | 1 | may show glasses / squinting |
| weight, belly, obesity | Body / bariatric | 2 | imply via posture and fit of clothing — no body close-ups |
| nose, jaw, chin, profile | Facial contouring | 2 | imply via profile shots and mirror moments — never dramatize |
| conceive, IVF, fertility | Fertility | 3 | emotional/consultation framing only — NO physical depiction |
| cancer, oncology | Oncology | 3 | emotional/consultation framing only — NO physical depiction |
| mental health, anxiety, depression | Mental health | 3 | emotional framing only — NO physical depiction |
| anything else | General transformation | 2 | tasteful, imply rather than dramatize |

Tier 1: the condition may be shown directly and tastefully. Tier 2: imply through posture, wardrobe, and mirror moments rather than graphic depiction. Tier 3: never depict the body or condition — use consultation and quiet-emotion framing only (a warm room, a caring listener, a moment of relief).

STEP 2 — PHASE (mood only, never overrides script content)
Phase 1 (roughly the first third of scenes) = PROBLEM mood: cooler, dimmer lighting, more withdrawn body language.
Phase 2 (roughly the middle third) = JOURNEY mood: warm-neutral light, curious/hopeful body language.
Phase 3 (roughly the final third) = RESOLUTION mood: warm golden light, open/confident body language.
The phase sets lighting and mood only — the literal action and setting always come from the script line.

STEP 3 — WRITE JOURNEY MILESTONES LITERALLY
If a line's content matches a milestone in the customer's journey (first contact, arrival, meeting an expert, a consultation), write that scene literally and specifically rather than generically:
- First-contact / arrival scene: a warm handshake or welcome moment with a team member, visible relief.
- Expert/consultation scene, condition-specific: Hair -> doctor parting hair, viewing a magnified scalp image on a monitor. Dental -> patient in a dental chair, doctor with a mirror and probe, overhead light. Skin -> doctor holding a dermatoscope, skin-analysis monitor. Eye -> patient at an ophthalmic device, doctor adjusting focus. Tier 3 (fertility/oncology/mental health) -> NO physical exam, a compassionate consultation instead: patient seated across from a kind expert in a soft, warm room, a supportive hand on the shoulder, dignified composition, no medical equipment, no gown.

STEP 4 — THE CONDITION MUST VISIBLY CHANGE, BEFORE VS. AFTER
The specific condition STEP 1 diagnosed from the script (whatever it actually is — read the script line's own words, never a fixed list) must look UNMISTAKABLY, OBVIOUSLY PRESENT in every Phase 1 scene and UNMISTAKABLY, OBVIOUSLY RESOLVED in every Phase 3 scene — not subtle, not implied, not a near-identical shot with a slightly different mood. Apply this test: someone glancing at only a Phase 1 frame and only a Phase 3 frame, side by side, with no other context, must immediately see two visibly different states of the same person's specific condition — if they could be mistaken for the same shot, the difference is not strong enough. This is true even for Tier 1 conditions where "tasteful" applies — tasteful means not graphic or exploitative, it does NOT mean subtle or barely visible; the condition itself must still read clearly at a glance. Tier 2/3 conditions stay within their own softer depiction rule from STEP 1, but the shift in posture, confidence, and framing between phases must still be obvious, not ambiguous. Do not default to the protagonist's normal, healthy, camera-ready appearance throughout the whole video — that erases the entire transformation the script is telling. Read the exact words the script uses to describe the "before" state and depict that specific, strong visible difference in Phase 1; read the script's own words for the resolved "after" state and depict that instead in Phase 3.
This still applies — and is NOT optional — when a reference photo is configured: the reference photo locks the protagonist's face and identity, but the ONE specific visual attribute the diagnosed condition concerns (never a fixed list — derive it from the condition itself, e.g. hair thickness/coverage for a hair condition, tooth appearance for a dental one, skin clarity for a skin one) MUST still visibly and strongly differ between Phase 1 and Phase 3, overriding the reference photo's default appearance for that one attribute only — this explicitly overrides MAIN CHARACTER CONSISTENCY's "don't invent new features" rule below for that one attribute alone. Every other feature of their face and identity stays exactly as the reference photo defines.

MAIN CHARACTER CONSISTENCY (every scene)
The protagonist is always ${protagonistGender} and must be the clear PRIMARY subject of every single frame — described first in the prompt and unambiguously the visual focus (largest in frame, sharpest focus, centered or rule-of-thirds placement). If a scene naturally includes another person (a doctor, specialist, staff member, family member, or friend), describe that person as a clearly SECONDARY presence with their own distinct age/role framing — never in a way that could be confused with or visually substitute for the protagonist. Never contradict the protagonist's gender anywhere in the prompt, even implicitly through pronouns or wardrobe.
${hasReferenceImage ? `A reference photo of the ${protagonistGender} protagonist is injected downstream and will lock every scene's generated face to it — this makes the PRIMARY-subject framing above critical, since the face-lock is applied to whichever person the image model treats as the main subject of the frame. Do not invent new facial features, hair color/style, skin tone, or ethnicity for the protagonist in the prompt text beyond what STEP 4 requires — the reference photo already defines their face and identity; only describe their wardrobe, posture, and expression/emotion, EXCEPT for the one condition attribute STEP 4 requires you to override (e.g. hair thickness for a hair condition), which takes precedence over this reference-lock for that attribute only. Any secondary person in the scene keeps their own separate, different appearance so they are never mistaken for the reference-locked protagonist. The reference photo locks FACE AND IDENTITY ONLY — this scene's lighting, mood, background, and setting always come from STEP 2's phase and the script line, never from the reference photo.\n` : ""}
LOGICAL / TECHNICAL CONSISTENCY (always required — these are the most common AI-image failures, avoid them explicitly)
- Any text visible anywhere in the frame (screens, signage, documents, labels) must be spelled correctly and rendered sharp and legible — never blurred or hidden. Keep any such text short and simple (a single common word, a time, a short label) rather than full sentences, so it renders correctly.
- DEVICE / SCREEN CAMERA GEOMETRY — the single most common failure: a screen is only legible from directly in front of it, never from behind it or from where the person using it already stands. For ANY scene with a laptop, phone, tablet, or monitor, pick exactly ONE of these two shots and follow it precisely — never blend them: (a) OVER-THE-SHOULDER — camera behind or beside the person, looking past them at the screen, so we see the person from behind/the side and the screen's content faces both them and the camera, since they share the same side of it; or (b) FACE-ON, SCREEN AS PROP — camera in front of the person's face, and the screen faces AWAY from camera (we see only its back, lid, or a soft glow on the person's face) — never describe its front display or any content on it in this framing. NEVER put a screen's front/display panel facing the camera in the same frame as the person's face also facing the camera — that requires two contradictory camera positions at once and is the exact failure to avoid. The same rule applies to any other reflective or legible surface a scene might include (a mirror, a window, glass) — it only shows its reflection or content to a viewer standing where it actually faces, never to both sides at once.
- SMALL HELD OBJECTS (phones, cups, books, and similar) — always one single, solid, seamless object held naturally in one hand, its full outline clear and continuous — never multiple overlapping pieces, never fragmented, floating, or disconnected parts. Prefer a medium shot with the object naturally in-hand over an extreme close-up on the object itself, which is far more likely to render malformed.
- Hands must have exactly five fingers each, correct proportions, and natural, physically possible poses — no distorted, extra, fused, or missing digits or limbs.
- Every object and interaction must obey real-world physics and logic — correct hand-to-object contact, correct scale between objects and people, correct reflections and shadows, nothing floating, interpenetrating, duplicated, or arranged in a physically impossible way.

CORE PRINCIPLE
Script content is the HARD rule. Phase is a SOFT mood guide. Write positive, story-accurate, cinematically composed scenes — do not invent distress or damage beyond what the script line actually describes.

IMAGE PROMPT FORMULA (3-5 sentences per prompt)
[CHARACTER + WARDROBE, matching the phase's body language] + [LITERAL ACTION from the script line] + [LITERAL SETTING from the script line] + [LIGHTING + PHASE MOOD] + [CAMERA ANGLE + MOVEMENT + SHALLOW DEPTH OF FIELD] + [REALISM ANCHORS + STYLE MODIFIER]

Mandatory realism anchors: photorealistic, cinematic, 35mm lens, shallow depth of field, natural skin texture, hyperdetailed, 8k.
Style modifier by video style:
- "Bold & Colorful" → vibrant saturated color grade, punchy contrast
- "Cinematic" → teal-and-orange grade, film grain
- "Documentary" → neutral grade, available light
- any other style → interpret literally and stay photorealistic

NEVER include: text, logos, UI elements, speech bubbles, watermarks, brand names other than ${businessName}, surgical wounds, blood, exposed bodies, illegible or misspelled on-screen text, devices shown at an impossible or backwards angle, anatomically incorrect hands or limbs, physically impossible object interactions, or (for Tier 3 conditions) any depiction of the body or condition itself.

VIDEO SCENARIO FORMULA (10-20 words)
Verbs first, matching the script line's literal action.
GOOD: "Man pauses at the mirror, hand runs through his hair, slow push-in."
BAD: "Man looks in mirror." (too vague, no specific action)

OUTPUT FORMAT — STRICT
Return ONLY valid JSON. No markdown fences. No commentary. No preamble.
{
  "visual_prompts": [
    {
      "scene": 1,
      "phase": 1,
      "script_line": "...",
      "prompt": "3-5 sentence cinematic image description following the formula above.",
      "video_scenario": "10-20 word action description, verbs first."
    }
  ]
}
Array length must be exactly ${n}, in the same order as the script lines.`;
}
