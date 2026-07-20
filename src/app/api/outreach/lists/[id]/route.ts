import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { LeadListsService } from "@/modules/outreach/services/lead-lists.service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "List name is required" }, { status: 400 });

    const supabase = (await createClient()) as SupabaseClient<Database>;
    await LeadListsService.renameList(supabase, id, name.trim());
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[OUTREACH_LISTS_RENAME]", error);
    return NextResponse.json({ error: error.message || "Failed to rename list" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = (await createClient()) as SupabaseClient<Database>;
    await LeadListsService.deleteList(supabase, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[OUTREACH_LISTS_DELETE]", error);
    return NextResponse.json({ error: error.message || "Failed to delete list" }, { status: 500 });
  }
}
