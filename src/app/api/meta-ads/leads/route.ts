import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { MetaAdsService } from "@/modules/meta-ads/services/meta-ads.service";
import { paginationMeta, rangeFor, PAGE_SIZE_COMPACT } from "@/lib/pagination";

/**
 * Reads straight from our own leads table — no live Meta call on page
 * load. Leads arrive here via the webhook the instant they're submitted
 * (or via the manual Sync button below, for anything submitted before the
 * webhook was registered), so there's nothing to fetch live: unlike
 * campaign status, a lead someone already submitted doesn't change.
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
