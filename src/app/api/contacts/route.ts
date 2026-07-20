import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { MetaAdsService } from "@/modules/meta-ads/services/meta-ads.service";
import { ContactsService } from "@/modules/contacts/services/contacts.service";

/** Shared by both Newsletter (filters to subscriber_status) and Outreach
 * (filters to outreach_status) — one list, one API, two views onto it. */
export async function GET(request: NextRequest) {
  try {
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const businessId = await MetaAdsService.getFirstBusinessId(supabase);
    if (!businessId) return NextResponse.json({ contacts: [], count: 0 });

    const { searchParams } = request.nextUrl;
    const { contacts, count } = await ContactsService.getContacts(
      supabase,
      businessId,
      {
        categoryId: searchParams.get("categoryId") || undefined,
        search: searchParams.get("search") || undefined,
        subscriberStatus: (searchParams.get("subscriberStatus") as any) || undefined,
        outreachStatus: (searchParams.get("outreachStatus") as any) || undefined,
        excludeOutreachStatuses: searchParams.get("excludeOutreachStatuses")?.split(",").filter(Boolean) as any,
      },
      { page: Number(searchParams.get("page")) || 1, limit: Number(searchParams.get("limit")) || 50 }
    );

    return NextResponse.json({ contacts, count });
  } catch (error: any) {
    console.error("[CONTACTS_LIST]", error);
    return NextResponse.json({ error: error.message || "Failed to load contacts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.email?.trim()) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const supabase = (await createClient()) as SupabaseClient<Database>;
    const businessId = await MetaAdsService.getFirstBusinessId(supabase);
    if (!businessId) return NextResponse.json({ error: "No business configured" }, { status: 400 });

    const contact = await ContactsService.createContact(supabase, {
      business_id: businessId,
      email: body.email.trim(),
      first_name: body.firstName || null,
      last_name: body.lastName || null,
      phone: body.phone || null,
      company: body.company || null,
      category_id: body.categoryId || null,
      source: "manual",
    });

    return NextResponse.json({ success: true, contact });
  } catch (error: any) {
    console.error("[CONTACTS_CREATE]", error);
    return NextResponse.json({ error: error.message || "Failed to create contact" }, { status: 500 });
  }
}
