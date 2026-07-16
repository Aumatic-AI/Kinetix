import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import { publishToPlatform } from "@/services/social/publish";

export async function POST(request: Request) {
  try {
    const supabase = (await createClient()) as SupabaseClient<Database>;
    const body = await request.json();

    if (!Array.isArray(body.socialPostIds) || !body.socialPostIds.length) {
      return NextResponse.json({ error: "Missing required field: socialPostIds" }, { status: 400 });
    }

    const { data: posts } = await supabase
      .from("social_posts")
      .select("id, caption, format, media_asset_id, connection_id, platform_connections(platform, external_id, access_token_ref)")
      .in("id", body.socialPostIds);

    if (!posts || !posts.length) throw new Error("Posts not found");

    const results: { id: string; success: boolean; error?: string }[] = [];

    // Each row publishes independently — one platform failing must not
    // block or roll back the others (see docs/modules/social_media.md).
    for (const post of posts as any[]) {
      const connection = post.platform_connections;
      try {
        if (!connection) throw new Error("No connected account for this platform");

        let mediaUrl: string | null = null;
        let mediaType: "image" | "video" | null = null;
        if (post.media_asset_id) {
          const { data: asset } = await supabase.from("media_assets").select("type, metadata").eq("id", post.media_asset_id).single();
          mediaUrl = (asset?.metadata as any)?.publicUrl || null;
          mediaType = asset?.type === "video" ? "video" : asset?.type === "image" ? "image" : null;
        }

        await publishToPlatform({
          platform: connection.platform,
          externalId: connection.external_id,
          accessToken: connection.access_token_ref || "",
          caption: post.caption,
          mediaUrl,
          mediaType,
        });

        await supabase.from("social_posts").update({ status: "published", published_at: new Date().toISOString(), error_message: null }).eq("id", post.id);
        results.push({ id: post.id, success: true });
      } catch (e: any) {
        console.error(`[SOCIAL_PUBLISH_${post.id}]`, e);
        await supabase.from("social_posts").update({ status: "failed", error_message: String(e.message || e).slice(0, 500) }).eq("id", post.id);
        results.push({ id: post.id, success: false, error: e.message });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("[SOCIAL_POSTS_PUBLISH]", error);
    return NextResponse.json({ error: "Failed to publish posts" }, { status: 500 });
  }
}
