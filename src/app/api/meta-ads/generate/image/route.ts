import { NextResponse } from "next/server";
import { inngest } from "@/services/inngest/client";
import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

export async function POST(request: Request) {
  try {
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const body = await request.json();

    if (!body.ideaPrompt) {
      return NextResponse.json(
        { error: "Missing required field: ideaPrompt" },
        { status: 400 }
      );
    }
    if (!body.service) {
      return NextResponse.json(
        { error: "Missing required field: service" },
        { status: 400 }
      );
    }

    const { data: business } = await supabase.from("businesses").select("id").limit(1).single();
    if (!business) throw new Error("No business found");

    // Create database record first
    const { data: creative, error } = await supabase
      .from('meta_ad_creatives')
      .insert({
        business_id: business.id,
        type: 'image',
        idea_prompt: body.ideaPrompt,
        service: body.service,
        status: 'pending',
      })
      .select()
      .single();

    if (error || !creative) throw new Error("Failed to create record");

    // Trigger the background job
    await inngest.send({
      name: "meta-ads/generate-image",
      data: {
        ideaPrompt: body.ideaPrompt,
        service: body.service,
        creativeId: creative.id,
        businessId: business.id
      }
    });

    return NextResponse.json({ success: true, data: creative, message: "Image generation started" });
  } catch (error: any) {
    console.error("[META_ADS_GENERATE_IMAGE]", error);
    return NextResponse.json(
      { error: "Failed to start image generation" },
      { status: 500 }
    );
  }
}
