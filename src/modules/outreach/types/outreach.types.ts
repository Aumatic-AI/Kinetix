import { CampaignStatusInfo, CampaignStatusValue, CampaignStatusTone } from "../utils/campaign-status";

export type OutreachCampaignStatus = "draft" | "active" | "paused" | "completed" | "archived";
export type ScrapeJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface OutreachGeneratedBody {
  subject: string;
  body: string;
}

export interface OutreachCampaign {
  id: string;
  business_id: string;
  list_id: string;
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
  list_id: string;
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
  listId: string;
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
  listId: string;
}

export interface OutreachCampaignStatusEntry extends CampaignStatusInfo {
  sent: number;
  opened: number;
  openRate: number;
  replied: number;
  replyRate: number;
  clicked: number;
  clickRate: number;
  bounced: number;
  bounceRate: number;
  unsubscribed: number;
}

export interface OutreachAnalyticsTotals {
  sent: number;
  opened: number;
  replied: number;
  bounced: number;
}

export interface OutreachAnalyticsResponse {
  totalLeads: number;
  totalCampaignsSent: number;
  totals: OutreachAnalyticsTotals;
  /** Keyed by our own outreach_campaigns.id — every campaign gets an entry,
   * not just ones that have reached Instantly (see resolveCampaignStatus). */
  byCampaignId: Record<string, OutreachCampaignStatusEntry>;
}

/** Shown in the Send confirmation before a "ready" campaign is actually
 * sent — fetched on demand (only while that confirmation is open), not on
 * page load. eligibleLeads mirrors the exact suppression rule send-campaign.ts
 * uses, so the preview never overpromises vs. what will really happen. */
export interface OutreachCampaignSendPreview {
  listName: string;
  eligibleLeads: number;
  dailyLimit: number;
}

/** One row of the Campaigns list — our own campaign fields merged with its
 * live Instantly status/counts, already resolved server-side via
 * resolveCampaignStatus so the client never branches on a raw status code.
 * Only the fields the Campaigns table actually renders — full analytics
 * (clicked/bounced/rates) live in OutreachAnalyticsResponse instead, used by
 * Dashboard/Campaign Detail, not this list. */
export interface OutreachCampaignListItem {
  id: string;
  name: string;
  goal: string | null;
  externalCampaignId: string | null;
  status: CampaignStatusValue;
  statusLabel: string;
  statusTone: CampaignStatusTone;
  statusReason?: string;
  sent: number;
  opened: number;
  replied: number;
}

/** /outreach/campaigns/[id] — everything the Campaign Detail page renders,
 * already merged server-side from three sources (our own campaign row, its
 * list's name, and its live Instantly analytics) into one flat response, so
 * the page needs exactly one API call instead of three. */
export interface OutreachCampaignDetail {
  id: string;
  name: string;
  serviceType: string | null;
  targetRegion: string | null;
  dailyLimit: number;
  goal: string | null;
  tone: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  createdAt: string;
  listName: string;
  generatedBody: OutreachGeneratedBody | null;
  status: CampaignStatusValue;
  statusLabel: string;
  statusTone: CampaignStatusTone;
  statusReason?: string;
  sent: number;
  opened: number;
  openRate: number;
  replied: number;
  replyRate: number;
  clicked: number;
  clickRate: number;
  bounced: number;
  bounceRate: number;
}
