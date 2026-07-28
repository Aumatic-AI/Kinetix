import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Latest competitor-intelligence report, shown on the Dashboard tab. Same
 * `ad_analysis_reports` row the weekly competitor-scraper job writes —
 * extracted out of Dashboard.tsx itself so hooks/ mirrors the sidebar tabs
 * (Dashboard / Ad Library / Campaigns / Reports / Lead Responses) the same
 * way pages/ and components/ do. */
export function useDashboardInsights() {
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

  return { insights, generatedAt, loading };
}
