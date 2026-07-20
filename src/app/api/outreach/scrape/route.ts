import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { MetaAdsService } from "@/modules/meta-ads/services/meta-ads.service";
import { ScrapeJobsService } from "@/modules/outreach/services/scrape-jobs.service";
import { inngest } from "@/services/inngest/client";

/** Starts a lead-scraping run in the background — the job itself (Apify
 * trigger, poll, email verification, save) runs as an Inngest function so
 * this route returns immediately, same pattern as every other long-running
 * Kinetix operation. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.niches?.trim() || !body.location?.trim() || !body.listId) {
      return NextResponse.json({ error: "Niches, location, and a list are required" }, { status: 400 });
    }

    const supabase = (await createClient()) as SupabaseClient<Database>;
    const businessId = await MetaAdsService.getFirstBusinessId(supabase);
    if (!businessId) return NextResponse.json({ error: "No business configured" }, { status: 400 });

    const job = await ScrapeJobsService.createJob(supabase, {
      business_id: businessId,
      list_id: body.listId,
      niches: body.niches.trim(),
      location: body.location.trim(),
      max_results: Math.min(Math.max(Number(body.maxResults) || 100, 10), 500),
      status: "queued",
    });

    await inngest.send({ name: "outreach/scrape-contacts", data: { jobId: job.id } });

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    console.error("[OUTREACH_SCRAPE_START]", error);
    return NextResponse.json({ error: error.message || "Failed to start scrape" }, { status: 500 });
  }
}
