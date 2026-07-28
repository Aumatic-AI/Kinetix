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

  return `Generate the voiceover script from this input. Return only the JSON object — no other text.

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

LINE COUNT BY DURATION
ElevenLabs averages ~3.5 seconds per spoken sentence (10-14 words at natural pace). Scale strictly:
- 10-12s → 4 lines
- 15s    → 5 lines
- 18-20s → 6 lines
- 22-25s → 7 lines
- 27-30s → 8 lines
- 32-38s → 10 lines
- 40s+   → 12 lines
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
- Plain conversational English (5th-8th grade reading level). Spell out numbers under twenty. Avoid abbreviations, foreign words, technical jargon.
- Mention "${businessName}" by name AT MOST ONCE across the whole script, in Act 2 only.
- Use the character's name in line 1 at minimum; other lines use he / she / they. Never switch the name or pronoun — check every line before returning.

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
5. Line count matches the duration formula exactly
6. "${businessName}" appears at most once, in Act 2
7. Act 3 ends on a behaviour beat with witnesses, not a tagline
8. No forbidden punctuation, abbreviations, or characters
9. JSON is valid, script is an array of strings, no markdown fences, no extra fields
If any check fails, fix before returning.
`;
}

export function getVisualPromptsPrompt(scriptLines: string[], creative: any, business?: any): string {
  const businessName = business?.name || "the business";
  const n = scriptLines.length;
  const serviceCategory = mapServiceToCategory(creative?.service);

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

NEVER include: text, logos, UI elements, speech bubbles, watermarks, brand names other than ${businessName}, surgical wounds, blood, exposed bodies, or (for Tier 3 conditions) any depiction of the body or condition itself.

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
