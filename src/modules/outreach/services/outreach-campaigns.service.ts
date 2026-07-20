import { SupabaseClient } from "@supabase/supabase-js";
import { OutreachCampaign } from "../types/outreach.types";

export class OutreachCampaignsService {
  static async getCampaigns(supabase: SupabaseClient, businessId: string): Promise<OutreachCampaign[]> {
    const { data, error } = await supabase
      .from("outreach_campaigns")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Error fetching outreach campaigns: ${error.message}`);
    return (data as unknown as OutreachCampaign[]) || [];
  }

  static async getCampaignById(supabase: SupabaseClient, id: string): Promise<OutreachCampaign | null> {
    const { data, error } = await supabase.from("outreach_campaigns").select("*").eq("id", id).single();
    if (error && error.code !== "PGRST116") throw new Error(`Error fetching outreach campaign: ${error.message}`);
    return (data as unknown as OutreachCampaign) || null;
  }

  static async createCampaign(supabase: SupabaseClient, row: Partial<OutreachCampaign>): Promise<OutreachCampaign> {
    const { data, error } = await supabase.from("outreach_campaigns").insert(row).select("*").single();
    if (error) throw new Error(`Error creating outreach campaign: ${error.message}`);
    return data as unknown as OutreachCampaign;
  }

  static async updateCampaign(supabase: SupabaseClient, id: string, row: Partial<OutreachCampaign>): Promise<void> {
    const { error } = await supabase.from("outreach_campaigns").update(row).eq("id", id);
    if (error) throw new Error(`Error updating outreach campaign: ${error.message}`);
  }

  static async deleteCampaign(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from("outreach_campaigns").delete().eq("id", id);
    if (error) throw new Error(`Error deleting outreach campaign: ${error.message}`);
  }

  static async recordRecipients(supabase: SupabaseClient, campaignId: string, leadIds: string[], status: "queued" | "sent" | "failed"): Promise<void> {
    if (leadIds.length === 0) return;
    const rows = leadIds.map((leadId) => ({ outreach_campaign_id: campaignId, lead_id: leadId, status, sent_at: status === "sent" ? new Date().toISOString() : null }));
    const { error } = await supabase.from("outreach_campaign_leads").upsert(rows, { onConflict: "outreach_campaign_id,lead_id" });
    if (error) throw new Error(`Error recording campaign recipients: ${error.message}`);
  }
}
