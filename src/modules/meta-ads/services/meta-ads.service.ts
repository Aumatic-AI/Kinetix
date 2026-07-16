import { SupabaseClient } from "@supabase/supabase-js";
import {
  MetaAdCreative,
  CreativeFilters,
  PaginationOptions,
  MetaAdIntelligence
} from "../types/meta-ads.types";

export class MetaAdsService {
  // ==========================================
  // CREATIVES
  // ==========================================
  
  static async getCreatives(
    supabase: SupabaseClient, 
    filters?: CreativeFilters, 
    pagination?: PaginationOptions
  ): Promise<MetaAdCreative[]> {
    let query = supabase.from("meta_ad_creatives").select("*");

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }
    if (filters?.type) {
      query = query.eq("type", filters.type);
    }
    if (filters?.search) {
      // Assuming we want to search in the idea prompt or status
      query = query.ilike("idea_prompt", `%${filters.search}%`);
    }

    query = query.order("created_at", { ascending: false });

    if (pagination) {
      const page = pagination.page || 1;
      const limit = pagination.limit || 50;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Error fetching creatives: ${error.message}`);
    return data || [];
  }

  static async getCreativeById(supabase: SupabaseClient, id: string): Promise<MetaAdCreative | null> {
    const { data, error } = await supabase
      .from("meta_ad_creatives")
      .select("*")
      .eq("id", id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw new Error(`Error fetching creative: ${error.message}`);
    return data || null;
  }

  static async createCreative(supabase: SupabaseClient, data: Partial<MetaAdCreative>): Promise<MetaAdCreative> {
    const { data: creative, error } = await supabase
      .from("meta_ad_creatives")
      .insert(data)
      .select("*")
      .single();

    if (error) throw new Error(`Error creating creative: ${error.message}`);
    return creative;
  }

  static async updateCreative(supabase: SupabaseClient, id: string, data: Partial<MetaAdCreative>): Promise<void> {
    const { error } = await supabase
      .from("meta_ad_creatives")
      .update(data)
      .eq("id", id);

    if (error) throw new Error(`Error updating creative: ${error.message}`);
  }

  static async deleteCreative(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase
      .from("meta_ad_creatives")
      .delete()
      .eq("id", id);

    if (error) throw new Error(`Error deleting creative: ${error.message}`);
  }

  // ==========================================
  // INTELLIGENCE
  // ==========================================

  static async getLatestIntelligence(
    supabase: SupabaseClient,
    businessId: string,
    reportType: "competitor" | "self"
  ): Promise<MetaAdIntelligence | null> {
    const { data, error } = await supabase
      .from("ad_analysis_reports")
      .select("*")
      .eq("business_id", businessId)
      .eq("report_type", reportType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Error fetching intelligence: ${error.message}`);
    return data || null;
  }

  static async insertIntelligence(supabase: SupabaseClient, data: Partial<MetaAdIntelligence>): Promise<void> {
    const { error } = await supabase
      .from("ad_analysis_reports")
      .insert(data);

    if (error) throw new Error(`Error inserting intelligence: ${error.message}`);
  }

  // ==========================================
  // BUSINESSES HELPER
  // ==========================================

  static async getBusinessById(supabase: SupabaseClient, id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(`Error fetching business by id: ${error.message}`);
    return data || null;
  }

  static async getBusinesses(supabase: SupabaseClient): Promise<{ id: string; name: string }[]> {
    const { data, error } = await supabase
      .from("businesses")
      .select("id, name");

    if (error) throw new Error(`Error fetching businesses: ${error.message}`);
    return data || [];
  }

  static async getFirstBusinessId(supabase: SupabaseClient): Promise<string | null> {
    const { data, error } = await supabase
      .from("businesses")
      .select("id")
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(`Error fetching first business: ${error.message}`);
    return data?.id || null;
  }
}
