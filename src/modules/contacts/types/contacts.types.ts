/**
 * Contacts are shared by both Newsletter and Outreach — the same person can
 * be a newsletter subscriber and/or an outreach contact, tracked
 * independently via two separate status columns. Categories replace the
 * legacy apps' hardcoded per-vertical tables (table1..table6) with a
 * normal, client-managed list.
 */

export type ContactSource = "scraped" | "manual" | "import";
export type EmailVerificationStatus = "unverified" | "verified" | "invalid" | "catch_all" | "risky";
export type OutreachStatus = "new" | "contacted" | "replied" | "interested" | "not_interested" | "bounced" | "do_not_contact";
export type SubscriberStatus = "active" | "unsubscribed" | "bounced" | "complained";

export type OutreachStatusBucket = "muted" | "info" | "success" | "danger";

export const OUTREACH_STATUS_BUCKET: Record<OutreachStatus, OutreachStatusBucket> = {
  new: "muted",
  not_interested: "muted",
  contacted: "info",
  replied: "success",
  interested: "success",
  bounced: "danger",
  do_not_contact: "danger",
};

export interface CategoryStatusBreakdown {
  total: number;
  muted: number;
  info: number;
  success: number;
  danger: number;
}

export interface ContactCategory {
  id: string;
  business_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  business_id: string;
  category_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
  company: string | null;
  city: string | null;
  country: string | null;
  source: ContactSource;
  email_verification_status: EmailVerificationStatus;
  outreach_status: OutreachStatus;
  subscriber_status: SubscriberStatus;
  created_at: string;
  updated_at: string;
}

export interface ContactFilters {
  categoryId?: string;
  search?: string;
  subscriberStatus?: SubscriberStatus;
  outreachStatus?: OutreachStatus;
  excludeOutreachStatuses?: OutreachStatus[];
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}
