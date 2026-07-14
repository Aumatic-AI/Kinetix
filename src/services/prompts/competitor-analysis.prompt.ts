export const generateCompetitorAnalysisPrompt = (
  brandName: string,
  industry: string,
  brandVoice: string,
  coreOfferings: string,
  competitorsData: any[],
  topAds: any[],
  marketSummary: any
) => {
  return `
Here is real Facebook ad data scraped from competitor businesses targeting our audience. 
Analyze this deeply and return a complete report in the exact JSON format specified below.

=== OUR BUSINESS CONTEXT (${brandName}) ===
- Industry: ${industry || 'Unspecified'}
- Core Offerings: ${coreOfferings || 'Not provided'}
- Brand Voice: ${brandVoice || 'Professional, trustworthy, and clear'}

=== COMPETITOR DATA ===
${JSON.stringify(competitorsData, null, 2)}

=== TOP STRONGEST ADS ===
${JSON.stringify(topAds, null, 2)}

=== MARKET SUMMARY ===
${JSON.stringify(marketSummary, null, 2)}

=== STRICT OUTPUT RULES — NO EXCEPTIONS ===
1. competitor_analysis: Include all competitors present in the data. Analyze their angle, threat level, and weaknesses we can exploit.
2. ready_ad_scripts: Create EXACTLY 5 scripts inspired by the strongest ads. They must follow our Brand Voice and highlight our Core Offerings.
3. gap_opportunities: Identify at least 5 gaps competitors are missing (e.g., formats, emotional angles, proofs).
4. action_plan: Provide a 4-step actionable sequence for the upcoming weeks.

Return ONLY valid JSON. No markdown. No text outside the JSON object:

{
  "executive_summary": "<3-4 sentences: what is happening in this market right now, what top competitors are doing, and the single biggest opportunity for us>",
  "market_insights": {
    "dominant_ad_format": "<video/image/carousel>",
    "dominant_emotional_angle": "<what psychological trigger most ads use>",
    "dominant_script_framework": "<framework name>",
    "key_observation": "<one non-obvious insight from the data that we can act on>"
  },
  "competitor_analysis": [
    {
      "page_name": "<name>",
      "ad_score": <best ad score from data>,
      "strategy_summary": "<2-3 sentences on their overall approach>",
      "weaknesses": ["<specific weakness 1>", "<specific weakness 2>"],
      "best_hook": "<their single strongest hook — exact text from data>",
      "threat_level": "<high / medium / low>"
    }
  ],
  "gap_opportunities": [
    {
      "gap": "<what NO competitor is doing well>",
      "opportunity": "<exactly how we can exploit this gap>",
      "priority": "<high/medium/low>"
    }
  ],
  "ready_ad_scripts": [
    {
      "topic": "<Script Concept>",
      "format": "<Video Reel / Image / Carousel>",
      "hook": "<Opening line>",
      "script_or_copy": "<Full text or video timestamps>",
      "visual_direction": "<what to show>",
      "competitor_hook_referenced": "<exact hook from top_ads that inspired this>",
      "why_this_beats_competitors": "<specific reason based on data>"
    }
  ],
  "action_plan": [
    {
      "priority": 1,
      "week": "Week 1",
      "action": "<specific action referencing a script from ready_ad_scripts>"
    }
  ]
}
`;
};
