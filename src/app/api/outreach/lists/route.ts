import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { MetaAdsService } from "@/modules/meta-ads/services/meta-ads.service";
import { LeadListsService, LeadsService } from "@/modules/outreach/services/outreach.service";

/** Lead lists — a client-managed list of names they can rename, add to, or
 * delete freely, instead of a fixed set baked into the code. */
export async function GET() {
  try {
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const businessId = await MetaAdsService.getFirstBusinessId(supabase);
    if (!businessId) return NextResponse.json({ lists: [] });

    const [lists, breakdown] = await Promise.all([
      LeadListsService.getLists(businessId),
      LeadsService.getListStatusBreakdown(businessId),
    ]);

    return NextResponse.json({
      lists: lists.map((l) => ({
        ...l,
        leadCount: breakdown[l.id]?.total || 0,
        statusBreakdown: breakdown[l.id] || { total: 0, muted: 0, info: 0, success: 0, danger: 0 },
      })),
    });
  } catch (error: any) {
    console.error("[OUTREACH_LISTS_LIST]", error);
    return NextResponse.json({ error: error.message || "Failed to load lists" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "List name is required" }, { status: 400 });

    const supabase = (await createClient()) as SupabaseClient<Database>;
    const businessId = await MetaAdsService.getFirstBusinessId(supabase);
    if (!businessId) return NextResponse.json({ error: "No business configured" }, { status: 400 });

    const list = await LeadListsService.createList(businessId, name.trim());
    return NextResponse.json({ success: true, list });
  } catch (error: any) {
    console.error("[OUTREACH_LISTS_CREATE]", error);
    return NextResponse.json({ error: error.message || "Failed to create list" }, { status: 500 });
  }
}
