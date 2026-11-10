import { NextResponse } from "next/server";
import { inngest } from "@/services/inngest/client";
import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { SUPPORTED_UPLOAD_POST_PLATFORMS } from "@/services/upload-post";
import { oneShotDuration } from "@/prompts/one-shot-video";

const VALID_PLATFORMS: string[] = SUPPORTED_UPLOAD_POST_PLATFORMS;

/**
 * Starts a one-shot social video (Seedance 2.5, 20–30 seconds) from the plan
 * the user approved in CreatePostModal. Makes the tracking social_posts rows
 * (one per platform, or one with no platform for the Media Library) and sends
 * social/generate-one-shot-video
 * (src/services/inngest/social/generate-social-one-shot-video.ts).
 *
 * The inputs and the approved plan are kept on generation_inputs with
 * pipeline "one_shot", so a retry (POST /api/social/posts/retry) makes the
 * same video through this pipeline again.
 */
export async function POST(request: Request) {
  try {
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const body = await request.json();

    if (!body.ideaPrompt || !String(body.ideaPrompt).trim()) {
      return NextResponse.json({ error: "Missing required field: ideaPrompt" }, { status: 400 });
    }
    const script: string[] = Array.isArray(body.script?.script) ? body.script.script.map((l: unknown) => String(l).trim()).filter(Boolean) : [];
    const concept = String(body.script?.concept || "").trim();
    if (!script.length && !concept) {
      return NextResponse.json({ error: "Missing the approved plan" }, { status: 400 });
    }

    // Platforms are optional — the video can go to the Media Library only
    const platforms: string[] = Array.isArray(body.platforms) ? body.platforms : [];
    const invalid = platforms.filter((p) => !VALID_PLATFORMS.includes(p));
    if (invalid.length) {
      return NextResponse.json({ error: `Unknown platform(s): ${invalid.join(", ")}` }, { status: 400 });
    }

    const { data: business } = await supabase.from("businesses").select("id").limit(1).single();
    if (!business) throw new Error("No business found");

    let connections: { id: string; platform: string }[] = [];
    if (platforms.length) {
      const { data } = await supabase
        .from("platform_connections")
        .select("id, platform")
        .eq("business_id", business.id)
        .eq("account_kind", "upload_post")
        .eq("status", "connected")
        .in("platform", platforms as Database["public"]["Enums"]["platform_type"][]);
      connections = data || [];
      const connected = new Set(connections.map((c) => c.platform as string));
      const notConnected = platforms.filter((p) => !connected.has(p));
      if (notConnected.length) {
        return NextResponse.json({ error: `Not connected yet: ${notConnected.join(", ")}. Connect them first in Connected Accounts.` }, { status: 400 });
      }
    }

    const inputs = {
      pipeline: "one_shot",
      format: "video",
      ideaPrompt: String(body.ideaPrompt),
      aspectRatio: body.aspectRatio === "16:9" ? "16:9" : "9:16",
      duration: oneShotDuration(body.duration),
      character: body.character === "female" ? "female" : "male",
      service: body.service,
      language: body.language || "English",
      videoStyle: body.videoStyle,
      videoMode: body.videoMode === "animated_poster" ? "animated_poster" : "live_action",
      audioStyle: body.audioStyle === "No Voice" ? "No Voice" : "Voiceover",
      script: { concept, script },
    };

    const base = { business_id: business.id, status: "generating" as const, format: "video" as const, idea_prompt: inputs.ideaPrompt, generation_inputs: inputs };
    const rows: Database["public"]["Tables"]["social_posts"]["Insert"][] = platforms.length
      ? platforms.map((platform) => ({ ...base, connection_id: connections.find((c) => (c.platform as string) === platform)!.id as string | null }))
      : [{ ...base, connection_id: null }];

    const { data: createdPosts, error } = await supabase.from("social_posts").insert(rows).select("id");
    if (error || !createdPosts) throw new Error(error?.message || "Failed to create post records");
    const socialPostIds: string[] = createdPosts.map((p) => p.id);

    await inngest.send({
      name: "social/generate-one-shot-video",
      data: { ...inputs, businessId: business.id, platforms, socialPostIds },
    });

    return NextResponse.json({
      success: true,
      socialPostIds,
      message: platforms.length ? "Video generation started" : "Video generation started — it'll land in your Media Library",
    });
  } catch (error) {
    console.error("[SOCIAL_POSTS_ONE_SHOT_VIDEO]", error);
    return NextResponse.json({ error: "Failed to start video generation" }, { status: 500 });
  }
}
