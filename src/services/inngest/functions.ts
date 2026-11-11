import { generateImageAd, generateVideoAd, generateOneShotVideoAd, generateStudioImage, editStudioImage } from "./meta-ads";
import { generateSocialImage, generateSocialVideo, generateSocialOneShotVideo } from "./social";
import { sendOutreachCampaign } from "./outreach";
import { metaAdsPerformanceSyncJob } from "@/jobs/meta-ads-performance-sync.job";
import { socialScheduledPostCheck } from "@/jobs/social-scheduled-post-check.job";

export const functions = [
  metaAdsPerformanceSyncJob,
  socialScheduledPostCheck,
  generateImageAd,
  generateVideoAd,
  generateOneShotVideoAd,
  generateStudioImage,
  editStudioImage,
  generateSocialImage,
  generateSocialVideo,
  generateSocialOneShotVideo,
  sendOutreachCampaign,
];
