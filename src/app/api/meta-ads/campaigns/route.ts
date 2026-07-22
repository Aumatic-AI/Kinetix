import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { requireMetaAdAccountEnv, graphGet } from "@/services/meta/graph-client";
import { CampaignsService } from "@/modules/meta-ads/services/campaigns.service";
import { MetaAdsService } from "@/modules/meta-ads/services/meta-ads.service";
import { CampaignListItem } from "@/modules/meta-ads/types/meta-ads.types";

interface LiveCampaign {
  id: string;
  status: string;
  adsets?: { data?: { id: string; status: string; ads?: { data?: { id: string; status: string }[] } }[] };
}

/**
 * Always live — our own campaigns rows are only a pointer (business +
 * creative ownership); current status/budget always comes straight from
 * Meta so this list can never show stale numbers. One nested Graph call
 * covers the whole account instead of one call per campaign.
 */
export async function GET() {
  try {
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const businessId = await MetaAdsService.getFirstBusinessId(supabase);
    if (!businessId) return NextResponse.json({ campaigns: [] });

    const ourCampaigns = await CampaignsService.getCampaignsByBusiness(businessId);
    if (ourCampaigns.length === 0) return NextResponse.json({ campaigns: [] });

    const { accessToken, adAccountId } = requireMetaAdAccountEnv();
    const live = await graphGet<{ data?: LiveCampaign[] }>(`act_${adAccountId}/campaigns`, accessToken, {
      fields: "id,status,adsets{id,status,ads{id,status}}",
      limit: "200",
    });
    const liveById = new Map((live.data || []).map((c) => [c.id, c]));

    // One query for every ad_set -> ad -> creative thumbnail in this business,
    // so the list doesn't fan out into one lookup per campaign.
    const { data: adSetRows } = await supabase
      .from("ad_sets")
      .select("campaign_id, ads(creative_id, meta_ad_creatives(media_urls))")
      .eq("business_id", businessId);

    const thumbnailByCampaignId = new Map<string, string>();
    for (const row of adSetRows || []) {
      if (thumbnailByCampaignId.has(row.campaign_id)) continue;
      for (const ad of (row as any).ads || []) {
        const mediaUrls = ad?.meta_ad_creatives?.media_urls;
        const first = Array.isArray(mediaUrls) ? mediaUrls[0] : undefined;
        if (first) {
          thumbnailByCampaignId.set(row.campaign_id, first as string);
          break;
        }
      }
    }

    const campaigns: CampaignListItem[] = ourCampaigns.map((c) => {
      const liveData = c.external_campaign_id ? liveById.get(c.external_campaign_id) : undefined;
      const adSets = liveData?.adsets?.data || [];
      const adCount = adSets.reduce((sum, as) => sum + (as.ads?.data?.length || 0), 0);
      return {
        id: c.id,
        externalCampaignId: c.external_campaign_id || "",
        name: c.name,
        objective: c.objective,
        status: liveData?.status || (c.status === "draft" ? "NOT_ON_META" : c.status.toUpperCase()),
        dailyBudgetCents: c.daily_budget_cents,
        lifetimeBudgetCents: c.lifetime_budget_cents,
        adSetCount: adSets.length,
        adCount,
        creativeThumbnailUrl: thumbnailByCampaignId.get(c.id),
      };
    });

    return NextResponse.json({ campaigns });
  } catch (error: any) {
    console.error("[META_ADS_CAMPAIGNS_LIST]", error);
    return NextResponse.json({ error: error.message || "Failed to load campaigns" }, { status: 500 });
  }
}
