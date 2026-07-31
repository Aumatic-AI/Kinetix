/**
 * Self-Ad Performance Processor
 *
 * Ports the deterministic scoring formula and pattern-based diagnosis
 * from the legacy project's /api/meta/report-analysis route — the one
 * part of the old system that was never n8n, and is considerably more
 * sophisticated than a simple ROAS threshold. Aggregates daily
 * snapshot rows per ad first (fixing a real bug: the previous version
 * bucketed individual daily rows instead of whole ads, so a 30-day-old
 * ad counted as ~23 separate "seasoned" entries).
 */

export interface DailyRow {
  meta_ad_id: string;
  metric_date: string;
  spend_cents: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number | null;
  cpc_cents: number | null;
  cpm_cents: number | null;
  ad_text: string | null;
  media_url: string | null;
  format: string | null;
}

export interface AggregatedAd {
  metaAdId: string;
  adText: string | null;
  mediaUrl: string | null;
  format: string | null;
  firstSeen: string;
  lastSeen: string;
  daysRunning: number;
  spendCents: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpcCents: number;
  cpmCents: number;
  score: number;
  scoreLabel: "Excellent" | "Good" | "Average" | "Needs Work" | "Critical";
  pattern: "A" | "B" | "C" | "D" | "E" | null;
}

/** Aggregates raw daily snapshot rows into one record per ad, with its
 * true lifetime span — this is what "running for 7+ days" should mean,
 * not "this daily row happens to be old." */
export function aggregateByAd(rows: DailyRow[]): AggregatedAd[] {
  const byAd = new Map<string, DailyRow[]>();
  for (const row of rows) {
    if (!byAd.has(row.meta_ad_id)) byAd.set(row.meta_ad_id, []);
    byAd.get(row.meta_ad_id)!.push(row);
  }

  const now = Date.now();

  return Array.from(byAd.entries()).map(([metaAdId, adRows]) => {
    const sorted = [...adRows].sort((a, b) => a.metric_date.localeCompare(b.metric_date));
    const firstSeen = sorted[0].metric_date;
    const lastSeen = sorted[sorted.length - 1].metric_date;
    const latest = sorted[sorted.length - 1];

    const spendCents = adRows.reduce((s, r) => s + (r.spend_cents || 0), 0);
    const impressions = adRows.reduce((s, r) => s + (r.impressions || 0), 0);
    const clicks = adRows.reduce((s, r) => s + (r.clicks || 0), 0);
    const conversions = adRows.reduce((s, r) => s + (r.conversions || 0), 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpcCents = clicks > 0 ? Math.round(spendCents / clicks) : 0;
    const cpmCents = impressions > 0 ? Math.round((spendCents / impressions) * 1000) : 0;
    const daysRunning = Math.floor((now - new Date(firstSeen).getTime()) / 86_400_000);

    const score = computeScore(spendCents / 100, impressions, clicks, ctr, cpmCents / 100);

    return {
      metaAdId,
      adText: latest.ad_text,
      mediaUrl: latest.media_url,
      format: latest.format,
      firstSeen,
      lastSeen,
      daysRunning,
      spendCents,
      impressions,
      clicks,
      conversions,
      ctr,
      cpcCents,
      cpmCents,
      score,
      scoreLabel: scoreLabel(score),
      pattern: null, // filled in by diagnosePattern once the account average CPC is known
    };
  });
}

/** Same CTR-curve scoring formula as the legacy report-analysis route —
 * proven for this account, and works for any CTR-driven ad platform,
 * not just one vertical. */
function computeScore(spend: number, impressions: number, clicks: number, ctr: number, cpm: number): number {
  if (impressions === 0 && spend === 0) return 5;
  if (clicks === 0) return impressions > 200 ? 12 : 8;

  let ctrScore: number;
  if (ctr < 0.1) ctrScore = 15 + (ctr / 0.1) * 10;
  else if (ctr < 0.3) ctrScore = 25 + ((ctr - 0.1) / 0.2) * 20;
  else if (ctr < 0.7) ctrScore = 45 + ((ctr - 0.3) / 0.4) * 20;
  else if (ctr < 1.5) ctrScore = 65 + ((ctr - 0.7) / 0.8) * 15;
  else ctrScore = 80 + Math.min(((ctr - 1.5) / 1.5) * 15, 15);

  const clickBonus = Math.min(clicks * 0.5, 10);
  const cpmBonus = cpm > 0 && cpm < 2 ? 5 : cpm >= 2 && cpm < 5 ? 3 : cpm > 12 ? -3 : 0;
  return Math.max(5, Math.min(100, Math.round(ctrScore + clickBonus + cpmBonus)));
}

function scoreLabel(score: number): AggregatedAd["scoreLabel"] {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Average";
  if (score >= 20) return "Needs Work";
  return "Critical";
}

/** Root-cause pattern, same five buckets as the legacy diagnosis:
 * A = never delivered, B = seen but nobody clicks, C = clicks but weak CTR,
 * D = good CTR but starved for reach, E = fine CTR but expensive clicks. */
export function diagnosePattern(ad: AggregatedAd, accountAvgCpcCents: number): AggregatedAd["pattern"] {
  const noDelivery = ad.impressions === 0 && ad.spendCents === 0;
  if (noDelivery) return "A";
  const zeroClick = ad.ctr === 0 && ad.spendCents > 0 && ad.impressions > 0;
  if (zeroClick) return "B";
  if (ad.ctr > 0 && ad.ctr < 0.3) return "C";
  if (ad.ctr > 0.5 && ad.impressions < 500) return "D";
  if (ad.ctr >= 0.3 && accountAvgCpcCents > 0 && ad.cpcCents > accountAvgCpcCents * 1.3) return "E";
  return null;
}

export interface SelfAdAnalysisInput {
  topPerformers: AggregatedAd[];
  underperformers: AggregatedAd[];
  totals: { spendCents: number; impressions: number; clicks: number; avgCtr: number; avgCpmCents: number; avgCpcCents: number };
  hasStrongPerformers: boolean;
}

/** Buckets scored, pattern-diagnosed ads into top performers (score >= 40)
 * vs. everything else, and rolls up account totals for prompt context. */
export function bucketAds(scoredAds: AggregatedAd[]): SelfAdAnalysisInput {
  const sorted = [...scoredAds].sort((a, b) => b.score - a.score);
  const qualifiedTop = sorted.filter((a) => a.score >= 40).slice(0, 3);
  const topIds = new Set(qualifiedTop.map((a) => a.metaAdId));
  const underperformers = sorted.filter((a) => !topIds.has(a.metaAdId));

  const spendCents = scoredAds.reduce((s, a) => s + a.spendCents, 0);
  const impressions = scoredAds.reduce((s, a) => s + a.impressions, 0);
  const clicks = scoredAds.reduce((s, a) => s + a.clicks, 0);

  return {
    topPerformers: qualifiedTop,
    underperformers,
    totals: {
      spendCents,
      impressions,
      clicks,
      avgCtr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      avgCpmCents: impressions > 0 ? Math.round((spendCents / impressions) * 1000) : 0,
      avgCpcCents: clicks > 0 ? Math.round(spendCents / clicks) : 0,
    },
    hasStrongPerformers: qualifiedTop.length > 0,
  };
}

/** Deterministic, no-AI fallback report — used if the OpenAI call fails or
 * no API key is configured, so the job always produces something usable. */
export function ruleBasedSelfAdReport(bucketed: SelfAdAnalysisInput) {
  const { topPerformers, underperformers, totals, hasStrongPerformers } = bucketed;
  const best = topPerformers[0];
  const spend = totals.spendCents / 100;

  return {
    ai_overview: `${topPerformers.length + underperformers.length} ads analyzed. Total spend $${spend.toFixed(2)}, ${totals.impressions.toLocaleString()} impressions, ${totals.clicks} clicks, avg CTR ${totals.avgCtr.toFixed(2)}%. ${
      hasStrongPerformers ? `Ad ${best.metaAdId} leads with CTR ${best.ctr.toFixed(2)}%.` : "No ad has reached a score of 40 — all need improvement before scaling budget."
    }`,
    trend_shifts: { fatiguing_angles: [], emerging_winners: [] }, // requires last week's report to compare against — left empty in the deterministic fallback
    winning_patterns: {
      best_format: "insufficient data",
      best_angle: hasStrongPerformers ? `Ad ${best.metaAdId} is winning on raw CTR (${best.ctr.toFixed(2)}%) — no creative-text comparison available without the AI pass.` : "No ad is winning yet.",
      hook_analysis: "Not available in the deterministic fallback — requires the AI pass to read actual ad copy.",
    },
    key_insights: [
      hasStrongPerformers
        ? `Ad ${best.metaAdId} achieves CTR ${best.ctr.toFixed(2)}% with CPM $${(best.cpmCents / 100).toFixed(2)} — concentrate budget here.`
        : "No ad is generating reliable clicks. All need hook rewrites before scaling.",
      `${underperformers.filter((a) => a.spendCents === 0 && a.impressions === 0).length} ads have never served — check status and budget before editing copy.`,
      totals.avgCtr < 0.3 ? "Average CTR is below 0.3%. The hook needs to be stronger across the board." : "CTR is at benchmark — scale top performers.",
    ],
    top_performer_notes: topPerformers.map((a) => ({
      meta_ad_id: a.metaAdId,
      why_performing: `CTR ${a.ctr.toFixed(2)}%, CPM $${(a.cpmCents / 100).toFixed(2)}, ${a.clicks} clicks over ${a.daysRunning} days.`,
    })),
    underperformer_suggestions: underperformers.map((a) => ({
      meta_ad_id: a.metaAdId,
      pattern: a.pattern,
      issue:
        a.pattern === "A"
          ? "Never served — check status and budget before touching creative."
          : a.pattern === "B"
          ? `Spent $${(a.spendCents / 100).toFixed(2)} with ${a.impressions.toLocaleString()} impressions and 0 clicks — the hook is failing to stop the scroll.`
          : `CTR ${a.ctr.toFixed(2)}% — below benchmark. Audience or copy needs work.`,
      headline_suggestion: null,
      cta_suggestion: null,
      budget_suggestion: a.pattern === "A" ? "Set a minimum daily budget and confirm the campaign/ad set/ad status is active." : null,
      targeting_suggestion: null,
    })),
    creative_directives: [], // requires reading actual ad copy — left empty in the deterministic fallback
    budget_recommendations: hasStrongPerformers ? [`Increase budget on ad ${best.metaAdId}, currently at CTR ${best.ctr.toFixed(2)}%.`] : [],
    overall_recommendation: hasStrongPerformers
      ? `Increase budget on ad ${best.metaAdId}. Pause zero-CTR ads until hooks are rewritten.`
      : "No ad is generating reliable clicks. Rewrite hooks across the board before scaling any budget.",
  };
}
