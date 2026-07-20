import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { MetaAdsService } from "@/modules/meta-ads/services/meta-ads.service";
import { OutreachCampaignsService } from "@/modules/outreach/services/outreach-campaigns.service";
import { getOutreachDraftPrompt } from "@/prompts/outreach";
import { aiOrchestrator } from "@/services/ai/orchestrator";

export async function GET() {
  try {
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const businessId = await MetaAdsService.getFirstBusinessId(supabase);
    if (!businessId) return NextResponse.json({ campaigns: [] });
    const campaigns = await OutreachCampaignsService.getCampaigns(supabase, businessId);
    return NextResponse.json({ campaigns });
  } catch (error: any) {
    console.error("[OUTREACH_CAMPAIGNS_LIST]", error);
    return NextResponse.json({ error: error.message || "Failed to load campaigns" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name?.trim() || !body.categoryId || !body.serviceType || !body.targetRegion || !body.goal?.trim() || !body.messageBrief?.trim()) {
      return NextResponse.json({ error: "Name, list, service type, target region, goal, and message brief are all required" }, { status: 400 });
    }

    const supabase = (await createClient()) as SupabaseClient<Database>;
    const businessId = await MetaAdsService.getFirstBusinessId(supabase);
    if (!businessId) return NextResponse.json({ error: "No business configured" }, { status: 400 });

    const business = await MetaAdsService.getBusinessById(supabase, businessId);
    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const input = {
      goal: body.goal.trim(),
      tone: body.tone || "Friendly and professional",
      messageBrief: body.messageBrief.trim(),
      serviceType: body.serviceType,
      targetRegion: body.targetRegion,
      ctaText: body.ctaText?.trim() || undefined,
      ctaLink: body.ctaLink?.trim() || undefined,
    };

    const campaign = await OutreachCampaignsService.createCampaign(supabase, {
      business_id: businessId,
      category_id: body.categoryId,
      name: body.name.trim(),
      goal: input.goal,
      tone: input.tone,
      message_brief: input.messageBrief,
      service_type: input.serviceType,
      target_region: input.targetRegion,
      cta_text: input.ctaText || null,
      cta_link: input.ctaLink || null,
      status: "draft",
      daily_limit: Number(body.dailyLimit) || 50,
    });

    const prompt = getOutreachDraftPrompt(business, input);
    const responseText = (await aiOrchestrator.executeTask("text", prompt.user, "openai", { systemPrompt: prompt.system })) as string;
    const generatedBody = JSON.parse(responseText.replace(/```json\n?|\n?```/g, "").trim());

    await OutreachCampaignsService.updateCampaign(supabase, campaign.id, {
      generated_subject: generatedBody.subject,
      generated_body: generatedBody,
    });

    return NextResponse.json({ success: true, campaign: { ...campaign, generated_subject: generatedBody.subject, generated_body: generatedBody } });
  } catch (error: any) {
    console.error("[OUTREACH_CAMPAIGNS_CREATE]", error);
    return NextResponse.json({ error: error.message || "Failed to generate campaign" }, { status: 500 });
  }
}
