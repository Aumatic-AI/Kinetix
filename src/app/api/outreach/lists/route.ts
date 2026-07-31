import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { MetaAdsService } from "@/modules/meta-ads/services/meta-ads.service";
import { LeadListsService, LeadsService } from "@/modules/outreach/services/outreach.service";
import { paginationMeta, PAGE_SIZE_COMPACT } from "@/lib/pagination";

/**
 * Lead lists — a client-managed list of names they can rename, add to, or
 * delete freely, instead of a fixed set baked into the code.
 *
 * `page`/`limit` are optional: the Leads page passes them for its
 * paginated table, but pickers that need every list at once (FindLeadsModal,
 * NewCampaignPage, via the plain useLeadLists() hook) call this with
 * neither — in that case this returns the full list, unpaginated, exactly
 * as before.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const businessId = await MetaAdsService.getFirstBusinessId(supabase);
    if (!businessId) return NextResponse.json({ lists: [] });

    const { searchParams } = request.nextUrl;
    const paginated = searchParams.has("page") || searchParams.has("limit");
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || PAGE_SIZE_COMPACT;

    const { lists, total } = await LeadListsService.getLists(businessId, paginated ? { page, limit } : undefined);
    // Scoped to just this page's lists when paginated, instead of scanning
    // every lead this business owns.
    const leadCounts = await LeadsService.getListLeadCounts(businessId, paginated ? lists.map((l) => l.id) : undefined);

    const payload = { lists: lists.map((l) => ({ ...l, leadCount: leadCounts[l.id] || 0 })) };
    return NextResponse.json(paginated ? { ...payload, ...paginationMeta(total, page, limit) } : payload);
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
