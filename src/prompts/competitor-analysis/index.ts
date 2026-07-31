/**
 * Competitor Ad Analysis Prompt
 *
 * Ported from the legacy n8n workflow's AI Agent node (toga Research
 * analysis for ads.json), but trimmed to only the sections that are
 * either (a) shown on the Meta Ads Dashboard or (b) actually read by the
 * ad-generation pipeline (`src/services/ai/prompts/meta-ads.ts` reads
 * `hook_analysis.best_hook_formula`/`top_hook_patterns`, `gap_opportunities`,
 * and `ready_ad_scripts` — nothing else). Earlier drafts asked for a much
 * larger report (market_insights, a full competitor-by-competitor writeup,
 * a framework breakdown, a hashtag strategy, a budget/action-plan) that
 * nothing ever read — cut to reduce both AI cost and what ends up
 * persisted in `ad_analysis_reports.insights`.
 */

interface AdScriptTopic {
  topic: string;
  format: string;
}

interface CompetitorAnalysisPromptInput {
  businessName: string;
  industry: string | null;
  businessVoice: string | null;
  coreOfferings: string | null;
  targetAudience: string | null;
  targetCountries: string[];
  adScriptTopics: AdScriptTopic[];
  competitors: any[];
  topAds: any[];
  marketSummary: any;
  gaps: Record<string, boolean>;
}

function formatFieldFor(format: string): string {
  const f = format.toLowerCase();
  if (f.includes("video")) return `"script": "[0-Xs] <text> [X-Ys] <text> ... — timestamped to match the stated duration"`;
  if (f.includes("carousel")) return `"slides": [ { "slide": 1, "headline": "<>", "body": "<>", "image_direction": "<what to show>" }, ... one object per slide ]`;
  return `"body_copy": "<50-80 words, ready to copy-paste>"`;
}

export const generateCompetitorAnalysisPrompt = (input: CompetitorAnalysisPromptInput) => {
  const {
    businessName, industry, businessVoice, coreOfferings, targetAudience,
    targetCountries, adScriptTopics, competitors, topAds, marketSummary, gaps,
  } = input;

  const marketLabel = targetCountries.join("/");
  const scriptCount = adScriptTopics.length;
  const scriptTopicsList = adScriptTopics.map((t, i) => `   ${i + 1}. ${t.topic} — ${t.format}`).join("\n");
  const scriptSchemas = adScriptTopics
    .map(
      (t, i) => `    {
      "topic": "${t.topic}",
      "format": "${t.format}",
      "framework": "<framework used>",
      "hook": "<opening line>",
      ${formatFieldFor(t.format)},
      "cta": "<CTA button text — low commitment>",
      "visual_direction": "<what to show — specific to ${businessName}>",
      "target_audience": "<ad platform targeting — age, interests, behaviors, location>",
      "competitor_hook_referenced": "<exact hook from top_ads that inspired this>",
      "why_this_beats_competitors": "<specific reason based on data>"
    }${i < adScriptTopics.length - 1 ? "," : ""}`
    )
    .join("\n");

  const systemMessage = `You are an elite advertising strategist with 10+ years of experience in the ${industry || "this"} industry.

Your job is to analyze real competitor Facebook ad data scraped from the Facebook Ads Library and produce a short, highly actionable intelligence report for the ${businessName} team — so they can create better-performing ads than every competitor in this space.

- Ad scores must be on a strict 1-10 scale. 10 is the maximum. Never exceed 10. Round any calculated score to the nearest whole number between 1 and 10.

YOUR BUSINESS CONTEXT: ${businessName}
- Industry: ${industry || "Not specified"}
- Core offerings: ${coreOfferings || "Not specified"}
- Target audience: ${targetAudience || "Not specified"}
- Target market(s): ${marketLabel}
- Brand voice: ${businessVoice || "Professional, trustworthy, and clear"}

================================================================
ANALYSIS RULES
================================================================
- Ad scripts must directly use the hook pattern of the highest-scoring ads provided in top_ads — do NOT write generic hooks disconnected from the data.
- Find MINIMUM 5 gap opportunities — never less. Use the gap flags provided as a starting point, but back every gap with specific evidence from the data.
- Be brutally honest — if competitor ads are weak, say so clearly with specific evidence.
- Always back every insight with a specific example from the input data.
- Use plain English — the reader is a business owner, not a marketing academic.
- Every recommendation must be specific and immediately actionable.
- Never fabricate data — only use what is provided in the input.
- Every ad in the input carries a "days_running" field (how many days it has been live). An ad still running after 30+ days is a strong signal it's converting for that competitor — treat high days_running as real evidence of a proven, working ad, and call it out explicitly wherever it's the highest-signal fact available.

================================================================
OUTPUT RULES
================================================================
- Output ONLY valid JSON — no markdown, no backticks, no text outside JSON.
- Complete ALL sections — do not truncate or skip any field.
- ready_ad_scripts: include EXACTLY ${scriptCount} scripts — ALL of these topics are required, none can be skipped or substituted:
${scriptTopicsList}
- hook_analysis.top_hook_patterns: minimum 3 distinct patterns, drawn from across different competitors — not all from a single ad.
- gap_opportunities: minimum 5 gaps — never less.
- Each ad script MUST include "competitor_hook_referenced" showing which top ad hook inspired that script.
- Do NOT include a "generated_at" field anywhere in the output — the system stamps this itself; you cannot know the real current time and any date you write will be wrong.
- If output is incomplete, it will be automatically rejected.
- Do NOT wrap the JSON in quotes. Do NOT use markdown. Ensure strict JSON.parse compatibility.

================================================================
STRICT SECTION REQUIREMENTS
================================================================
executive_summary: 3-4 sentences only. Must mention dominant format, top competitor angle, and the single biggest opportunity. Must reference actual competitor behavior from the data, not generic statements.

hook_analysis.best_hook_formula: a fill-in-the-blank template, immediately usable, following this shape: "[Audience] — [Specific Benefit + Number] — [Scarcity] — [CTA]".`;

  const userMessage = `Here is real ad data scraped from competitors targeting our audience in ${marketLabel}.
Analyze this deeply and return a complete report in the exact JSON format specified below.

=== COMPETITOR DATA ===
${JSON.stringify(competitors)}

=== TOP 5 STRONGEST ADS ===
${JSON.stringify(topAds)}

=== MARKET SUMMARY ===
${JSON.stringify(marketSummary)}

=== GAP SIGNALS DETECTED IN THE DATA ===
${JSON.stringify(gaps)}

=== PROVEN HOOK FORMULAS (highest scoring — use these exact patterns as inspiration) ===
${JSON.stringify(topAds.map((a: any) => ({ hook: a.hook, body: a.body, framework: a.framework, score: a.score, days_running: a.days_running })))}

Return ONLY valid JSON. No markdown. No backticks. No text outside the JSON object:

{
  "executive_summary": "<3-4 sentences>",

  "hook_analysis": {
    "top_hook_patterns": [
      { "pattern": "<describe the pattern type>", "example": "<exact hook text from data>", "why_it_works": "<psychological reason in plain English>", "score": "<strong / moderate / weak>" }
    ],
    "best_hook_formula": "<fill-in-the-blank template>"
  },

  "gap_opportunities": [
    { "gap": "<what NO competitor is doing well>", "opportunity": "<exactly how to exploit this gap>", "ad_format": "<video/image/carousel>", "priority": "<high/medium/low>", "estimated_impact": "<why this will work — be specific to this audience>" }
  ],

  "ready_ad_scripts": [
${scriptSchemas}
  ]
}`;

  return { system: systemMessage, user: userMessage };
};
