import { inngest } from "../client";
import { createClient } from "@supabase/supabase-js";
import { InstantlyService } from "@/services/instantly";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Every Kinetix outreach campaign gets its own dedicated Instantly
 * campaign — never a shared one across every campaign, which was the
 * legacy app's structural bug requiring a whole separate "reset" tool to
 * work around. The content sent is this row's own generated_body,
 * referenced by campaign id — never re-derived. */
export const sendOutreachCampaign = inngest.createFunction(
  { id: "outreach-send-campaign", triggers: [{ event: "outreach/send-campaign" }] },
  async ({ event, step }) => {
    const { campaignId, listId } = event.data;

    const campaign = await step.run("fetch-campaign", async () => {
      const { data } = await supabase.from("outreach_campaigns").select("*").eq("id", campaignId).single();
      return data;
    });
    if (!campaign?.generated_body) throw new Error("Campaign has no content to send");

    const recipients = await step.run("fetch-recipients", async () => {
      const { data } = await supabase
        .from("outreach_leads")
        .select("id, email, first_name, last_name, company")
        .eq("business_id", campaign.business_id)
        .eq("list_id", listId || campaign.list_id)
        .not("status", "in", "(bounced,do_not_contact)")
        .limit(campaign.daily_limit);
      return data || [];
    });

    if (recipients.length === 0) {
      await supabase.from("outreach_campaigns").update({ status: "completed" }).eq("id", campaignId);
      return { sent: 0, reason: "no eligible leads matched" };
    }

    const externalCampaignId = await step.run("ensure-instantly-campaign", async () => {
      if (campaign.external_campaign_id) return campaign.external_campaign_id;
      const created = await InstantlyService.createCampaign(campaign.name);
      await supabase.from("outreach_campaigns").update({ external_campaign_id: created.id }).eq("id", campaignId);
      return created.id;
    });

    await step.run("add-leads", async () => {
      await InstantlyService.addLeads(
        externalCampaignId,
        recipients.map((r) => ({ email: r.email, firstName: r.first_name || undefined, lastName: r.last_name || undefined, companyName: r.company || undefined }))
      );
    });

    await step.run("record-recipients", async () => {
      const rows = recipients.map((r) => ({ outreach_campaign_id: campaignId, lead_id: r.id, status: "sent", sent_at: new Date().toISOString() }));
      await supabase.from("outreach_campaign_leads").upsert(rows, { onConflict: "outreach_campaign_id,lead_id" });
      const leadIds = recipients.map((r) => r.id);
      await supabase.from("outreach_leads").update({ status: "contacted" }).in("id", leadIds);
    });

    await step.run("mark-active", async () => {
      await supabase.from("outreach_campaigns").update({ status: "active" }).eq("id", campaignId);
    });

    return { sent: recipients.length };
  }
);
