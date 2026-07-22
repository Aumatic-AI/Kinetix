import { inngest } from "../client";
import { createClient } from "@supabase/supabase-js";
import { InstantlyService } from "@/services/instantly";
import { buildOutreachEmailHtml } from "@/modules/outreach/utils/email-html";
import { env } from "@/config";

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY!
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
    if (!campaign?.generated_subject || !campaign?.generated_body?.body) throw new Error("Campaign has no content to send");

    const recipients = await step.run("fetch-recipients", async () => {
      const { data } = await supabase
        .from("outreach_leads")
        .select("id, email, first_name, last_name, company")
        .eq("business_id", campaign.business_id)
        .eq("list_id", listId || campaign.list_id)
        // Same suppression list the New Campaign form's live eligibility
        // count uses — also excludes already-contacted leads so re-clicking
        // Send doesn't repeatedly re-target the same batch.
        .not("status", "in", "(bounced,do_not_contact,replied,contacted)")
        .limit(campaign.daily_limit);
      return data || [];
    });

    if (recipients.length === 0) {
      await supabase.from("outreach_campaigns").update({ status: "completed" }).eq("id", campaignId);
      return { sent: 0, reason: "no eligible leads matched" };
    }

    const externalCampaignId = await step.run("ensure-instantly-campaign", async () => {
      if (campaign.external_campaign_id) return campaign.external_campaign_id;

      const { data: business } = await supabase.from("businesses").select("outreach_settings").eq("id", campaign.business_id).single();
      const settings = business?.outreach_settings;

      const html = buildOutreachEmailHtml(campaign.generated_body.body, campaign.cta_text, campaign.cta_link);
      const created = await InstantlyService.createCampaign(
        campaign.name,
        { subject: campaign.generated_subject, html },
        {
          dailyLimit: campaign.daily_limit,
          schedule: {
            timezone: settings?.timezone || "America/Detroit",
            days: settings?.days || [0, 1, 2, 3, 4, 5, 6],
            sendWindow: settings?.send_window || { from: "09:00", to: "18:00" },
          },
        }
      );
      await supabase.from("outreach_campaigns").update({ external_campaign_id: created.id }).eq("id", campaignId);
      return created.id;
    });

    await step.run("add-leads", async () => {
      await InstantlyService.addLeads(
        externalCampaignId,
        recipients.map((r) => ({ email: r.email, firstName: r.first_name || undefined, lastName: r.last_name || undefined, companyName: r.company || undefined }))
      );
      return { added: recipients.length };
    });

    // Campaigns sit in Draft (status 0) after creation and never send on
    // their own — confirmed against the real account, a campaign with
    // content and leads already loaded still sent nothing until activated.
    // Calling this every send is safe/idempotent for the already-active case.
    await step.run("activate-instantly-campaign", async () => {
      await InstantlyService.activateCampaign(externalCampaignId);
      return { activated: true };
    });

    await step.run("record-recipients", async () => {
      const rows = recipients.map((r) => ({ outreach_campaign_id: campaignId, lead_id: r.id, status: "sent", sent_at: new Date().toISOString() }));
      await supabase.from("outreach_campaign_leads").upsert(rows, { onConflict: "outreach_campaign_id,lead_id" });
      const leadIds = recipients.map((r) => r.id);
      await supabase.from("outreach_leads").update({ status: "contacted" }).in("id", leadIds);
      return { recorded: recipients.length };
    });

    await step.run("mark-active", async () => {
      await supabase.from("outreach_campaigns").update({ status: "active" }).eq("id", campaignId);
      return { status: "active" };
    });

    return { sent: recipients.length };
  }
);
