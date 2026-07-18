import { inngest } from "./client";
import { generateImageAd, generateVideoAd } from "./meta-ads";
import { generateSocialImage, generateSocialVideo } from "./social";
import { competitorAdScraperJob, competitorAdScraperWorker } from "@/jobs/competitor-ad-scraper.job";
import { businessAdAnalysisJob } from "@/jobs/business-ad-analysis.job";
import { metaAdsPerformanceSyncJob } from "@/jobs/meta-ads-performance-sync.job";
import { socialScheduledPostCheck } from "@/jobs/social-scheduled-post-check.job";

export const functions = [
  competitorAdScraperJob,
  competitorAdScraperWorker,
  metaAdsPerformanceSyncJob,
  socialScheduledPostCheck,
  businessAdAnalysisJob,
  generateImageAd,
  generateVideoAd,
  generateSocialImage,
  generateSocialVideo,
];
