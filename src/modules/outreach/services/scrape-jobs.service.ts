import { SupabaseClient } from "@supabase/supabase-js";
import { ScrapeJob } from "../types/outreach.types";

export class ScrapeJobsService {
  static async getJobs(supabase: SupabaseClient, businessId: string): Promise<ScrapeJob[]> {
    const { data, error } = await supabase
      .from("outreach_scrape_jobs")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Error fetching scrape jobs: ${error.message}`);
    return (data as unknown as ScrapeJob[]) || [];
  }

  static async createJob(supabase: SupabaseClient, row: Partial<ScrapeJob>): Promise<ScrapeJob> {
    const { data, error } = await supabase.from("outreach_scrape_jobs").insert(row).select("*").single();
    if (error) throw new Error(`Error creating scrape job: ${error.message}`);
    return data as unknown as ScrapeJob;
  }

  static async updateJob(supabase: SupabaseClient, id: string, row: Partial<ScrapeJob>): Promise<void> {
    const { error } = await supabase.from("outreach_scrape_jobs").update(row).eq("id", id);
    if (error) throw new Error(`Error updating scrape job: ${error.message}`);
  }
}
