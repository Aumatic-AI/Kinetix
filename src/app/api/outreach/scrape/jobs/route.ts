import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { MetaAdsService } from "@/modules/meta-ads/services/meta-ads.service";
import { ScrapeJobsService } from "@/modules/outreach/services/scrape-jobs.service";

export async function GET() {
  try {
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const businessId = await MetaAdsService.getFirstBusinessId(supabase);
    if (!businessId) return NextResponse.json({ jobs: [] });
    const jobs = await ScrapeJobsService.getJobs(businessId);
    return NextResponse.json({ jobs });
  } catch (error: any) {
    console.error("[OUTREACH_SCRAPE_JOBS_LIST]", error);
    return NextResponse.json({ error: error.message || "Failed to load scrape jobs" }, { status: 500 });
  }
}
