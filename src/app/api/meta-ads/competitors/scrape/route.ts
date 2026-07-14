import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApifyService } from '@/services/apify';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { competitorId } = await req.json();

    if (!competitorId) {
      return NextResponse.json({ error: 'Missing competitorId' }, { status: 400 });
    }

    // 1. Fetch Competitor to get their meta_page_id or website
    const { data: competitor, error: fetchError } = await (supabase as any)
      .from('competitors')
      .select('*')
      .eq('id', competitorId)
      .single();

    if (fetchError || !competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    // 2. Trigger Apify Actor for Facebook Ads Scraper
    // Note: The specific actor ID and input schema depends on the exact Apify actor used
    // We assume a standard Meta Ad Library scraper actor
    const apifyInput = {
      pageUrl: (competitor as any).meta_page_id ? `https://www.facebook.com/${(competitor as any).meta_page_id}` : `https://www.facebook.com/${(competitor as any).name}`,
      maxItems: 50,
    };

    const scrapeResult = await ApifyService.runActor('apify/facebook-ads-scraper', apifyInput);

    // 3. Insert into scrape_jobs
    const { data: job, error: insertError } = await supabase
      .from('scrape_jobs')
      .insert({
        brand_id: (competitor as any).brand_id,
        competitor_id: (competitor as any).id,
        actor_id: 'apify/facebook-ads-scraper',
        apify_run_id: scrapeResult.runId,
        status: 'running',
        started_at: new Date().toISOString()
      } as any)
      .select()
      .single();

    if (insertError) {
      console.error("Job Insert Error:", insertError);
      return NextResponse.json({ error: 'Failed to record scrape job' }, { status: 500 });
    }

    return NextResponse.json({ jobId: (job as any)?.id, apifyRunId: scrapeResult.runId, status: 'running' });
  } catch (error: any) {
    console.error("Scrape Route Error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
