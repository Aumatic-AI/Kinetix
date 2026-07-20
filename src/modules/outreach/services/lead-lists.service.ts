import { SupabaseClient } from "@supabase/supabase-js";
import { LeadList } from "../types/leads.types";

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
