import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { MetaAdsService } from "@/modules/meta-ads/services/meta-ads.service";
import { ContactCategoriesService } from "@/modules/contacts/services/contact-categories.service";
import { ContactsService } from "@/modules/contacts/services/contacts.service";

/** Categories replace the legacy apps' hardcoded per-vertical tables
 * (table1..table6) — a client-managed list they can rename, add to, or
 * delete, instead of a fixed set baked into the code. */
export async function GET() {
  try {
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const businessId = await MetaAdsService.getFirstBusinessId(supabase);
    if (!businessId) return NextResponse.json({ categories: [] });

    const [categories, breakdown] = await Promise.all([
      ContactCategoriesService.getCategories(supabase, businessId),
      ContactsService.getCategoryStatusBreakdown(supabase, businessId),
    ]);

    return NextResponse.json({
      categories: categories.map((c) => ({
        ...c,
        contactCount: breakdown[c.id]?.total || 0,
        statusBreakdown: breakdown[c.id] || { total: 0, muted: 0, info: 0, success: 0, danger: 0 },
      })),
    });
  } catch (error: any) {
    console.error("[CONTACT_CATEGORIES_LIST]", error);
    return NextResponse.json({ error: error.message || "Failed to load categories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "Category name is required" }, { status: 400 });

    const supabase = (await createClient()) as SupabaseClient<Database>;
    const businessId = await MetaAdsService.getFirstBusinessId(supabase);
    if (!businessId) return NextResponse.json({ error: "No business configured" }, { status: 400 });

    const category = await ContactCategoriesService.createCategory(supabase, businessId, name.trim());
    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    console.error("[CONTACT_CATEGORIES_CREATE]", error);
    return NextResponse.json({ error: error.message || "Failed to create category" }, { status: 500 });
  }
}
