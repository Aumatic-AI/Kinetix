export type CreativeStatus = "pending" | "processing" | "review" | "approved" | "failed";
export type CreativeType = "video" | "image";

export interface MetaAdCreative {
  id: string;
  created_at: string;
  business_id: string;
  type: CreativeType;
  status: CreativeStatus;
  service?: string | null;
  idea_prompt?: string;
  ad_script?: any;
  media_urls?: string[];
  media_asset_id?: string | null;
  revision_history?: any[];
  video_style?: string;
  audio_style?: string;
  language?: string;
  character_type?: string;
  duration?: string;
  voice_id?: string;
}

export interface MetaAdIntelligence {
  id: string;
  created_at: string;
  business_id: string;
  report_type: "competitor" | "self";
  insights: any;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface CreativeFilters {
  status?: CreativeStatus;
  type?: CreativeType;
  search?: string;
}

// ============================================================
// CAMPAIGNS — our own pointer rows (campaigns/ad_sets/ads), plus
// the live-fetched Meta shapes joined against them. See
// src/modules/meta-ads/services/campaigns.service.ts for how these
// are read/written.
// ============================================================

export type CampaignStatus = "draft" | "active" | "paused" | "completed" | "archived";

export interface Campaign {
  id: string;
  created_at: string;
  updated_at: string;
  business_id: string;
  name: string;
  objective: string | null;
  status: CampaignStatus;
  daily_budget_cents: number | null;
  lifetime_budget_cents: number | null;
  currency: string;
  start_at: string | null;
  end_at: string | null;
  ad_account_id: string | null;
  external_campaign_id: string | null;
}

export interface AdSet {
  id: string;
  created_at: string;
  business_id: string;
  campaign_id: string;
  name: string;
  status: CampaignStatus;
  daily_budget_cents: number | null;
  targeting: any;
  placements: any;
  optimization_goal: string | null;
  bid_strategy: string | null;
  start_at: string | null;
  end_at: string | null;
  external_adset_id: string | null;
}

export interface Ad {
  id: string;
  created_at: string;
  business_id: string;
  ad_set_id: string;
  name: string;
  status: CampaignStatus;
  creative_id: string | null;
  external_ad_id: string | null;
  external_creative_id: string | null;
}

/** What the Launch modal collects, kept deliberately simple for v1 —
 * country/age/gender targeting only (no custom audiences, no interest
 * layers — see the build artifact's "what's simplified" section). */
export interface LaunchCampaignInput {
  creativeId: string;
  /** Our own campaigns.id — when set, the new ad set/ad is added to this
   * existing live campaign instead of creating a new one. */
  existingCampaignId?: string;
  campaignName: string;
  objective: "OUTCOME_TRAFFIC" | "OUTCOME_LEADS" | "OUTCOME_SALES" | "OUTCOME_AWARENESS" | "OUTCOME_ENGAGEMENT";
  /** Image creatives prefill this from ad_script.headline/primary_text —
   * video creatives only ever generated a voiceover script, never on-platform
   * ad copy, so these are always blank and required for video launches. */
  headline: string;
  primaryText: string;
  dailyBudgetCents: number;
  countries: string[];
  ageMin: number;
  ageMax: number;
  /** 0 = all, 1 = male, 2 = female — matches Meta's own targeting.genders vocabulary. */
  gender: 0 | 1 | 2;
  startAt?: string;
  endAt?: string;
  ctaType: string;
  websiteUrl: string;
  /** Native Instant Form id — when set, objective must be OUTCOME_LEADS and
   * no pixel is needed (promoted_object references the Page instead). */
  leadGenFormId?: string;
}

/** One row of the Campaigns tab's live-fetched list — our own row's
 * business/creative pointer merged with Meta's current status/budget. */
export interface CampaignListItem {
  id: string;
  externalCampaignId: string;
  name: string;
  objective: string | null;
  status: string;
  dailyBudgetCents: number | null;
  lifetimeBudgetCents: number | null;
  adSetCount: number;
  adCount: number;
  creativeThumbnailUrl?: string;
}

export interface CampaignDetail extends CampaignListItem {
  adSets: Array<{
    id: string;
    externalAdsetId: string;
    name: string;
    status: string;
    dailyBudgetCents: number | null;
    ads: Array<{
      id: string;
      externalAdId: string;
      name: string;
      status: string;
      creativeId: string | null;
      externalCreativeId: string | null;
      thumbnailUrl?: string;
    }>;
  }>;
}
