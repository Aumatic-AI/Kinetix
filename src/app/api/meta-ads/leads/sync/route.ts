import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { MetaAdsService } from "@/modules/meta-ads/services/meta-ads.service";
import { LeadsService } from "@/modules/meta-ads/services/leads.service";

/**
 * Manual "Sync now" — the Leads page itself already syncs automatically
 * every time it's opened (see GET /api/meta-ads/leads), so this exists
 * purely for forcing a fresh check without leaving/reopening the page.
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
