import { env } from "@/config";

const API_BASE = "https://api.instantly.ai/api/v2";

function getHeaders() {
  const apiKey = env.INSTANTLY_API_KEY;
  if (!apiKey) throw new Error("INSTANTLY_API_KEY is not configured");
  return { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
}

export interface InstantlyLead {
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
}

export interface InstantlySequenceContent {
  subject: string;
  /** Full HTML email body (see buildOutreachEmailHtml) — Instantly renders
   * this as-is and substitutes its own merge tags ({{firstName}},
   * {{companyName}}) per recipient using the lead fields passed to addLeads. */
  html: string;
}

export interface InstantlySchedule {
  /** POSIX Etc/GMT±N offset, e.g. "America/Detroit" — Instantly's timezone
   * enum rejects IANA "Etc/UTC"/"Etc/GMT+0", confirmed live via a 400. */
  timezone: string;
  /** 0 (Sun) – 6 (Sat) */
  days: number[];
  sendWindow: { from: string; to: string };
}

/**
 * Instantly.ai (cold-outreach ESP) — addLeads/analytics/deleteLeads are
 * ported from the legacy Outreach n8n workflows, which called them
 * directly. createCampaign is new: unlike legacy (which hardcoded one
 * shared Instantly campaign for every Kinetix campaign, reusing the same
 * pre-built sequence for everything — the root cause of several legacy
 * bugs), every Kinetix outreach campaign gets its own dedicated Instantly
 * campaign, with its own sequence pushed at creation time from that
 * campaign's own generated_subject/generated_body. The schedule/days shape
 * and the {{firstName}}/{{companyName}} merge-tag names are per Instantly's
 * public v2 docs — not yet exercised against a real send, so if Instantly
 * rejects the request or the tags don't merge, check the error body
 * (included in the thrown error) and adjust this shape first.
 */
export class InstantlyService {
  static async createCampaign(name: string, content: InstantlySequenceContent, options: { dailyLimit?: number; schedule: InstantlySchedule }): Promise<{ id: string }> {
    const days = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [String(d), options.schedule.days.includes(d)]));
    const res = await fetch(`${API_BASE}/campaigns`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        name,
        daily_limit: options?.dailyLimit,
        campaign_schedule: {
          schedules: [
            {
              name: "Business hours",
              timing: options.schedule.sendWindow,
              days,
              timezone: options.schedule.timezone,
            },
          ],
        },
        sequences: [
          {
            steps: [
              {
                type: "email",
                // delay/delay_unit are present on every real step in this
                // workspace's existing campaigns (confirmed via GET) — 0/days
                // means this single step fires immediately, no follow-up wait.
                delay: 0,
                delay_unit: "days",
                variants: [{ subject: content.subject, body: content.html }],
              },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Instantly error creating campaign (${res.status}): ${body || res.statusText}`);
    }
    const data = await res.json();
    return { id: data.id };
  }

  /** Campaigns are created in Draft (status 0) and never send on their own —
   * confirmed live: a freshly created campaign with content and leads
   * already loaded sat at status 0 with zero emails sent until this was
   * called. Mirrors the same "created paused, going live is a separate
   * explicit action" pattern already used for Meta Ads in this codebase. */
  static async activateCampaign(campaignId: string): Promise<void> {
    // Instantly 400s on a truly empty body when Content-Type is JSON —
    // confirmed live — so this must send an explicit {} even though there's
    // nothing meaningful to configure here.
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/activate`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Instantly error activating campaign (${res.status}): ${body || res.statusText}`);
    }
  }

  static async addLeads(campaignId: string, leads: InstantlyLead[]): Promise<void> {
    for (const lead of leads) {
      const res = await fetch(`${API_BASE}/leads`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          campaign: campaignId,
          email: lead.email,
          first_name: lead.firstName,
          last_name: lead.lastName,
          company_name: lead.companyName,
        }),
      });
      if (!res.ok) throw new Error(`Instantly error adding lead ${lead.email}: ${res.statusText}`);
    }
  }

  static async getCampaignAnalytics(campaignId?: string): Promise<any> {
    const url = new URL(`${API_BASE}/campaigns/analytics`);
    if (campaignId) url.searchParams.set("campaign_id", campaignId);
    const res = await fetch(url.toString(), { headers: getHeaders() });
    if (!res.ok) throw new Error(`Instantly analytics error: ${res.statusText}`);
    return res.json();
  }

  static async deleteLeads(campaignId: string, emails: string[]): Promise<void> {
    const res = await fetch(`${API_BASE}/leads`, {
      method: "DELETE",
      headers: getHeaders(),
      body: JSON.stringify({ campaign_id: campaignId, emails }),
    });
    if (!res.ok) throw new Error(`Instantly error deleting leads: ${res.statusText}`);
  }
}
