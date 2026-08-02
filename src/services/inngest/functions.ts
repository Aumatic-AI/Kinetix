import { inngest } from "./client";
import { generateImageAd, generateVideoAd } from "./meta-ads";
import { generateSocialImage, generateSocialVideo } from "./social";
import { scrapeOutreachContacts, sendOutreachCampaign } from "./outreach";
import { competitorAdScraperJob, competitorAdScraperWorker } from "@/jobs/competitor-ad-scraper.job";
import { businessAdAnalysisJob } from "@/jobs/business-ad-analysis.job";
import { metaAdsPerformanceSyncJob } from "@/jobs/meta-ads-performance-sync.job";
import { socialScheduledPostCheck } from "@/jobs/social-scheduled-post-check.job";
import { socialAnalyticsCacheRefresh } from "@/jobs/social-analytics-cache-refresh.job";
import { metaAdsLeadsSyncJob } from "@/jobs/meta-ads-leads-sync.job";

export const functions = [
  competitorAdScraperJob,
  competitorAdScraperWorker,
  metaAdsPerformanceSyncJob,
  socialScheduledPostCheck,
  socialAnalyticsCacheRefresh,
  metaAdsLeadsSyncJob,
  businessAdAnalysisJob,
  generateImageAd,
  generateVideoAd,
  generateSocialImage,
  generateSocialVideo,
  scrapeOutreachContacts,
  sendOutreachCampaign,
];
