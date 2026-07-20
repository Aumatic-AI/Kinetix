import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EVENT_MAP: Record<string, string> = {
  email_sent: "sent",
  email_bounced: "bounced",
  email_replied: "replied",
  lead_interested: "replied",
};

/**
 * Instantly's reply/bounce webhook — this is new: the legacy app never
 * ingested any inbound event, it only polled Instantly's analytics
 * endpoint live. Confirm the exact event names/payload shape against
 * Instantly's current webhook docs before relying on this in production —
 * it's built from the shape documented in Instantly's public API
 * reference, not exercised against a real payload yet.
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const eventType = EVENT_MAP[payload.event_type];
    if (!eventType) return NextResponse.json({ received: true });

    const email = payload.lead_email || payload.email;
    if (!email) return NextResponse.json({ received: true });

    const { data: lead } = await supabase.from("outreach_leads").select("id, business_id").eq("email", email).maybeSingle();
    if (!lead) return NextResponse.json({ received: true });

    await supabase.from("email_events").insert({
      business_id: lead.business_id,
      contact_id: lead.id,
      channel: "outreach",
      outreach_campaign_id: null,
      event_type: eventType,
      provider_message_id: payload.id || null,
      raw_data: payload,
    });

    if (eventType === "bounced") {
      await supabase.from("outreach_leads").update({ status: "bounced" }).eq("id", lead.id);
    } else if (eventType === "replied") {
      await supabase.from("outreach_leads").update({ status: "replied" }).eq("id", lead.id);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[OUTREACH_WEBHOOK]", error);
    return NextResponse.json({ error: error.message || "Failed to process webhook" }, { status: 500 });
  }
}
