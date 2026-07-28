import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { graphGet } from "@/services/meta/graph-client";
import { env } from "@/config";

/**
 * Meta's real-time Lead Ads webhook — pushed the instant someone submits a
 * form, instead of the legacy project's approach of re-fetching the whole
 * lead history from Meta every time the Leads tab was opened. Two Meta
 * requirements: a one-time verification handshake (GET) done when you
 * register the subscription in Meta's dashboard, and an HMAC signature on
 * every event (POST) so a request can't be spoofed by anyone who finds
 * this URL. See the build guide's Leads section for the manual dashboard
 * steps this depends on.
 */

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === env.META_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

function isValidSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

interface LeadgenChange {
  field: string;
  value: {
    leadgen_id: string;
    page_id: string;
    form_id: string;
    ad_id?: string;
  };
}

interface FullLead {
  id: string;
  created_time?: string;
  field_data?: { name: string; values: string[] }[];
  ad_id?: string;
  ad_name?: string;
  adset_name?: string;
  campaign_name?: string;
  form_id?: string;
}

export async function POST(request: NextRequest) {
  const appSecret = env.META_APP_SECRET;
  const pageToken = env.META_PAGE_TOKEN;
  if (!appSecret || !pageToken) {
    // Not configured yet — acknowledge with 200 so Meta doesn't retry forever,
    // but do nothing. Setup is required in the Leads tab before this is live.
    return NextResponse.json({ received: true, note: "Leads webhook not configured" });
  }

  const rawBody = await request.text();
  if (!isValidSignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as { entry?: { changes?: LeadgenChange[] }[] };
  const leadgenChanges = (payload.entry || []).flatMap((e) => e.changes || []).filter((c) => c.field === "leadgen");
  if (leadgenChanges.length === 0) return NextResponse.json({ received: true });

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: business } = await supabase.from("businesses").select("id").limit(1).single();
  if (!business) return NextResponse.json({ received: true, note: "No business configured" });

  for (const change of leadgenChanges) {
    try {
      const lead = await graphGet<FullLead>(change.value.leadgen_id, pageToken, {
        fields: "id,created_time,field_data,ad_id,ad_name,adset_name,campaign_name,form_id",
      });

      let ourAdId: string | null = null;
      if (lead.ad_id) {
        const { data: adRow } = await supabase.from("ads").select("id").eq("external_ad_id", lead.ad_id).maybeSingle();
        ourAdId = adRow?.id || null;
      }

      const fieldData = Object.fromEntries((lead.field_data || []).map((f) => [f.name, f.values?.[0] || ""]));

      await supabase.from("leads").upsert(
        {
          business_id: business.id,
          // Meta's own submission time, not "whenever our webhook happened to
          // process this" — those are normally the same instant for a live
          // webhook, but this matters a lot for the backfill sync route below,
          // which can process leads submitted days or weeks earlier.
          created_at: lead.created_time || new Date().toISOString(),
          ad_id: ourAdId,
          ad_name: lead.ad_name || null,
          adset_name: lead.adset_name || null,
          campaign_name: lead.campaign_name || null,
          meta_form_id: lead.form_id || change.value.form_id,
          meta_lead_id: lead.id,
          field_data: fieldData,
        },
        { onConflict: "meta_lead_id" }
      );
    } catch (err) {
      console.error("[META_LEADS_WEBHOOK] failed to process leadgen_id", change.value.leadgen_id, err);
    }
  }

  return NextResponse.json({ received: true });
}
