import { useQuery } from "@tanstack/react-query";

export interface ReportAd {
  adId: string;
  adName: string;
  campaignId: string;
  campaignName: string;
  status: string;
  thumbnailUrl?: string;
  headline: string | null;
  body: string | null;
  cta: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  reach: number;
  score: number;
  scoreLabel: string;
}

export interface ReportSummary {
  totalAds: number;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  avgCtr: number;
  avgCpm: number;
  scoreMethodology: string;
}

export type ReportRange = "today" | "7d" | "14d" | "30d" | "all" | "custom";

/** Always live from Meta for whatever range is selected — see the build
 * guide's "Reports" section for why this never touches the nightly
 * ad_performance_daily snapshot table. staleTime keeps repeat visits to the
 * same range from re-hitting the Graph API every render. */
export function useReportsData(range: ReportRange, customStart?: string, customEnd?: string) {
  return useQuery({
    queryKey: ["reports", range, customStart, customEnd],
    queryFn: async () => {
      const params = new URLSearchParams({ range });
      if (range === "custom" && customStart && customEnd) {
        params.set("start", customStart);
        params.set("end", customEnd);
      }
      const res = await fetch(`/api/meta-ads/reports?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load reports");
      return data as { ads: ReportAd[]; summary: ReportSummary };
    },
    enabled: range !== "custom" || (!!customStart && !!customEnd),
    staleTime: 2 * 60 * 1000,
  });
}
