import { SupabaseClient } from "@supabase/supabase-js";
import { 
  MetaAdCreative, 
  CreativeFilters, 
  PaginationOptions, 
  MetaAdIntelligence, 
  MetaCompetitorAd 
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
    brandId: string, 
    reportType: "competitor" | "self"
  ): Promise<MetaAdIntelligence | null> {
    const { data, error } = await supabase
      .from("meta_ad_intelligence")
      .select("*")
      .eq("brand_id", brandId)
      .eq("report_type", reportType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Error fetching intelligence: ${error.message}`);
    return data || null;
  }

  static async insertIntelligence(supabase: SupabaseClient, data: Partial<MetaAdIntelligence>): Promise<void> {
    const { error } = await supabase
      .from("meta_ad_intelligence")
      .insert(data);

    if (error) throw new Error(`Error inserting intelligence: ${error.message}`);
  }

  // ==========================================
  // COMPETITOR ADS
  // ==========================================

  static async getRecentCompetitorAdIds(
    supabase: SupabaseClient, 
    brandId: string, 
    minDate: string
  ): Promise<string[]> {
    const { data, error } = await supabase
      .from("meta_competitor_ads")
      .select("platform_ad_id")
      .eq("brand_id", brandId)
      .gte("created_at", minDate);

    if (error) throw new Error(`Error fetching competitor ad IDs: ${error.message}`);
    return (data || []).map(ad => ad.platform_ad_id);
  }

  static async getCompetitorAds(
    supabase: SupabaseClient, 
    brandId: string, 
    minDate: string
  ): Promise<MetaCompetitorAd[]> {
    const { data, error } = await supabase
      .from("meta_competitor_ads")
      .select("*")
      .eq("brand_id", brandId)
      .gte("created_at", minDate);

    if (error) throw new Error(`Error fetching competitor ads: ${error.message}`);
    return data || [];
  }

  static async insertCompetitorAds(supabase: SupabaseClient, ads: Partial<MetaCompetitorAd>[]): Promise<void> {
    if (!ads.length) return;
    const { error } = await supabase
      .from("meta_competitor_ads")
      .insert(ads);

    if (error) throw new Error(`Error inserting competitor ads: ${error.message}`);
  }

  // ==========================================
  // BRANDS HELPER
  // ==========================================

  static async getCompetitorAdByFingerprint(
    supabase: SupabaseClient,
    brandId: string,
    fingerprint: string
  ): Promise<any | null> {
    const { data, error } = await supabase
      .from("meta_competitor_ads")
      .select("id, seen_count")
      .eq("brand_id", brandId)
      .eq("fingerprint", fingerprint)
      .single();

    if (error && error.code !== "PGRST116") throw new Error(`Error fetching competitor ad by fingerprint: ${error.message}`);
    return data || null;
  }

  static async updateCompetitorAd(
    supabase: SupabaseClient,
    id: string,
    data: any
  ): Promise<void> {
    const { error } = await supabase
      .from("meta_competitor_ads")
      .update(data)
      .eq("id", id);

    if (error) throw new Error(`Error updating competitor ad: ${error.message}`);
  }

  static async getTopCompetitorAds(
    supabase: SupabaseClient,
    brandId: string,
    limit: number = 10
  ): Promise<Partial<MetaCompetitorAd>[]> {
    const { data, error } = await supabase
      .from("meta_competitor_ads")
      .select("ad_text, visual_summary") // format is not in type, visual_summary is
      .eq("brand_id", brandId)
      .order("seen_count", { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Error fetching top competitor ads: ${error.message}`);
    return data || [];
  }

  static async getBrandById(supabase: SupabaseClient, id: string): Promise<any | null> {
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(`Error fetching brand by id: ${error.message}`);
    return data || null;
  }

  static async getBrands(supabase: SupabaseClient): Promise<{ id: string; name: string }[]> {
    const { data, error } = await supabase
      .from("brands")
      .select("id, name");

    if (error) throw new Error(`Error fetching brands: ${error.message}`);
    return data || [];
  }

  static async getFirstBrandId(supabase: SupabaseClient): Promise<string | null> {
    const { data, error } = await supabase
      .from("brands")
      .select("id")
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(`Error fetching first brand: ${error.message}`);
    return data?.id || null;
  }
}
