import { NextResponse } from "next/server";
import { requireMetaPageEnv, graphGet, graphPost } from "@/services/meta/graph-client";

/**
 * Instant Forms live entirely on Meta — no local table for them (unlike
 * campaigns/ads, there's nothing about a form we need to know when Meta is
 * unreachable, and they change rarely). Same Page-scoped token as the
 * webhook/leads routes, not the ad-account token used everywhere else in
 * this module.
 */
export async function GET() {
  try {
    const { pageId, pageToken } = requireMetaPageEnv();
    const data = await graphGet<{ data?: { id: string; name: string; status: string }[] }>(`${pageId}/leadgen_forms`, pageToken, {
      fields: "id,name,status",
    });
    const forms = (data.data || []).filter((f) => f.status !== "ARCHIVED");
    return NextResponse.json({ forms });
  } catch (error: any) {
    console.error("[META_ADS_LEAD_FORMS_LIST]", error);
    return NextResponse.json({ error: error.message || "Failed to load lead forms" }, { status: 500 });
  }
}

const PRESET_TYPES = new Set(["FULL_NAME", "EMAIL", "PHONE"]);

export async function POST(request: Request) {
  try {
    const { pageId, pageToken } = requireMetaPageEnv();
    const body = (await request.json()) as { name?: string; presetQuestions?: string[]; customQuestions?: string[]; thankYouUrl?: string };

    if (!body.name?.trim()) return NextResponse.json({ error: "Form name is required" }, { status: 400 });

    const questions: { type: string; label?: string }[] = [];
    for (const preset of body.presetQuestions?.length ? body.presetQuestions : ["FULL_NAME", "EMAIL", "PHONE"]) {
      if (PRESET_TYPES.has(preset)) questions.push({ type: preset });
    }
    for (const label of body.customQuestions || []) {
      if (label?.trim()) questions.push({ type: "CUSTOM", label: label.trim() });
    }
    if (questions.length === 0) return NextResponse.json({ error: "At least one question is required" }, { status: 400 });

    const created = await graphPost<{ id: string }>(`${pageId}/leadgen_forms`, pageToken, {
      name: body.name.trim(),
      questions,
      privacy_policy: { url: body.thankYouUrl || "https://example.com/privacy-policy", link_text: "Privacy Policy" },
      locale: "EN_US",
      ...(body.thankYouUrl ? { thank_you_page: { title: "Thank you!", body: "We'll be in touch soon.", website_url: body.thankYouUrl, button_type: "VIEW_WEBSITE", button_text: "Visit Website" } } : {}),
    });

    return NextResponse.json({ success: true, id: created.id, name: body.name.trim() });
  } catch (error: any) {
    console.error("[META_ADS_LEAD_FORMS_CREATE]", error);
    return NextResponse.json({ error: error.message || "Failed to create lead form" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { pageToken } = requireMetaPageEnv();
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get("formId");
    if (!formId) return NextResponse.json({ error: "formId is required" }, { status: 400 });

    // Meta doesn't support a true DELETE here — ARCHIVED is the permanent equivalent.
    await graphPost(formId, pageToken, { status: "ARCHIVED" });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[META_ADS_LEAD_FORMS_DELETE]", error);
    return NextResponse.json({ error: error.message || "Failed to archive lead form" }, { status: 500 });
  }
}
