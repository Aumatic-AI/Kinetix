import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { MetaAdsService } from "@/modules/meta-ads/services/meta-ads.service";

export async function GET() {
  try {
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const businessId = await MetaAdsService.getFirstBusinessId(supabase);
    if (!businessId) return NextResponse.json({ counts: {}, totalCampaignsSent: 0, totalLeads: 0 });

    const { data: events, error } = await supabase.from("email_events").select("event_type").eq("business_id", businessId).eq("channel", "outreach");
    if (error) throw new Error(error.message);

    const counts: Record<string, number> = {};
    for (const e of events || []) counts[e.event_type] = (counts[e.event_type] || 0) + 1;

    const { count: totalCampaignsSent } = await supabase
      .from("outreach_campaigns")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .in("status", ["active", "completed"]);

    const { count: totalLeads } = await supabase
      .from("outreach_leads")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);

    return NextResponse.json({ counts, totalCampaignsSent: totalCampaignsSent || 0, totalLeads: totalLeads || 0 });
  } catch (error: any) {
    console.error("[OUTREACH_ANALYTICS]", error);
    return NextResponse.json({ error: error.message || "Failed to load analytics" }, { status: 500 });
  }
}
