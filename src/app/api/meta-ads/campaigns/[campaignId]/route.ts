import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { requireMetaAdAccountEnv, graphGet, graphPost } from "@/services/meta/graph-client";
import { CampaignsService } from "@/modules/meta-ads/services/campaigns.service";
import { CampaignDetail } from "@/modules/meta-ads/types/meta-ads.types";

interface LiveCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  adsets?: { data?: { id: string; name: string; status: string; ads?: { data?: { id: string; name: string; status: string }[] } }[] };
}

export async function GET(_request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  try {
    const { campaignId } = await params;
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const ourCampaign = await CampaignsService.getCampaignById(campaignId);
    if (!ourCampaign?.external_campaign_id) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const { accessToken } = requireMetaAdAccountEnv();
    const live = await graphGet<LiveCampaign>(ourCampaign.external_campaign_id, accessToken, {
      fields: "id,name,status,objective,daily_budget,lifetime_budget,adsets{id,name,status,ads{id,name,status}}",
    });

    const ourAdSets = await CampaignsService.getAdSetsByCampaign(campaignId);
    const ourAds = await CampaignsService.getAdsByAdSets(ourAdSets.map((a) => a.id));
    const creativeIds = ourAds.map((a) => a.creative_id).filter(Boolean) as string[];
    const { data: creatives } = creativeIds.length
      ? await supabase.from("meta_ad_creatives").select("id, media_urls").in("id", creativeIds)
      : { data: [] as { id: string; media_urls: unknown }[] };
    const thumbnailByCreativeId = new Map(
      (creatives || []).map((c) => [c.id, Array.isArray(c.media_urls) ? (c.media_urls as string[])[0] : undefined])
    );
    const ourAdByExternalId = new Map(ourAds.map((a) => [a.external_ad_id, a]));

    const detail: CampaignDetail = {
      id: ourCampaign.id,
      externalCampaignId: ourCampaign.external_campaign_id,
      name: live.name,
      objective: live.objective || ourCampaign.objective,
      status: live.status,
      dailyBudgetCents: live.daily_budget ? parseInt(live.daily_budget, 10) : ourCampaign.daily_budget_cents,
      lifetimeBudgetCents: live.lifetime_budget ? parseInt(live.lifetime_budget, 10) : ourCampaign.lifetime_budget_cents,
      adSetCount: live.adsets?.data?.length || 0,
      adCount: (live.adsets?.data || []).reduce((sum, as) => sum + (as.ads?.data?.length || 0), 0),
      adSets: (live.adsets?.data || []).map((as) => {
        const ourAdSet = ourAdSets.find((o) => o.external_adset_id === as.id);
        return {
          id: ourAdSet?.id || as.id,
          externalAdsetId: as.id,
          name: as.name,
          status: as.status,
          dailyBudgetCents: ourAdSet?.daily_budget_cents ?? null,
          ads: (as.ads?.data || []).map((ad) => {
            const ourAd = ourAdByExternalId.get(ad.id);
            return {
              id: ourAd?.id || ad.id,
              externalAdId: ad.id,
              name: ad.name,
              status: ad.status,
              creativeId: ourAd?.creative_id || null,
              externalCreativeId: ourAd?.external_creative_id || null,
              thumbnailUrl: ourAd?.creative_id ? thumbnailByCreativeId.get(ourAd.creative_id) : undefined,
            };
          }),
        };
      }),
    };

    return NextResponse.json({ campaign: detail });
  } catch (error: any) {
    console.error("[META_ADS_CAMPAIGN_DETAIL]", error);
    return NextResponse.json({ error: error.message || "Failed to load campaign" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  try {
    const { campaignId } = await params;
    const body = await request.json();
    const ourCampaign = await CampaignsService.getCampaignById(campaignId);
    if (!ourCampaign?.external_campaign_id) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const { accessToken } = requireMetaAdAccountEnv();
    const payload: Record<string, unknown> = {};
    if (body.name) payload.name = body.name;
    if (body.endAt) payload.end_time = Math.floor(new Date(body.endAt).getTime() / 1000);
    if (Object.keys(payload).length > 0) {
      await graphPost(ourCampaign.external_campaign_id, accessToken, payload);
    }

    await CampaignsService.updateCampaign(campaignId, {
      ...(body.name ? { name: body.name } : {}),
      ...(body.endAt ? { end_at: body.endAt } : {}),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[META_ADS_CAMPAIGN_UPDATE]", error);
    return NextResponse.json({ error: error.message || "Failed to update campaign" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  try {
    const { campaignId } = await params;
    const ourCampaign = await CampaignsService.getCampaignById(campaignId);
    if (!ourCampaign?.external_campaign_id) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const { accessToken } = requireMetaAdAccountEnv();
    // Meta doesn't support a true DELETE on campaigns — archiving is the
    // permanent equivalent (unlike PAUSED, an archived campaign can't be
    // resumed from Ads Manager).
    await graphPost(ourCampaign.external_campaign_id, accessToken, { status: "ARCHIVED" });
    await CampaignsService.updateCampaign(campaignId, { status: "archived" });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[META_ADS_CAMPAIGN_DELETE]", error);
    return NextResponse.json({ error: error.message || "Failed to archive campaign" }, { status: 500 });
  }
}
