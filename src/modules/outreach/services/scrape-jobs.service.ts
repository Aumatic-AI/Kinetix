import { createClient } from "@/lib/supabase/server";
import { ScrapeJob } from "../types/outreach.types";

export class ScrapeJobsService {
  static async getJobs(businessId: string): Promise<ScrapeJob[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("outreach_scrape_jobs")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Error fetching scrape jobs: ${error.message}`);
    return (data as unknown as ScrapeJob[]) || [];
  }

  static async createJob(row: Partial<ScrapeJob> & { business_id: string; list_id: string; niches: string; location: string }): Promise<ScrapeJob> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("outreach_scrape_jobs").insert(row).select("*").single();
    if (error) throw new Error(`Error creating scrape job: ${error.message}`);
    return data as unknown as ScrapeJob;
  }

  static async updateJob(id: string, row: Partial<ScrapeJob>): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("outreach_scrape_jobs").update(row).eq("id", id);
    if (error) throw new Error(`Error updating scrape job: ${error.message}`);
  }
}
