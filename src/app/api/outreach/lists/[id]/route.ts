import { NextResponse } from "next/server";
import { LeadListsService } from "@/modules/outreach/services/outreach.service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "List name is required" }, { status: 400 });

    await LeadListsService.renameList(id, name.trim());
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[OUTREACH_LISTS_RENAME]", error);
    return NextResponse.json({ error: error.message || "Failed to rename list" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await LeadListsService.deleteList(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[OUTREACH_LISTS_DELETE]", error);
    return NextResponse.json({ error: error.message || "Failed to delete list" }, { status: 500 });
  }
}
