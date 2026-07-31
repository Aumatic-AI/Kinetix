import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { MetaAdsService } from "@/modules/meta-ads/services/meta-ads.service";
import { LeadsService } from "@/modules/meta-ads/services/leads.service";
import { paginationMeta, rangeFor, PAGE_SIZE_COMPACT } from "@/lib/pagination";

/**
 * No webhook — instead, opening the Leads page (always page 1) syncs
 * straight from the Meta Graph API before reading our own `leads` table,
 * so the list is never more than one page-open stale. Paginating to page
 * 2+ skips the re-sync (it just happened moments ago when the page
 * opened) and reads straight from the DB, same as before.
 */
export async function GET(request: NextRequest) {
  try {
    const page = Number(request.nextUrl.searchParams.get("page")) || 1;
    const limit = Number(request.nextUrl.searchParams.get("limit")) || PAGE_SIZE_COMPACT;

    const supabase = (await createClient()) as SupabaseClient<Database>;
    const businessId = await MetaAdsService.getFirstBusinessId(supabase);
    if (!businessId) return NextResponse.json({ leads: [], ...paginationMeta(0, page, limit) });

    if (page === 1) {
      try {
        await LeadsService.syncFromMeta(supabase, businessId);
      } catch (syncError) {
        // Don't let a Meta API hiccup block the page from showing whatever
        // we already have stored — same "degrade, don't crash" pattern as
        // the rest of the Meta Ads integration.
        console.error("[META_ADS_LEADS_LIST] sync failed, serving stored leads", syncError);
      }
    }

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
