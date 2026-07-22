import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { requireMetaAdAccountEnv, graphPost } from "@/services/meta/graph-client";
import { uploadMediaToMeta, resolvePageId, fetchExistingCampaignInfo, getOrCreatePixelId } from "@/modules/meta-ads/services/launch.service";
import { MetaAdsService } from "@/modules/meta-ads/services/meta-ads.service";
import { CampaignsService } from "@/modules/meta-ads/services/campaigns.service";
import { LaunchCampaignInput } from "@/modules/meta-ads/types/meta-ads.types";

export const maxDuration = 60; // video upload polling can take up to ~45s

/**
 * Creative -> live Campaign/Ad Set/Creative/Ad, all created PAUSED. Going
 * live afterward is a separate, explicit action (Smart Run or Resume) —
 * Launch itself never starts spending money. Ported from the legacy
 * project's /api/meta/launch route: same media-upload/thumbnail/pixel/DSA
 * steps, split into named functions (launch.service.ts) instead of one
 * 600-line handler, and every object created is now written to our own
 * campaigns/ad_sets/ads tables as a pointer (external_*_id), which the
 * legacy version never did.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LaunchCampaignInput;

    const required: (keyof LaunchCampaignInput)[] = ["creativeId", "campaignName", "objective", "headline", "primaryText", "dailyBudgetCents", "ctaType", "websiteUrl"];
    for (const field of required) {
      if (!body[field]) return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
    }

    const { accessToken, adAccountId } = requireMetaAdAccountEnv();
    const supabase = (await createClient()) as SupabaseClient<Database>;

    const creative = await MetaAdsService.getCreativeById(supabase, body.creativeId);
    if (!creative) return NextResponse.json({ error: "Creative not found" }, { status: 404 });
    if (creative.status !== "approved") {
      return NextResponse.json({ error: "Only approved creatives can be launched. Approve it in Ad Library first." }, { status: 400 });
    }

    const mediaUrls = Array.isArray(creative.media_urls) ? (creative.media_urls as string[]) : [];
    if (!mediaUrls[0]) return NextResponse.json({ error: "This creative has no media to launch." }, { status: 400 });
    const isVideo = creative.type === "video";

    const businessId = creative.business_id;
    const business = await MetaAdsService.getBusinessById(supabase, businessId);
    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    let existingExternalCampaignId: string | null = null;
    let objective = body.objective;
    let isCbo = false;
    if (body.existingCampaignId) {
      const existingRow = await CampaignsService.getCampaignById(body.existingCampaignId);
      if (!existingRow?.external_campaign_id) {
        return NextResponse.json({ error: "The selected existing campaign could not be found." }, { status: 404 });
      }
      existingExternalCampaignId = existingRow.external_campaign_id;
      const info = await fetchExistingCampaignInfo(existingExternalCampaignId, accessToken);
      objective = info.objective as LaunchCampaignInput["objective"];
      isCbo = info.isCbo;
    }

    const leadGenFormId = body.leadGenFormId || null;
    const isLeadGenForm = objective === "OUTCOME_LEADS" && !!leadGenFormId;
    const isPixelRequired = !isLeadGenForm && (objective === "OUTCOME_SALES" || objective === "OUTCOME_LEADS");

    const [mediaPayload, pageId] = await Promise.all([
      uploadMediaToMeta(mediaUrls[0], isVideo, accessToken, adAccountId),
      resolvePageId(accessToken),
    ]);

    let promotedObject: Record<string, unknown> | undefined;
    let trackingSpecs: unknown[] | undefined;
    let optimizationGoal = isLeadGenForm ? "LEAD_GENERATION" : "LINK_CLICKS";

    if (isLeadGenForm) {
      promotedObject = { page_id: pageId };
    } else if (isPixelRequired) {
      const pixelId = await getOrCreatePixelId(accessToken, adAccountId);
      const customEvent = objective === "OUTCOME_SALES" ? "PURCHASE" : "LEAD";
      promotedObject = { pixel_id: pixelId, custom_event_type: customEvent };
      trackingSpecs = [{ "action.type": ["offsite_conversion"], fb_pixel: [pixelId] }];
      optimizationGoal = "OFFSITE_CONVERSIONS";
    }

    const startTime = body.startAt ? Math.floor(new Date(body.startAt).getTime() / 1000) : Math.floor(Date.now() / 1000);
    const endTime = body.endAt ? Math.floor(new Date(body.endAt).getTime() / 1000) : undefined;

    const targeting = {
      geo_locations: { countries: body.countries?.length ? body.countries : ["US"], location_types: ["home", "recent"] },
      age_min: body.ageMin || 18,
      age_max: body.ageMax || 65,
      ...(body.gender === 1 || body.gender === 2 ? { genders: [body.gender] } : {}),
      targeting_automation: { advantage_audience: 0 },
    };

    // Meta requires these transparency fields on every ACTIVE ad globally, not just in the EU.
    const dsaFields = { dsa_beneficiary: business.name, dsa_payor: business.name };

    // ── Campaign ──
    const externalCampaignId =
      existingExternalCampaignId ||
      (
        await graphPost<{ id: string }>(`act_${adAccountId}/campaigns`, accessToken, {
          name: body.campaignName,
          objective,
          status: "PAUSED",
          special_ad_categories: ["NONE"],
          ...(isCbo ? { daily_budget: body.dailyBudgetCents } : { is_adset_budget_sharing_enabled: false }),
        })
      ).id;

    // ── Ad Set ──
    const externalAdSetId = (
      await graphPost<{ id: string }>(`act_${adAccountId}/adsets`, accessToken, {
        name: `${body.campaignName} - Ad Set`,
        campaign_id: externalCampaignId,
        ...(!isCbo ? { daily_budget: body.dailyBudgetCents } : {}),
        start_time: startTime,
        ...(endTime ? { end_time: endTime } : {}),
        billing_event: "IMPRESSIONS",
        optimization_goal: optimizationGoal,
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
        targeting,
        ...dsaFields,
        ...(isLeadGenForm ? { destination_type: "ON_AD" } : {}),
        ...(promotedObject ? { promoted_object: promotedObject } : {}),
        status: "PAUSED",
      })
    ).id;

    // ── Creative ──
    const ctaValue = leadGenFormId ? { lead_gen_form_id: leadGenFormId } : { link: body.websiteUrl };
    const objectStorySpec = isVideo
      ? {
          page_id: pageId,
          video_data: {
            video_id: mediaPayload.videoId,
            image_hash: mediaPayload.imageHash,
            title: body.headline,
            message: body.primaryText,
            link_description: body.headline,
            call_to_action: { type: body.ctaType, value: ctaValue },
          },
        }
      : {
          page_id: pageId,
          link_data: {
            image_hash: mediaPayload.imageHash,
            link: body.websiteUrl,
            message: body.primaryText,
            name: body.headline,
            call_to_action: { type: body.ctaType, value: ctaValue },
          },
        };

    const externalCreativeId = (
      await graphPost<{ id: string }>(`act_${adAccountId}/adcreatives`, accessToken, {
        name: `Creative_${body.campaignName}`,
        object_story_spec: objectStorySpec,
      })
    ).id;

    // ── Ad ──
    const externalAdId = (
      await graphPost<{ id: string }>(`act_${adAccountId}/ads`, accessToken, {
        name: body.campaignName,
        adset_id: externalAdSetId,
        creative: { creative_id: externalCreativeId },
        status: "PAUSED",
        ...(trackingSpecs ? { tracking_specs: trackingSpecs } : {}),
      })
    ).id;

    // ── Persist our own pointer rows ──
    let ourCampaignId = body.existingCampaignId;
    if (!ourCampaignId) {
      const campaignRow = await CampaignsService.createCampaign({
        business_id: businessId,
        name: body.campaignName,
        objective,
        status: "paused",
        daily_budget_cents: isCbo ? body.dailyBudgetCents : null,
        currency: "USD",
        start_at: body.startAt || new Date().toISOString(),
        end_at: body.endAt || null,
        ad_account_id: null,
        external_campaign_id: externalCampaignId,
      });
      ourCampaignId = campaignRow.id;
    }

    const adSetRow = await CampaignsService.createAdSet({
      business_id: businessId,
      campaign_id: ourCampaignId,
      name: `${body.campaignName} - Ad Set`,
      status: "paused",
      daily_budget_cents: isCbo ? null : body.dailyBudgetCents,
      targeting,
      placements: { advantage_plus: true },
      optimization_goal: optimizationGoal,
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      start_at: body.startAt || new Date().toISOString(),
      end_at: body.endAt || null,
      external_adset_id: externalAdSetId,
    });

    const adRow = await CampaignsService.createAd({
      business_id: businessId,
      ad_set_id: adSetRow.id,
      name: body.campaignName,
      status: "paused",
      creative_id: creative.id,
      external_ad_id: externalAdId,
      external_creative_id: externalCreativeId,
    });

    return NextResponse.json({
      success: true,
      campaignId: ourCampaignId,
      adSetId: adSetRow.id,
      adId: adRow.id,
      externalCampaignId,
      externalAdSetId,
      externalAdId,
    });
  } catch (error: any) {
    console.error("[META_ADS_CAMPAIGNS_LAUNCH]", error);
    return NextResponse.json({ error: error.message || "Failed to launch campaign" }, { status: 500 });
  }
}
