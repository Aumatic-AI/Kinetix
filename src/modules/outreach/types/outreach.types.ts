export type OutreachCampaignStatus = "draft" | "active" | "paused" | "completed" | "archived";
export type ScrapeJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface OutreachGeneratedBody {
  subject: string;
  body: string;
}

export interface OutreachCampaign {
  id: string;
  business_id: string;
  category_id: string;
  name: string;
  goal: string | null;
  tone: string | null;
  message_brief: string | null;
  service_type: string | null;
  target_region: string | null;
  cta_text: string | null;
  cta_link: string | null;
  status: OutreachCampaignStatus;
  generated_subject: string | null;
  generated_body: OutreachGeneratedBody | null;
  revision_history: { content: OutreachGeneratedBody; feedback?: string; created_at: string }[];
  external_campaign_id: string | null;
  daily_limit: number;
  created_at: string;
  updated_at: string;
}

export interface ScrapeJob {
  id: string;
  business_id: string;
  category_id: string | null;
  niches: string;
  location: string;
  max_results: number;
  total_scraped: number;
  valid_emails: number;
  invalid_emails: number;
  apify_run_id: string | null;
  status: ScrapeJobStatus;
  error_message: string | null;
  created_at: string;
}

export interface CreateOutreachCampaignInput {
  name: string;
  categoryId: string;
  serviceType: string;
  targetRegion: string;
  goal: string;
  tone: string;
  messageBrief: string;
  ctaText?: string;
  ctaLink?: string;
}

export interface StartScrapeInput {
  niches: string;
  location: string;
  maxResults: number;
  categoryId: string;
}
