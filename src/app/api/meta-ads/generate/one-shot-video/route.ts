import { NextResponse } from "next/server";
import { inngest } from "@/services/inngest/client";
import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { oneShotDuration } from "@/prompts/one-shot-video";

/**
 * Starts a one-shot Meta Ads video (Seedance 2.5, 20–30 seconds) from the plan
 * the user approved in CreateAdModal: sends meta-ads/generate-one-shot-video
 * (src/services/inngest/meta-ads/generate-one-shot-video-ad.ts), then makes
 * the meta_ad_creatives row it fills in. A retry (POST /api/meta-ads/retry)
 * goes through the same pipeline.
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
    const script: string[] = Array.isArray(body.script?.script) ? body.script.script.map((l: unknown) => String(l).trim()).filter(Boolean) : [];
    if (!script.length) {
      return NextResponse.json({ error: "Missing the approved script" }, { status: 400 });
    }

    const { data: business } = await supabase.from("businesses").select("id").limit(1).single();
    if (!business) throw new Error("No business found");

    const inputs = {
      ideaPrompt: String(body.ideaPrompt),
      service: String(body.service),
      duration: oneShotDuration(body.duration),
      aspectRatio: body.aspectRatio === "16:9" ? "16:9" : "9:16",
      character: body.character === "female" ? "female" : "male",
      videoStyle: body.videoStyle,
      videoMode: body.videoMode === "animated_poster" ? "animated_poster" : "live_action",
      language: body.language || "English",
      useReferencePhoto: body.useReferencePhoto !== false,
    };

    // The job queue must accept the job before the creative is made, or a down Inngest server would
    // leave a "pending" creative that never finishes
    const creativeId = crypto.randomUUID();
    try {
      await inngest.send({
        name: "meta-ads/generate-one-shot-video",
        data: { ...inputs, creativeId, businessId: business.id, script: { concept: String(body.script?.concept || ""), script } },
      });
    } catch (sendError) {
      console.error("[META_ADS_ONE_SHOT_VIDEO] Inngest unreachable", sendError);
      return NextResponse.json({ error: "Background job queue is not reachable — make sure the Inngest dev server is running." }, { status: 503 });
    }

    const { data: creative, error } = await supabase
      .from("meta_ad_creatives")
      .insert({
        id: creativeId,
        business_id: business.id,
        type: "video",
        idea_prompt: inputs.ideaPrompt,
        service: inputs.service,
        duration: `${inputs.duration} seconds`,
        video_style: inputs.videoStyle,
        video_mode: inputs.videoMode,
        aspect_ratio: inputs.aspectRatio,
        // The voice is Seedance's own, so there's no voice id; "Voiceover" keeps the column meaningful
        audio_style: "Voiceover",
        character_type: inputs.character,
        language: inputs.language,
        // The approved plan, kept so a retry makes the same video; the job replaces it with the full result
        ad_script: { pipeline: "one_shot", concept: String(body.script?.concept || ""), script },
        status: "pending",
      })
      .select()
      .single();
    if (error || !creative) throw new Error("Failed to create record");

    return NextResponse.json({ success: true, data: creative, message: "Video generation started" });
  } catch (error) {
    console.error("[META_ADS_ONE_SHOT_VIDEO]", error);
    return NextResponse.json({ error: "Failed to start video generation" }, { status: 500 });
  }
}
