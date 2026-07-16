/**
 * Meta Ads Insights Service
 *
 * Ports the proven Graph API calls from the legacy project's
 * /api/meta/live-ads and /api/meta/report-analysis routes: fetch the
 * ad account's ads + campaigns, then their performance insights,
 * paginating through Meta's cursor-based results. Used by
 * meta-ads-performance-sync.job.ts to populate ad_performance_daily —
 * this service only reads from Meta, it never writes to Supabase.
 */

const GRAPH_URL = "https://graph.facebook.com/v21.0";

export interface MetaAdWithInsights {
  metaAdId: string;
  name: string;
  campaignName: string;
  status: string;
  headline: string;
  body: string;
  imageUrl: string;
  spendCents: number;
  impressions: number;
  clicks: number;
  reach: number;
  ctr: number;
  cpcCents: number;
  cpmCents: number;
  conversions: number;
}

async function graphGet(path: string, accessToken: string, params: Record<string, string> = {}) {
  const url = new URL(`${GRAPH_URL}/${path}`);
  url.searchParams.set("access_token", accessToken);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Meta Graph API error on ${path}`);
  return data;
}

/** Follows Meta's cursor-based pagination, capped at 500 items as a safety limit. */
async function graphGetAllPages(path: string, accessToken: string, params: Record<string, string> = {}) {
  const items: Record<string, any>[] = [];
  const first = await graphGet(path, accessToken, params);
  items.push(...(first.data || []));
  let next: string | null = first.paging?.next || null;
  while (next && items.length < 500) {
    const res = await fetch(next);
    const data = await res.json();
    items.push(...(data.data || []));
    next = data.paging?.next || null;
  }
  return items;
}

function countLeads(actions: Array<{ action_type: string; value: string }> | undefined): number {
  if (!actions) return 0;
  const lead = actions.find((a) => a.action_type === "lead")?.value;
  const onsiteLead = actions.find((a) => a.action_type === "onsite_conversion.lead_grouped")?.value;
  return parseInt(lead || "0", 10) + parseInt(onsiteLead || "0", 10);
}

export class MetaAdsInsightsService {
  /**
   * Fetches every active/paused ad on the account, joined with its campaign
   * name and its performance insights over the given date_preset. Insights
   * are fetched once at ad level for the whole account, not per-ad, to stay
   * within Meta's rate limits.
   */
  static async fetchAdsWithInsights(
    accessToken: string,
    adAccountId: string,
    datePreset: string = "yesterday"
  ): Promise<MetaAdWithInsights[]> {
    const adsRaw = await graphGetAllPages(`act_${adAccountId}/ads`, accessToken, {
      fields: "id,name,status,effective_status,campaign_id,creative{title,body,image_url,thumbnail_url}",
      limit: "200",
    });

    if (!adsRaw.length) return [];

    const campaignsRaw = await graphGetAllPages(`act_${adAccountId}/campaigns`, accessToken, {
      fields: "id,name",
      limit: "200",
    });
    const campaignNameById = new Map(campaignsRaw.map((c) => [c.id as string, c.name as string]));

    const insightFields = "ad_id,spend,impressions,clicks,inline_link_clicks,inline_link_click_ctr,cpc,cpm,reach,actions";
    let insightsRaw: Record<string, any>[] = [];
    try {
      insightsRaw = await graphGetAllPages(`act_${adAccountId}/insights`, accessToken, {
        level: "ad",
        fields: insightFields,
        date_preset: datePreset,
        limit: "200",
      });
    } catch {
      // No insights yet for this period (e.g. brand new account) — proceed with zeroed metrics.
    }
    const insightByAdId = new Map(insightsRaw.map((i) => [i.ad_id as string, i]));

    return adsRaw
      .filter((ad) => ["ACTIVE", "PAUSED", "CAMPAIGN_PAUSED", "ADSET_PAUSED"].includes((ad.effective_status || ad.status || "").toUpperCase()))
      .map((ad) => {
        const ins = insightByAdId.get(ad.id as string) || {};
        const creative = ad.creative || {};
        const spend = parseFloat(ins.spend || "0");
        const impressions = parseInt(ins.impressions || "0", 10);
        const clicks = parseInt(ins.inline_link_clicks || ins.clicks || "0", 10);
        return {
          metaAdId: ad.id as string,
          name: ad.name as string,
          campaignName: campaignNameById.get(ad.campaign_id as string) || "",
          status: (ad.effective_status || ad.status || "").toUpperCase(),
          headline: creative.title || "",
          body: creative.body || "",
          imageUrl: creative.image_url || creative.thumbnail_url || "",
          spendCents: Math.round(spend * 100),
          impressions,
          clicks,
          reach: parseInt(ins.reach || "0", 10),
          ctr: parseFloat(ins.inline_link_click_ctr || "0"),
          cpcCents: Math.round(parseFloat(ins.cpc || "0") * 100),
          cpmCents: Math.round(parseFloat(ins.cpm || "0") * 100),
          conversions: countLeads(ins.actions),
        };
      });
  }
}
