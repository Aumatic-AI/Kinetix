import { SupabaseClient } from "@supabase/supabase-js";
import { Contact, ContactFilters, PaginationOptions, OutreachStatus, SubscriberStatus, CategoryStatusBreakdown, OUTREACH_STATUS_BUCKET } from "../types/contacts.types";

export class ContactsService {
  static async getContacts(supabase: SupabaseClient, businessId: string, filters?: ContactFilters, pagination?: PaginationOptions): Promise<{ contacts: Contact[]; count: number }> {
    let query = supabase.from("contacts").select("*", { count: "exact" }).eq("business_id", businessId);

    if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);
    if (filters?.subscriberStatus) query = query.eq("subscriber_status", filters.subscriberStatus);
    if (filters?.outreachStatus) query = query.eq("outreach_status", filters.outreachStatus);
    if (filters?.excludeOutreachStatuses?.length) {
      query = query.not("outreach_status", "in", `(${filters.excludeOutreachStatuses.join(",")})`);
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
    if (error) throw new Error(`Error fetching contacts: ${error.message}`);
    return { contacts: (data as Contact[]) || [], count: count || 0 };
  }

  static async getContactById(supabase: SupabaseClient, id: string): Promise<Contact | null> {
    const { data, error } = await supabase.from("contacts").select("*").eq("id", id).single();
    if (error && error.code !== "PGRST116") throw new Error(`Error fetching contact: ${error.message}`);
    return (data as Contact) || null;
  }

  static async createContact(supabase: SupabaseClient, row: Partial<Contact>): Promise<Contact> {
    const { data, error } = await supabase.from("contacts").insert(row).select("*").single();
    if (error) throw new Error(`Error creating contact: ${error.message}`);
    return data as Contact;
  }

  /** Scraping/verification save path — skip a contact whose email already
   * exists for this business rather than erroring (a re-scrape naturally
   * rediscovers people already in the list). */
  static async upsertContact(supabase: SupabaseClient, row: Partial<Contact> & { business_id: string; email: string }): Promise<Contact> {
    const { data, error } = await supabase
      .from("contacts")
      .upsert(row, { onConflict: "business_id,email", ignoreDuplicates: false })
      .select("*")
      .single();
    if (error) throw new Error(`Error saving contact: ${error.message}`);
    return data as Contact;
  }

  static async updateContact(supabase: SupabaseClient, id: string, row: Partial<Contact>): Promise<void> {
    const { error } = await supabase.from("contacts").update(row).eq("id", id);
    if (error) throw new Error(`Error updating contact: ${error.message}`);
  }

  static async updateStatusByEmail(supabase: SupabaseClient, businessId: string, email: string, status: { outreach_status?: OutreachStatus; subscriber_status?: SubscriberStatus }): Promise<void> {
    const { error } = await supabase.from("contacts").update(status).eq("business_id", businessId).eq("email", email);
    if (error) throw new Error(`Error updating contact status: ${error.message}`);
  }

  static async deleteContact(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) throw new Error(`Error deleting contact: ${error.message}`);
  }

  static async getCategoryStatusBreakdown(supabase: SupabaseClient, businessId: string): Promise<Record<string, CategoryStatusBreakdown>> {
    const { data, error } = await supabase.from("contacts").select("category_id, outreach_status").eq("business_id", businessId);
    if (error) throw new Error(`Error computing category breakdown: ${error.message}`);
    const breakdown: Record<string, CategoryStatusBreakdown> = {};
    for (const row of data || []) {
      const key = row.category_id || "uncategorized";
      if (!breakdown[key]) breakdown[key] = { total: 0, muted: 0, info: 0, success: 0, danger: 0 };
      breakdown[key].total += 1;
      breakdown[key][OUTREACH_STATUS_BUCKET[row.outreach_status as OutreachStatus]] += 1;
    }
    return breakdown;
  }
}
