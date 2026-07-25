import { NextResponse } from "next/server";
import { requireMetaAdAccountEnv, graphGet, graphPost } from "@/services/meta/graph-client";
import { fetchObjectMetrics } from "@/modules/meta-ads/services/insights.service";
import { CampaignsService } from "@/modules/meta-ads/services/campaigns.service";
import { CampaignPageDetail } from "@/modules/meta-ads/types/meta-ads.types";

interface LiveCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  buying_type?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
  created_time?: string;
  adsets?: { data?: { id: string; name: string; status: string; ads?: { data?: { id: string }[] } }[] };
}

export async function GET(_request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  try {
    const { campaignId } = await params;
    const ourCampaign = await CampaignsService.getCampaignById(campaignId);
    if (!ourCampaign?.external_campaign_id) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const { accessToken } = requireMetaAdAccountEnv();
    const [live, metrics] = await Promise.all([
      graphGet<LiveCampaign>(ourCampaign.external_campaign_id, accessToken, {
        fields: "id,name,status,objective,buying_type,daily_budget,lifetime_budget,start_time,stop_time,created_time,adsets{id,name,status,ads{id}}",
      }),
      fetchObjectMetrics(ourCampaign.external_campaign_id, accessToken),
    ]);

    const ourAdSets = await CampaignsService.getAdSetsByCampaign(campaignId);
    const liveAdSets = live.adsets?.data || [];

    const detail: CampaignPageDetail = {
      id: ourCampaign.id,
      externalCampaignId: ourCampaign.external_campaign_id,
      name: live.name,
      objective: live.objective || ourCampaign.objective,
      status: live.status,
      buyingType: live.buying_type || null,
      dailyBudgetCents: live.daily_budget ? parseInt(live.daily_budget, 10) : ourCampaign.daily_budget_cents,
      lifetimeBudgetCents: live.lifetime_budget ? parseInt(live.lifetime_budget, 10) : ourCampaign.lifetime_budget_cents,
      currency: ourCampaign.currency,
      startAt: live.start_time || ourCampaign.start_at,
      endAt: live.stop_time || ourCampaign.end_at,
      createdAt: live.created_time || ourCampaign.created_at,
      adSetCount: liveAdSets.length,
      adCount: liveAdSets.reduce((sum, as) => sum + (as.ads?.data?.length || 0), 0),
      metrics,
      adSets: liveAdSets.map((as) => {
        const ourAdSet = ourAdSets.find((o) => o.external_adset_id === as.id);
        return {
          id: ourAdSet?.id || as.id,
          externalAdsetId: as.id,
          name: as.name,
          status: as.status,
          dailyBudgetCents: ourAdSet?.daily_budget_cents ?? null,
          lifetimeBudgetCents: ourAdSet?.lifetime_budget_cents ?? null,
          optimizationGoal: ourAdSet?.optimization_goal ?? null,
          adCount: as.ads?.data?.length || 0,
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
