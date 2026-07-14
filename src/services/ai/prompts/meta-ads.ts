export function getImageAdPrompt(intelligence: any, creative: any): string {
  return `Generate high-converting Facebook image ads for Togahh — a medical tourism company sending Canadians to Turkey for dental, hair, and health treatments.

AD LIST (from market analysis):
${JSON.stringify(intelligence.insights || intelligence)}

IDEA PROMPT:
${creative.ideaPrompt}

Rules:
- Generate EXACTLY one image ad prompt based on the IDEA PROMPT and AD LIST
- The ad must feel premium, warm, and safe for a Canadian medical audience
- Rotate frameworks: PAS, AIDA, BAB, Before/After, Direct, Story
- Image prompts must be cinematic and medically authentic
- CTAs must be low-commitment (Free Quote, Free Consult, Check Eligibility)

=== HISTORICAL PERFORMANCE RULES (FROM YOUR LIVE ADS) ===
Our current winning angle is: ${intelligence.brand?.winning_patterns?.best_angle || 'Not enough data yet'}

MANDATORY DIRECTIVES BASED ON REAL AD DATA:
${(intelligence.brand?.creative_directives || []).map((d: string) => `- ${d}`).join('\n')}
You MUST follow these directives or the ad will fail.

Return ONLY valid JSON matching this schema. No markdown. No backticks.
{
  "headline": "Punchy Facebook headline (max 6 words, must include specific benefit/number)",
  "primary_text": "Main ad copy text",
  "visual_prompt": "Describe the exact visual adhering to the IMAGE PROMPT RULES... (e.g., Cinematic medical tourism ad, warm 3200K golden-hour color grade...)"
}`;
}

export function getVideoAdScriptPrompt(intelligence: any, creative: any): string {
  return `Generate the voiceover script from this input. Return only the JSON object — no other text.

Input:
{
  "duration": "${creative.duration || "28 seconds"}",
  "audioStyle": "${creative.audioStyle || "Voiceover"}",
  "videoStyle": "${creative.videoStyle || "Cinematic"}",
  "idea": "${creative.ideaPrompt || ""}",
  "character": "${creative.character || "male"}"
}

You are an expert voiceover scriptwriter for Togahh — a Turkey-based health tourism brand connecting international clients with Istanbul's top JCI-accredited clinics.

business details -
Hooks: ${JSON.stringify(intelligence.insights?.competitor_analysis?.map((c: any) => c.best_hook).filter(Boolean) || [])}

You write AUDIO ONLY. Your output is spoken narration that will be read aloud by ElevenLabs TTS over background music. No camera directions, no shot lists, no on-screen text — just the words the voice will say.

=== HISTORICAL PERFORMANCE RULES (FROM YOUR LIVE ADS) ===
Our current winning angle is: ${intelligence.brand?.winning_patterns?.best_angle || 'Not enough data yet'}

MANDATORY DIRECTIVES BASED ON REAL AD DATA:
${(intelligence.brand?.creative_directives || []).map((d: string) => `- ${d}`).join('\n')}
You MUST follow these directives or the ad will fail.

Convert the first-person story idea in the input into a polished, third-person voiceover script with a clean emotional arc and TTS-friendly rhythm.

Required fields:
- idea       → source story (first-person)
- duration   → total audio length in seconds
- character  → male / female / couple

DETECT CATEGORY from keywords in the idea:
- "hair", "bald" → HAIR
- "teeth", "smile" → DENTAL
- "weight" → BODY
- "nose" → RHINOPLASTY
- "vision" → EYE
- "aging" → FACELIFT
- "obese" → BARIATRIC
- "conceive" → IVF
- anything else → COSMETIC

ASSIGN ONE NAME, use it throughout:
- Male:   James, David, Mark, Daniel, Thomas, Michael
- Female: Sarah, Emma, Maria, Anna, Lisa, Sophia

LINE COUNT BY DURATION
ElevenLabs averages ~3.5 seconds per spoken sentence (10–14 words at natural pace). Scale strictly:
- 10–12s → 4 lines 
- 15s    → 5 lines 
- 18–20s → 6 lines 
- 22–25s → 7 lines 
- 27–30s → 8 lines 
- 32–38s → 10 lines
- 40s+   → 12 lines
Each line = ONE complete sentence, 10–14 words. Hard cap at 16.

3-ACT NARRATIVE ARC
ACT 1 — PROBLEM (hook + escalation)
ACT 2 — TOGAHH JOURNEY
ACT 3 — NEW STATE (payoff)

TTS-FRIENDLY WRITING RULES
- End every line with a period. One sentence per line.
- Use commas to mark natural breath pauses inside a line.
- NEVER use: em dashes (—), semicolons, colons, ellipses, quote marks, parentheses, asterisks, hashes, slashes
- NEVER use ALL CAPS

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
`;
}

export function getVisualPromptsPrompt(scriptLines: string[], creative: any): string {
  return `Generate visual prompts for the script below. Return ONLY the JSON object — no markdown, no preamble.

INPUTS
- Character gender: ${creative.character || "male"}
- Video style: ${creative.videoStyle || "Cinematic"}
- Duration: ${creative.duration || "28 seconds"}
- Scenes to generate: ${scriptLines.length}

SCRIPT LINES (one prompt per line, in order)
${scriptLines.map((item, index) => (index + 1) + ". " + item).join("\n")}

MANDATORY EXECUTION
Generate exactly ${scriptLines.length} objects in visual_prompts, in the same order as the lines above.

CORE PRINCIPLES
Principle 1 — Script content is the HARD rule. Phase is a SOFT mood guide.
Principle 2 — The reference character image fights you. You must overpower it. Lead the prompt with the damage descriptor, not the character descriptor. Add inline negatives like (no smile, no full hair, no clear skin, not confident) for Phase 1.

DIAGNOSE THE CONDITION
Identify the primary condition from keywords.

DECIDE THE DAMAGE OVERRIDE STRATEGY (CONDITION-SPECIFIC)
Hair restoration: Severe ~50% hair loss dominates the frame...
Dental: Mouth slightly open in distress, revealing severely damaged front teeth...

OUTPUT FORMAT — STRICT
Return ONLY valid JSON. No markdown fences. No commentary. No preamble.

{
  "visual_prompts": [
    {
      "scene": 1,
      "script_line": "...",
      "prompt": "Severe hair loss dominates the frame on a 32-year-old man... Photorealistic, cinematic, 35mm lens... (no full hair, no confident posture).",
      "video_scenario": "Man looks at mirror with distressed expression, slow push-in."
    }
  ]
}`;
}
