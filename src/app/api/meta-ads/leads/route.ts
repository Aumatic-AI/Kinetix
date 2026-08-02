import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { MetaAdsService } from "@/modules/meta-ads/services/meta-ads.service";
import { paginationMeta, rangeFor, PAGE_SIZE_COMPACT } from "@/lib/pagination";

/**
 * No webhook, and no live Meta call here either — `jobs/meta-ads-leads-sync.job.ts`
 * (cron, every 5 minutes) is the only thing that syncs from the Graph API;
 * this route only ever reads our own `leads` table, so a page load is a
 * single fast Postgres query regardless of how slow Meta's API is. "Sync
 * now" on the page (POST /api/meta-ads/leads/sync) still triggers an
 * immediate, blocking sync for anyone who doesn't want to wait for the
 * next tick.
 */
export async function GET(request: NextRequest) {
  try {
    const page = Number(request.nextUrl.searchParams.get("page")) || 1;
    const limit = Number(request.nextUrl.searchParams.get("limit")) || PAGE_SIZE_COMPACT;

    const supabase = (await createClient()) as SupabaseClient<Database>;
    const businessId = await MetaAdsService.getFirstBusinessId(supabase);
    if (!businessId) return NextResponse.json({ leads: [], ...paginationMeta(0, page, limit) });

    const [from, to] = rangeFor(page, limit);
    const { data, error, count } = await supabase
      .from("leads")
      .select("*", { count: "exact" })
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);

    return NextResponse.json({ leads: data || [], ...paginationMeta(count || 0, page, limit) });
  } catch (error: any) {
    console.error("[META_ADS_LEADS_LIST]", error);
    return NextResponse.json({ error: error.message || "Failed to load leads" }, { status: 500 });
  }
}
