/**
 * Self (Business) Ad Performance Analysis Prompt
 *
 * Ports the domain knowledge and anti-hallucination rules from the
 * legacy project's /api/meta/report-analysis route — the richest part
 * of the old system, and the one part that was never n8n. Genericized:
 * industry/CTR-benchmark framing comes from the business's own config
 * instead of being hardcoded to one vertical.
 */

import type { AggregatedAd, SelfAdAnalysisInput } from "@/services/ai/self-ad-processor";

interface BusinessAnalysisPromptInput {
  businessName: string;
  industry: string | null;
  bucketed: SelfAdAnalysisInput;
  lastWeekInsights: any;
}

const ADS_DOMAIN_CONTEXT = `
## META ADS FUNDAMENTALS

### Auction Mechanics
Total Value = Bid x Estimated Action Rate x Ad Quality. Higher CTR -> higher estimated action rate -> cheaper CPM. A 2x CTR improvement often halves CPM. CTR is the single biggest lever - fix it before touching anything else.

### CTR Benchmarks
  < 0.1%   -> hook is completely failing. Rewrite headline first.
  0.1-0.3% -> below average. Body or audience needs work.
  0.3-0.7% -> average. Optimize CTA and audience.
  0.7-1.5% -> good. Scale carefully, watch frequency.
  > 1.5%   -> excellent. Double budget, build lookalikes.

### CPM Benchmarks
  < $2 CPM  -> very efficient but may need a more qualified audience
  $2-6 CPM  -> healthy range
  > $10 CPM -> audience too narrow or low quality score

### Diagnosis Patterns (already computed — do not recompute, just explain)
  PATTERN A - spend=0, impressions=0: ad/campaign/adset is paused or budget=$0. Creative changes are useless until delivery is fixed.
  PATTERN B - impressions>200, spend>0, clicks=0, CTR=0%: creative hook failing. Audience sees the ad but doesn't click.
  PATTERN C - clicks>0 but CTR<0.3%, high CPC: wrong audience or weak body. Creative is partially working.
  PATTERN D - CTR>0.5% but impressions<500: budget or audience too narrow - delivery is starved.
  PATTERN E - decent CTR, CPC high vs account average: CTA mismatch or audience not ready for conversion.

### Editable Parameters After Publishing
AD LEVEL (no learning reset): headline, primary text/body, description, CTA button, destination URL/UTM, ad name.
AD SET LEVEL (resets learning): budget, location, age range, gender, interests/behaviors, custom/lookalike audiences, exclusions, placements, bid strategy, schedule, attribution window.
CAMPAIGN LEVEL: campaign budget (CBO), bid strategy, start/end dates. Cannot edit objective or buying type after creation.

### ABSOLUTE ANTI-HALLUCINATION RULES
1. NEVER invent offerings, prices, locations, or statistics unless they appear verbatim in the ad_text field provided in the data.
2. If ad_text is null or empty: output null for all creative suggestions. Do not guess what the ad might say from its ID.
3. NEVER output bracket templates like [amount] or [offer] as a final suggestion — if you cannot write a specific suggestion without invented data, output null for that field.
4. Only use actual numbers from the metrics provided. Never round up or exaggerate.
5. A suggestion must be null unless you can write a concrete, specific action tied to this exact ad's data. Fewer good suggestions beat many generic ones.
`;

export const generateBusinessAnalysisPrompt = ({ businessName, industry, bucketed, lastWeekInsights }: BusinessAnalysisPromptInput) => {
  const { topPerformers, underperformers, totals, hasStrongPerformers } = bucketed;

  const adToPromptRow = (a: AggregatedAd) => ({
    meta_ad_id: a.metaAdId,
    score: a.score,
    score_label: a.scoreLabel,
    pattern: a.pattern,
    days_running: a.daysRunning,
    ad_text: a.adText,
    has_creative_data: !!a.adText,
    metrics: {
      spend: Number((a.spendCents / 100).toFixed(2)),
      impressions: a.impressions,
      clicks: a.clicks,
      conversions: a.conversions,
      ctr_pct: Number(a.ctr.toFixed(4)),
      cpc: a.cpcCents > 0 ? Number((a.cpcCents / 100).toFixed(2)) : null,
      cpm: a.cpmCents > 0 ? Number((a.cpmCents / 100).toFixed(2)) : null,
    },
  });

  const system = `You are a top-tier media buyer and creative strategist for ${businessName}, analyzing the live Meta ad account for our ${industry || "business"}.
${ADS_DOMAIN_CONTEXT}

## YOUR TASK
Ads have already been scored and diagnosed by a deterministic formula — DO NOT change scores, labels, or patterns. Write analysis text and targeted suggestions only, strictly following the anti-hallucination rules above.

Return ONLY valid JSON. No markdown. No backticks. No text outside the JSON object.`;

  const user = `=== HISTORICAL CONTEXT (LAST WEEK'S REPORT) ===
${lastWeekInsights ? JSON.stringify(lastWeekInsights) : "No historical data available. This is the first analysis."}

=== ACCOUNT TOTALS ===
spend=$${(totals.spendCents / 100).toFixed(2)} | impressions=${totals.impressions.toLocaleString()} | clicks=${totals.clicks} | avg_ctr=${totals.avgCtr.toFixed(4)}% | avg_cpm=$${(totals.avgCpmCents / 100).toFixed(2)} | avg_cpc=$${(totals.avgCpcCents / 100).toFixed(2)}

=== TOP PERFORMERS (score >= 40) ===
${JSON.stringify(topPerformers.map(adToPromptRow))}

=== UNDERPERFORMERS ===
${JSON.stringify(underperformers.map(adToPromptRow))}

Compare what's winning *now* against last week's report. Identify fatigue and emerging winners. Extract creative directives the AI ad generator must follow next week.

Return this exact JSON shape:

{
  "ai_overview": "2-3 sentences using real numbers: total spend, avg CTR, biggest single opportunity",
  "trend_shifts": {
    "fatiguing_angles": ["<e.g. an angle whose hook rate dropped this week vs last — only if last week's report is available>"],
    "emerging_winners": ["<e.g. a format/angle showing improved CTR this week>"]
  },
  "winning_patterns": {
    "best_format": "<video/image, based on which is scoring higher — or 'insufficient data' if only one format is present>",
    "best_angle": "<why the top performers are winning, referencing their actual ad_text>",
    "hook_analysis": "<what specifically makes the winning hooks perform, tied to real CTR numbers>"
  },
  "key_insights": [
    "<insight with a real ad id and metric>",
    "<why the top performer outperforms — actual CTR/CPM numbers>",
    "<shared problem across underperformers, if any>"
  ],
  "top_performer_notes": [
    { "meta_ad_id": "<id>", "why_performing": "specific CTR %, clicks, CPM — reference actual ad_text if available" }
  ],
  "underperformer_suggestions": [
    {
      "meta_ad_id": "<id>",
      "pattern": "A|B|C|D|E",
      "issue": "root cause in one sentence with actual numbers",
      "headline_suggestion": "<specific rewrite from real ad_text, OR null>",
      "cta_suggestion": "<specific CTA change, OR null>",
      "budget_suggestion": "<concrete $-amount action, OR null>",
      "targeting_suggestion": "<specific audience action, OR null>"
    }
  ],
  "creative_directives": [
    "<specific rule the AI ad generator must follow next week, e.g. 'stop using angle X, pivot to Y'>"
  ],
  "budget_recommendations": [
    "<actionable advice: scale ad X, pause ad Y, with a concrete $ amount>"
  ],
  "overall_recommendation": "single highest-ROI action, referencing a specific ad id and an exact $ move"
}

HARD RULES:
- top_performer_notes: exactly ${topPerformers.length} entries
- underperformer_suggestions: exactly ${underperformers.length} entries
- Never invent data not present in the ads data above
- Prefer null over generic advice`;

  return { system, user };
};
