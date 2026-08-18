import { generateImageAd, generateVideoAd, generateStudioImage, editStudioImage } from "./meta-ads";
import { generateSocialImage, generateSocialVideo } from "./social";
import { scrapeOutreachContacts, sendOutreachCampaign } from "./outreach";
import { businessAdAnalysisJob } from "@/jobs/business-ad-analysis.job";
import { metaAdsPerformanceSyncJob } from "@/jobs/meta-ads-performance-sync.job";
import { socialScheduledPostCheck } from "@/jobs/social-scheduled-post-check.job";

export const functions = [
  metaAdsPerformanceSyncJob,
  socialScheduledPostCheck,
  businessAdAnalysisJob,
  generateImageAd,
  generateVideoAd,
  generateStudioImage,
  editStudioImage,
  generateSocialImage,
  generateSocialVideo,
  scrapeOutreachContacts,
  sendOutreachCampaign,
];
