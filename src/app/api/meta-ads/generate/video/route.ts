import { NextResponse } from "next/server";
import { inngest } from "@/services/inngest/client";
import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";

export async function POST(request: Request) {
  try {
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const body = await request.json();
    
    // Validate required fields
    if (!body.ideaPrompt) {
      return NextResponse.json(
        { error: "Missing required field: ideaPrompt" },
        { status: 400 }
      );
    }

    const { data: brand } = await supabase.from("brands").select("id").limit(1).single();
    if (!brand) throw new Error("No brand found");

    // Create database record first
    const { data: creative, error } = await supabase
      .from('meta_ad_creatives')
      .insert({
        brand_id: brand.id,
        type: 'video',
        idea_prompt: body.ideaPrompt,
        duration: body.duration,
        video_style: body.videoStyle,
        audio_style: body.audioStyle,
        character_type: body.character,
        language: body.language,
        status: 'pending',
      })
      .select()
      .single();

    if (error || !creative) throw new Error("Failed to create record");

    // Trigger the background job
    await inngest.send({
      name: "meta-ads/generate-video",
      data: {
        duration: body.duration,
        audioStyle: body.audioStyle,
        character: body.character,
        voiceId: body.voiceId,
        videoStyle: body.videoStyle,
        language: body.language,
        ideaPrompt: body.ideaPrompt,
        creativeId: creative.id,
        brandId: brand.id
      }
    });

    return NextResponse.json({ success: true, data: creative, message: "Video generation started" });
  } catch (error: any) {
    console.error("[META_ADS_GENERATE_VIDEO]", error);
    return NextResponse.json(
      { error: "Failed to start video generation" },
      { status: 500 }
    );
  }
}
