import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { BusinessSettings } from "@/modules/settings/types/settings.types";

/**
 * The single business row's deeper settings — everything the lightweight
 * /api/business route deliberately leaves out (see its own comment).
 * Single-tenant: there's exactly one businesses row, so this always reads/
 * writes that one, the same way every other route in this app resolves
 * "the business" (no per-user scoping, see CLAUDE.md's single-tenant note).
 */
export async function GET() {
  try {
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const { data: business, error } = await supabase.from("businesses").select("*").limit(1).single();
    if (error || !business) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const settingsJson = (business.settings as Record<string, any> | null) || {};
    const outreach = (business.outreach_settings as Record<string, any> | null) || {};
    const services = Array.isArray(business.services) ? (business.services as Record<string, any>[]) : [];
    const adScriptTopics = Array.isArray(business.ad_script_topics) ? (business.ad_script_topics as Record<string, any>[]) : [];

    const settings: BusinessSettings = {
      name: business.name || "",
      industry: business.industry || "",
      description: business.description || "",
      websiteUrl: business.website_url || "",
      toneOfVoice: business.tone_of_voice || "",
      businessVoice: business.business_voice || "",
      coreOfferings: business.core_offerings || "",
      painPoints: business.pain_points || "",
      targetAudience: business.target_audience || "",
      services: services.map((s) => ({ name: s.name || "", description: s.description || undefined })),
      targetCountries: Array.isArray(business.target_countries) ? (business.target_countries as string[]) : [],
      competitorKeywords: Array.isArray(business.competitor_keywords) ? (business.competitor_keywords as string[]) : [],
      adScriptTopics: adScriptTopics.map((t) => ({ topic: t.topic || "", format: t.format || "" })),
      outreachSettings: {
        dailyLimit: outreach.daily_limit ?? 50,
        timezone: outreach.timezone || "America/Detroit",
        days: Array.isArray(outreach.days) ? outreach.days : [0, 1, 2, 3, 4, 5, 6],
        sendWindow: { from: outreach.send_window?.from || "09:00", to: outreach.send_window?.to || "17:00" },
      },
      metaAdsAdvantageAudienceDefault: !!settingsJson.meta_ads?.advantage_audience_default,
    };

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("[SETTINGS_GET]", error);
    return NextResponse.json({ error: error.message || "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BusinessSettings;
    const supabase = (await createClient()) as SupabaseClient<Database>;

    const { data: business, error: findError } = await supabase.from("businesses").select("id, settings").limit(1).single();
    if (findError || !business) return NextResponse.json({ error: "No business found" }, { status: 404 });

    const existingSettingsJson = (business.settings as Record<string, any> | null) || {};

    const { error } = await supabase
      .from("businesses")
      .update({
        name: body.name,
        industry: body.industry || null,
        description: body.description || null,
        website_url: body.websiteUrl || null,
        tone_of_voice: body.toneOfVoice || null,
        business_voice: body.businessVoice || null,
        core_offerings: body.coreOfferings || null,
        pain_points: body.painPoints || null,
        target_audience: body.targetAudience || null,
        services: body.services.filter((s) => s.name.trim()) as any,
        target_countries: body.targetCountries,
        competitor_keywords: body.competitorKeywords,
        ad_script_topics: body.adScriptTopics.filter((t) => t.topic.trim()) as any,
        outreach_settings: {
          daily_limit: body.outreachSettings.dailyLimit,
          timezone: body.outreachSettings.timezone,
          days: body.outreachSettings.days,
          send_window: body.outreachSettings.sendWindow,
        },
        settings: { ...existingSettingsJson, meta_ads: { ...existingSettingsJson.meta_ads, advantage_audience_default: body.metaAdsAdvantageAudienceDefault } },
      })
      .eq("id", business.id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[SETTINGS_UPDATE]", error);
    return NextResponse.json({ error: error.message || "Failed to update settings" }, { status: 500 });
  }
}
