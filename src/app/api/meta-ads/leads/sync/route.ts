import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { requireMetaPageEnv, graphGetAllPages } from "@/services/meta/graph-client";
import { MetaAdsService } from "@/modules/meta-ads/services/meta-ads.service";

/**
 * Manual backfill — the webhook (see /api/webhooks/meta/leads) is the
 * primary path, but it can only capture leads submitted after the
 * subscription was registered, and it depends on a stable public URL that
 * a local dev/ngrok setup can't guarantee. This button covers the gap:
 * user-triggered only, never run automatically, so it never turns into
 * the legacy project's "re-fetch every lead on every page visit" pattern.
 */
export async function POST() {
  try {
    const { pageId, pageToken } = requireMetaPageEnv();
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const businessId = await MetaAdsService.getFirstBusinessId(supabase);
    if (!businessId) return NextResponse.json({ error: "No business configured" }, { status: 400 });

    const forms = await graphGetAllPages<{ id: string; name: string }>(`${pageId}/leadgen_forms`, pageToken, { fields: "id,name", limit: "100" });

    let imported = 0;
    for (const form of forms) {
      const leads = await graphGetAllPages<{ id: string; field_data?: { name: string; values: string[] }[]; ad_id?: string; ad_name?: string; adset_name?: string; campaign_name?: string }>(
        `${form.id}/leads`,
        pageToken,
        { fields: "id,created_time,field_data,ad_id,ad_name,adset_name,campaign_name", limit: "100" }
      );

      for (const lead of leads) {
        let ourAdId: string | null = null;
        if (lead.ad_id) {
          const { data: adRow } = await supabase.from("ads").select("id").eq("external_ad_id", lead.ad_id).maybeSingle();
          ourAdId = adRow?.id || null;
        }
        const fieldData = Object.fromEntries((lead.field_data || []).map((f) => [f.name, f.values?.[0] || ""]));
        const { error } = await supabase.from("leads").upsert(
          {
            business_id: businessId,
            ad_id: ourAdId,
            ad_name: lead.ad_name || null,
            adset_name: lead.adset_name || null,
            campaign_name: lead.campaign_name || null,
            meta_form_id: form.id,
            meta_lead_id: lead.id,
            field_data: fieldData,
          },
          { onConflict: "meta_lead_id" }
        );
        if (!error) imported++;
      }
    }

    return NextResponse.json({ success: true, formsChecked: forms.length, leadsImported: imported });
  } catch (error: any) {
    console.error("[META_ADS_LEADS_SYNC]", error);
    return NextResponse.json({ error: error.message || "Failed to sync leads" }, { status: 500 });
  }
}
