import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { MetaAdsService } from "@/modules/meta-ads/services/meta-ads.service";
import { InstantlyService, InstantlyCampaignAnalytics } from "@/services/instantly";
import { resolveCampaignStatus } from "@/modules/outreach/utils/campaign-status";
import { OutreachAnalyticsResponse, OutreachCampaignStatusEntry } from "@/modules/outreach/types/outreach.types";

const EMPTY: OutreachAnalyticsResponse = {
  totalLeads: 0,
  totalCampaignsSent: 0,
  totals: { sent: 0, opened: 0, replied: 0, bounced: 0 },
  byCampaignId: {},
};

function rate(count: number, sent: number): number {
  return sent > 0 ? Math.round((count / sent) * 100) : 0;
}

/** How many leads we ourselves queued for this campaign — the only way to
 * tell "still sending" from "sent to everyone we intended" apart, since
 * Instantly's own status doesn't distinguish the two. */
async function countRecipientsTargeted(supabase: SupabaseClient<Database>, campaignId: string): Promise<number> {
  const { count } = await supabase
    .from("outreach_campaign_leads")
    .select("lead_id", { count: "exact", head: true })
    .eq("outreach_campaign_id", campaignId);
  return count || 0;
}

export async function GET() {
  try {
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const businessId = await MetaAdsService.getFirstBusinessId(supabase);
    if (!businessId) return NextResponse.json(EMPTY);

    const { count: totalLeads } = await supabase
      .from("outreach_leads")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);

    const { data: campaignRows } = await supabase
      .from("outreach_campaigns")
      .select("id, status, external_campaign_id")
      .eq("business_id", businessId);

    const response: OutreachAnalyticsResponse = {
      totalLeads: totalLeads || 0,
      totalCampaignsSent: 0,
      totals: { sent: 0, opened: 0, replied: 0, bounced: 0 },
      byCampaignId: {},
    };

    if (!campaignRows || campaignRows.length === 0) return NextResponse.json(response);

    const instantlyAnalytics = await InstantlyService.getCampaignsAnalytics();
    const instantlyByExternalId = new Map<string, InstantlyCampaignAnalytics>(instantlyAnalytics.map((c) => [c.campaign_id, c]));

    for (const row of campaignRows) {
      const instantlyEntry = row.external_campaign_id ? instantlyByExternalId.get(row.external_campaign_id) : undefined;

      const sent = instantlyEntry?.emails_sent_count || 0;
      const opened = instantlyEntry?.open_count_unique || 0;
      const replied = instantlyEntry?.reply_count_unique || 0;
      const clicked = instantlyEntry?.link_click_count_unique || 0;
      const bounced = instantlyEntry?.bounced_count || 0;
      const unsubscribed = instantlyEntry?.unsubscribed_count || 0;

      // Only needed to tell "sending" from "sent" apart — skip the query otherwise.
      const recipientsTargeted = instantlyEntry?.campaign_status === 1 ? await countRecipientsTargeted(supabase, row.id) : undefined;

      const status = resolveCampaignStatus({
        localStatus: row.status,
        externalCampaignId: row.external_campaign_id,
        instantlyStatus: instantlyEntry?.campaign_status,
        sent,
        recipientsTargeted,
      });

      const entry: OutreachCampaignStatusEntry = {
        ...status,
        sent,
        opened,
        openRate: rate(opened, sent),
        replied,
        replyRate: rate(replied, sent),
        clicked,
        clickRate: rate(clicked, sent),
        bounced,
        bounceRate: rate(bounced, sent),
        unsubscribed,
      };
      response.byCampaignId[row.id] = entry;

      if (status.value === "sending" || status.value === "sent") {
        response.totalCampaignsSent += 1;
        response.totals.sent += sent;
        response.totals.opened += opened;
        response.totals.replied += replied;
        response.totals.bounced += bounced;
      }
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[OUTREACH_ANALYTICS]", error);
    return NextResponse.json({ error: error.message || "Failed to load analytics" }, { status: 500 });
  }
}
