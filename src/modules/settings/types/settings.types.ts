/**
 * Shape of GET/POST /api/settings — camelCase mirror of the businesses
 * table's columns that are actually read somewhere in the app today
 * (see src/store/business.store.ts's OutreachSettings/BusinessService,
 * src/modules/meta-ads/components/campaigns/shared.tsx's
 * useBusinessMetaAdsDefaults, src/jobs/competitor-ad-scraper.job.ts).
 * businesses.keywords/business_colors/guidelines are deliberately left out
 * — they have no defined shape and nothing in the app reads them yet, so
 * building a settings UI for them would just be guessing.
 */

export interface BusinessServiceInput {
  name: string;
  description?: string;
}

export interface AdScriptTopicInput {
  topic: string;
  format: string;
}

export interface OutreachSettingsInput {
  dailyLimit: number;
  timezone: string;
  /** 0 (Sunday) – 6 (Saturday), matching JS Date.getDay(). */
  days: number[];
  sendWindow: { from: string; to: string };
}

export interface BusinessSettings {
  name: string;
  industry: string;
  description: string;
  websiteUrl: string;
  toneOfVoice: string;
  businessVoice: string;
  coreOfferings: string;
  painPoints: string;
  targetAudience: string;
  services: BusinessServiceInput[];
  targetCountries: string[];
  competitorKeywords: string[];
  adScriptTopics: AdScriptTopicInput[];
  outreachSettings: OutreachSettingsInput;
  metaAdsAdvantageAudienceDefault: boolean;
}
