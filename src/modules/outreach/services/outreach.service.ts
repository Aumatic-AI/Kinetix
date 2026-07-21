import { SupabaseClient } from "@supabase/supabase-js";
import { Lead, LeadFilters, PaginationOptions, LeadStatus, ListStatusBreakdown, LEAD_STATUS_BUCKET, LeadList } from "../types/leads.types";
import { OutreachCampaign } from "../types/outreach.types";

export class LeadsService {
  static async getLeads(supabase: SupabaseClient, businessId: string, filters?: LeadFilters, pagination?: PaginationOptions): Promise<{ leads: Lead[]; count: number }> {
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

  static async getLeadById(supabase: SupabaseClient, id: string): Promise<Lead | null> {
    const { data, error } = await supabase.from("outreach_leads").select("*").eq("id", id).single();
    if (error && error.code !== "PGRST116") throw new Error(`Error fetching lead: ${error.message}`);
    return (data as Lead) || null;
  }

  static async createLead(supabase: SupabaseClient, row: Partial<Lead>): Promise<Lead> {
    const { data, error } = await supabase.from("outreach_leads").insert(row).select("*").single();
    if (error) {
      if (error.code === "23505") throw new Error("A lead with this email already exists.");
      throw new Error(`Error creating lead: ${error.message}`);
    }
    return data as Lead;
  }

  /** Scraping/verification save path — a re-scrape naturally rediscovers
   * people already saved, so this updates them in place instead of erroring. */
  static async upsertLead(supabase: SupabaseClient, row: Partial<Lead> & { business_id: string; email: string }): Promise<Lead> {
    const { data, error } = await supabase
      .from("outreach_leads")
      .upsert(row, { onConflict: "business_id,email", ignoreDuplicates: false })
      .select("*")
      .single();
    if (error) throw new Error(`Error saving lead: ${error.message}`);
    return data as Lead;
  }

  static async updateLead(supabase: SupabaseClient, id: string, row: Partial<Lead>): Promise<void> {
    const { error } = await supabase.from("outreach_leads").update(row).eq("id", id);
    if (error) throw new Error(`Error updating lead: ${error.message}`);
  }

  static async updateStatusByEmail(supabase: SupabaseClient, businessId: string, email: string, status: LeadStatus): Promise<void> {
    const { error } = await supabase.from("outreach_leads").update({ status }).eq("business_id", businessId).eq("email", email);
    if (error) throw new Error(`Error updating lead status: ${error.message}`);
  }

  static async deleteLead(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from("outreach_leads").delete().eq("id", id);
    if (error) throw new Error(`Error deleting lead: ${error.message}`);
  }

  static async getListStatusBreakdown(supabase: SupabaseClient, businessId: string): Promise<Record<string, ListStatusBreakdown>> {
    const { data, error } = await supabase.from("outreach_leads").select("list_id, status").eq("business_id", businessId);
    if (error) throw new Error(`Error computing list breakdown: ${error.message}`);
    const breakdown: Record<string, ListStatusBreakdown> = {};
    for (const row of data || []) {
      const key = row.list_id || "unassigned";
      if (!breakdown[key]) breakdown[key] = { total: 0, muted: 0, info: 0, success: 0, danger: 0 };
      breakdown[key].total += 1;
      breakdown[key][LEAD_STATUS_BUCKET[row.status as LeadStatus]] += 1;
    }
    return breakdown;
  }
}

export class LeadListsService {
  static async getLists(supabase: SupabaseClient, businessId: string): Promise<LeadList[]> {
    const { data, error } = await supabase
      .from("outreach_lead_lists")
      .select("*")
      .eq("business_id", businessId)
      .order("name", { ascending: true });
    if (error) throw new Error(`Error fetching lists: ${error.message}`);
    return (data as LeadList[]) || [];
  }

  static async createList(supabase: SupabaseClient, businessId: string, name: string): Promise<LeadList> {
    const { data, error } = await supabase
      .from("outreach_lead_lists")
      .insert({ business_id: businessId, name })
      .select("*")
      .single();
    if (error) throw new Error(`Error creating list: ${error.message}`);
    return data as LeadList;
  }

  static async renameList(supabase: SupabaseClient, id: string, name: string): Promise<void> {
    const { error } = await supabase.from("outreach_lead_lists").update({ name }).eq("id", id);
    if (error) throw new Error(`Error renaming list: ${error.message}`);
  }

  static async deleteList(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from("outreach_lead_lists").delete().eq("id", id);
    if (error) throw new Error(`Error deleting list: ${error.message}`);
  }
}

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
