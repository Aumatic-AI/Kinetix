import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { generateOneShotPlan } from "@/services/ai/one-shot-video";
import { oneShotDuration } from "@/prompts/one-shot-video";

/**
 * The plan for a one-shot Meta Ads video (the concept and every spoken line),
 * for review in CreateAdModal before anything paid for the video starts. The
 * same prompt the background job uses on a retry. Saves nothing.
 */
export async function POST(request: Request) {
  try {
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const body = await request.json();

    if (!body.ideaPrompt || !String(body.ideaPrompt).trim()) {
      return NextResponse.json({ error: "Missing required field: ideaPrompt" }, { status: 400 });
    }
    if (!body.service) {
      return NextResponse.json({ error: "Missing required field: service" }, { status: 400 });
    }

    const { data: business } = await supabase.from("businesses").select("*").limit(1).single();
    if (!business) throw new Error("No business found");

    const character = body.character === "female" ? "female" : "male";
    const photo = character === "female" ? business.video_reference_female_url : business.video_reference_male_url;
    const plan = await generateOneShotPlan(business, {
      channel: "meta_ad",
      voice: true,
      ideaPrompt: String(body.ideaPrompt),
      service: String(body.service),
      duration: oneShotDuration(body.duration),
      aspectRatio: body.aspectRatio === "16:9" ? "16:9" : "9:16",
      character,
      videoStyle: body.videoStyle,
      videoMode: body.videoMode === "animated_poster" ? "animated_poster" : "live_action",
      language: body.language,
      hasCharacterPhoto: body.useReferencePhoto !== false && !!photo,
    });

    return NextResponse.json({ success: true, script: plan });
  } catch (error) {
    console.error("[META_ADS_ONE_SHOT_VIDEO_SCRIPT]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to write the video plan" }, { status: 500 });
  }
}
