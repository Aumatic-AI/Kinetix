"use client";
import React from "react";
import { Sparkles } from "lucide-react";
import { formatDate } from "@/utils/datetime";
import { useDashboardInsights } from "../hooks/useDashboard";
import { KpiRow } from "../components/dashboard/KpiRow";
import { FormatBreakdown } from "../components/dashboard/FormatBreakdown";
import { MarketPulse } from "../components/dashboard/MarketPulse";
import { GapOpportunities } from "../components/dashboard/GapOpportunities";
import { ReadyAdsGrid } from "../components/dashboard/ReadyAdsGrid";

export function Dashboard() {
  const { insights, generatedAt, loading } = useDashboardInsights();

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-10">
        <div className="h-8 w-40 rounded-lg bg-surface animate-pulse" />
        <div className="h-24 rounded-2xl bg-surface animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-2xl bg-surface animate-pulse" />)}
        </div>
      </div>
    );
  }

  const meta = insights.meta || {};
  const marketStats = meta.market_stats || {};
  const bestHookFormula = insights.hook_analysis?.best_hook_formula;
  const hasAnyData = !!insights.executive_summary;

  const formats = marketStats.formats;
  const formatTotal = formats ? formats.video + formats.image + formats.carousel + formats.text : 0;
  const dominantFormat = formats && formatTotal
    ? (() => {
        const name = (["video", "image", "carousel", "text"] as const).reduce((best, key) => (formats[key] > formats[best] ? key : best), "video");
        return { name: name.charAt(0).toUpperCase() + name.slice(1), pct: Math.round((formats[name] / formatTotal) * 100) };
      })()
    : null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-text">Dashboard</h2>
        <p className="text-muted text-sm mt-1">
          {generatedAt ? `Competitor intelligence last synced ${formatDate(generatedAt)}` : "Competitor intelligence, updated automatically every week."}
        </p>
      </div>

      {!hasAnyData ? (
        <div className="text-center py-24 text-muted border border-default rounded-2xl border-dashed">
          No analysis yet. The weekly scraper job will generate one automatically.
        </div>
      ) : (
        <>
          {/* AI Insight — the five-second takeaway, first thing on the page.
              A quiet neutral card with a small icon accent, not a colored
              gradient wash — the takeaway itself should carry the weight. */}
          <div className="flex items-start gap-3 rounded-2xl border border-default/60 bg-background shadow-sm px-6 py-5">
            <div className="w-9 h-9 rounded-full bg-text text-background flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-2 min-w-0">
              <p className="text-text text-sm leading-relaxed">{insights.executive_summary}</p>
              {bestHookFormula && (
                <p className="text-xs text-muted font-semibold">{bestHookFormula}</p>
              )}
            </div>
          </div>

          {/* KPIs — the top-level numbers, glanceable in five seconds */}
          <KpiRow
            totalCompetitors={meta.total_competitors}
            dominantFormat={dominantFormat}
            longevity={marketStats.longevity}
            gapCount={insights.gap_opportunities?.length}
          />

          {/* Trends — context behind the KPIs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <FormatBreakdown formats={marketStats.formats} />
            <MarketPulse topAngles={marketStats.top_angles} />
          </div>

          {/* Detail + action */}
          <GapOpportunities gaps={insights.gap_opportunities} />

          <ReadyAdsGrid scripts={insights.ready_ad_scripts} reportKey={generatedAt ?? undefined} />
        </>
      )}
    </div>
  );
}
