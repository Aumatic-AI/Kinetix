import { createClient } from "@/lib/supabase/server";
import { Lead, LeadFilters, PaginationOptions, LeadStatus, LeadList, LeadCampaignHistoryEntry } from "../types/leads.types";
import { OutreachCampaign } from "../types/outreach.types";

interface CampaignLeadHistoryRow {
  status: "queued" | "sent" | "failed";
  sent_at: string | null;
  outreach_campaigns: { id: string; name: string } | null;
}

/** Server-context only (API routes) — each method opens its own
 * request-scoped client via @/lib/supabase/server rather than taking one
 * as a parameter. */
export class LeadsService {
  static async getLeads(businessId: string, filters?: LeadFilters, pagination?: PaginationOptions): Promise<{ leads: Lead[]; count: number }> {
    const supabase = await createClient();
    let query = supabase.from("outreach_leads").select("*", { count: "exact" }).eq("business_id", businessId);

    if (filters?.listId) query = query.eq("list_id", filters.listId);
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.excludeStatuses?.length) {
      query = query.not("status", "in", `(${filters.excludeStatuses.join(",")})`);
    }
    if (filters?.search) {
      query = query.or(`email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,company.ilike.%${filters.search}%`);
    }

    query = query.order("created_at", { ascending: false });

    if (pagination) {
      const page = pagination.page || 1;
      const limit = pagination.limit || 50;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(`Error fetching leads: ${error.message}`);
    return { leads: (data as Lead[]) || [], count: count || 0 };
  }

  static async getLeadById(id: string): Promise<Lead | null> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("outreach_leads").select("*").eq("id", id).single();
    if (error && error.code !== "PGRST116") throw new Error(`Error fetching lead: ${error.message}`);
    return (data as Lead) || null;
  }

  static async createLead(row: Partial<Lead> & { business_id: string; email: string }): Promise<Lead> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("outreach_leads").insert(row).select("*").single();
    if (error) {
      if (error.code === "23505") throw new Error("A lead with this email already exists.");
      throw new Error(`Error creating lead: ${error.message}`);
    }
    return data as Lead;
  }

  /** Scraping/verification save path — a re-scrape naturally rediscovers
   * people already saved, so this updates them in place instead of erroring. */
  static async upsertLead(row: Partial<Lead> & { business_id: string; email: string }): Promise<Lead> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("outreach_leads")
      .upsert(row, { onConflict: "business_id,email", ignoreDuplicates: false })
      .select("*")
      .single();
    if (error) throw new Error(`Error saving lead: ${error.message}`);
    return data as Lead;
  }

  static async updateLead(id: string, row: Partial<Lead>): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("outreach_leads").update(row).eq("id", id);
    if (error) throw new Error(`Error updating lead: ${error.message}`);
  }

  static async updateStatusByEmail(businessId: string, email: string, status: LeadStatus): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("outreach_leads").update({ status }).eq("business_id", businessId).eq("email", email);
    if (error) throw new Error(`Error updating lead status: ${error.message}`);
  }

  static async deleteLead(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("outreach_leads").delete().eq("id", id);
    if (error) throw new Error(`Error deleting lead: ${error.message}`);
  }

  /** Every campaign this lead was ever queued for, most recent first — from
   * our own outreach_campaign_leads, not a live Instantly call (see
   * LeadCampaignHistoryEntry for why open/reply aren't included here). */
  static async getCampaignHistory(leadId: string): Promise<LeadCampaignHistoryEntry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("outreach_campaign_leads")
      .select("status, sent_at, outreach_campaigns(id, name)")
      .eq("lead_id", leadId)
      .order("sent_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(`Error fetching lead campaign history: ${error.message}`);

    return ((data as unknown as CampaignLeadHistoryRow[]) || [])
      .filter((row) => row.outreach_campaigns !== null)
      .map((row) => ({
        campaignId: row.outreach_campaigns!.id,
        campaignName: row.outreach_campaigns!.name,
        status: row.status,
        sentAt: row.sent_at,
      }));
  }

  static async getListLeadCounts(businessId: string): Promise<Record<string, number>> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("outreach_leads").select("list_id").eq("business_id", businessId);
    if (error) throw new Error(`Error computing list lead counts: ${error.message}`);
    const counts: Record<string, number> = {};
    for (const row of data || []) {
      const key = row.list_id || "unassigned";
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }
}

export class LeadListsService {
  static async getLists(businessId: string): Promise<LeadList[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("outreach_lead_lists")
      .select("*")
      .eq("business_id", businessId)
      .order("name", { ascending: true });
    if (error) throw new Error(`Error fetching lists: ${error.message}`);
    return (data as LeadList[]) || [];
  }

  static async createList(businessId: string, name: string): Promise<LeadList> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("outreach_lead_lists")
      .insert({ business_id: businessId, name })
      .select("*")
      .single();
    if (error) throw new Error(`Error creating list: ${error.message}`);
    return data as LeadList;
  }

  static async renameList(id: string, name: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("outreach_lead_lists").update({ name }).eq("id", id);
    if (error) throw new Error(`Error renaming list: ${error.message}`);
  }

  static async deleteList(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("outreach_lead_lists").delete().eq("id", id);
    if (error) throw new Error(`Error deleting list: ${error.message}`);
  }
}

export class OutreachCampaignsService {
  static async getCampaigns(businessId: string): Promise<OutreachCampaign[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("outreach_campaigns")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Error fetching outreach campaigns: ${error.message}`);
    return (data as unknown as OutreachCampaign[]) || [];
  }

  static async getCampaignById(id: string): Promise<OutreachCampaign | null> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("outreach_campaigns").select("*").eq("id", id).single();
    if (error && error.code !== "PGRST116") throw new Error(`Error fetching outreach campaign: ${error.message}`);
    return (data as unknown as OutreachCampaign) || null;
  }

  static async createCampaign(row: Partial<OutreachCampaign> & { business_id: string; list_id: string; name: string }): Promise<OutreachCampaign> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("outreach_campaigns").insert(row as any).select("*").single();
    if (error) throw new Error(`Error creating outreach campaign: ${error.message}`);
    return data as unknown as OutreachCampaign;
  }

  static async updateCampaign(id: string, row: Partial<OutreachCampaign>): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("outreach_campaigns").update(row as any).eq("id", id);
    if (error) throw new Error(`Error updating outreach campaign: ${error.message}`);
  }

  static async deleteCampaign(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("outreach_campaigns").delete().eq("id", id);
    if (error) throw new Error(`Error deleting outreach campaign: ${error.message}`);
  }

  static async recordRecipients(campaignId: string, leadIds: string[], status: "queued" | "sent" | "failed"): Promise<void> {
    if (leadIds.length === 0) return;
    const supabase = await createClient();
    const rows = leadIds.map((leadId) => ({ outreach_campaign_id: campaignId, lead_id: leadId, status, sent_at: status === "sent" ? new Date().toISOString() : null }));
    const { error } = await supabase.from("outreach_campaign_leads").upsert(rows, { onConflict: "outreach_campaign_id,lead_id" });
    if (error) throw new Error(`Error recording campaign recipients: ${error.message}`);
  }
}
