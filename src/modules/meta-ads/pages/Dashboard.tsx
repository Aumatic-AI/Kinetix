"use client";
import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { KpiRow } from "../components/competitors/KpiRow";
import { FormatBreakdown } from "../components/competitors/FormatBreakdown";
import { MarketPulse } from "../components/competitors/MarketPulse";
import { GapOpportunities } from "../components/competitors/GapOpportunities";
import { ReadyAdsGrid } from "../components/competitors/ReadyAdsGrid";

export function Dashboard() {
  const [insights, setInsights] = useState<any>({});
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: intelData } = await (supabase
        .from("ad_analysis_reports") as any)
        .select("insights, created_at")
        .eq("report_type", "competitor")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (intelData?.insights) {
        setInsights(intelData.insights);
        setGeneratedAt(intelData.created_at);
      }
      setLoading(false);
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          {generatedAt ? `Competitor intelligence last synced ${new Date(generatedAt).toLocaleDateString()}` : "Competitor intelligence, updated automatically every week."}
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
