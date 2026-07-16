import { inngest } from "./client";
import { generateImageAd, generateVideoAd } from "./meta-ads";
import { generateSocialImage, generateSocialVideo } from "./social";
import { competitorAdScraperJob, competitorAdScraperWorker } from "@/jobs/competitor-ad-scraper.job";
import { businessAdAnalysisJob } from "@/jobs/business-ad-analysis.job";
import { metaAdsPerformanceSyncJob } from "@/jobs/meta-ads-performance-sync.job";

export const functions = [
  competitorAdScraperJob,
  competitorAdScraperWorker,
  metaAdsPerformanceSyncJob,
  businessAdAnalysisJob,
  generateImageAd,
  generateVideoAd,
  generateSocialImage,
  generateSocialVideo,
];
