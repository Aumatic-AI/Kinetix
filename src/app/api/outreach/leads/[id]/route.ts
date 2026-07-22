import { NextResponse } from "next/server";
import { LeadsService } from "@/modules/outreach/services/outreach.service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    await LeadsService.updateLead(id, {
      ...(body.firstName !== undefined ? { first_name: body.firstName } : {}),
      ...(body.lastName !== undefined ? { last_name: body.lastName } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.company !== undefined ? { company: body.company } : {}),
      ...(body.listId !== undefined ? { list_id: body.listId } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[OUTREACH_LEADS_UPDATE]", error);
    return NextResponse.json({ error: error.message || "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await LeadsService.deleteLead(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[OUTREACH_LEADS_DELETE]", error);
    return NextResponse.json({ error: error.message || "Failed to delete lead" }, { status: 500 });
  }
}
