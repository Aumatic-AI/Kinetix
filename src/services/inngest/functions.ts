import { inngest } from "./client";
import { generateImageAd, generateVideoAd } from "./meta-ads";
import { competitorAdScraperJob, competitorAdScraperWorker } from "@/jobs/competitor-ad-scraper.job";
import { competitorAnalysisJob } from "@/jobs/competitor-analysis.job";
import { brandAdAnalysisJob } from "@/jobs/brand-ad-analysis.job";

export const functions = [
  competitorAdScraperJob,
  competitorAdScraperWorker,
  competitorAnalysisJob,
  brandAdAnalysisJob,
  generateImageAd,
  generateVideoAd
];
