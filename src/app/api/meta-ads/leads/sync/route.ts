import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { MetaAdsService } from "@/modules/meta-ads/services/meta-ads.service";
import { LeadsService } from "@/modules/meta-ads/services/leads.service";

/**
 * Manual "Sync now" — a background job already syncs every 5 minutes (see
 * jobs/meta-ads-leads-sync.job.ts), so this exists purely for forcing an
 * immediate, on-demand check instead of waiting for the next tick.
 */
export async function POST() {
  try {
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const businessId = await MetaAdsService.getFirstBusinessId(supabase);
    if (!businessId) return NextResponse.json({ error: "No business configured" }, { status: 400 });

    const result = await LeadsService.syncFromMeta(supabase, businessId);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("[META_ADS_LEADS_SYNC]", error);
    return NextResponse.json({ error: error.message || "Failed to sync leads" }, { status: 500 });
  }
}
