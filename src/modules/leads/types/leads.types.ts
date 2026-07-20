/**
 * Outreach's own lead data — fully separate from Newsletter (which is
 * deferred and will get its own model later). "List" is the one term used
 * everywhere for what the DB calls `outreach_lead_lists` — no "category"
 * anywhere in this module's naming, DB, or UI.
 */

export type LeadSource = "scraped" | "manual" | "import";
export type EmailVerificationStatus = "unverified" | "verified" | "invalid" | "catch_all" | "risky";
export type LeadStatus = "new" | "contacted" | "replied" | "interested" | "not_interested" | "bounced" | "do_not_contact";

export type LeadStatusBucket = "muted" | "info" | "success" | "danger";

export const LEAD_STATUS_BUCKET: Record<LeadStatus, LeadStatusBucket> = {
  new: "muted",
  not_interested: "muted",
  contacted: "info",
  replied: "success",
  interested: "success",
  bounced: "danger",
  do_not_contact: "danger",
};

export interface ListStatusBreakdown {
  total: number;
  muted: number;
  info: number;
  success: number;
  danger: number;
}

export interface LeadList {
  id: string;
  business_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  business_id: string;
  list_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
  company: string | null;
  city: string | null;
  country: string | null;
  source: LeadSource;
  email_verification_status: EmailVerificationStatus;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}

export interface LeadFilters {
  listId?: string;
  search?: string;
  status?: LeadStatus;
  excludeStatuses?: LeadStatus[];
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}
