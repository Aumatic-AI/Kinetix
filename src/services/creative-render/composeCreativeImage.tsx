import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/config";

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY!);

/**
 * Deterministically turns a clean AI photo into the final ad creative —
 * a dark-to-transparent scrim with a short hook line over the bottom third,
 * never a solid box or baked-in-by-AI text. This is what makes the result
 * look like a real designed ad instead of a plain photo with words on it.
 * No logo/brand-color step: `businesses.logo_asset_id` and
 * `business_colors` have no Settings UI to set them yet, so there's
 * nothing real to composite in — the scrim technique itself doesn't need
 * a brand color to work.
 */

const DIMENSIONS: Record<"1:1" | "4:5" | "9:16" | "16:9", { width: number; height: number }> = {
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
};

export interface ComposeCreativeImageInput {
  businessId: string;
  photoUrl: string;
  overlayText?: string | null;
  aspectRatio: "1:1" | "4:5" | "9:16" | "16:9";
}

export async function composeCreativeImage(input: ComposeCreativeImageInput): Promise<string> {
  if (!input.overlayText) return input.photoUrl;

  const { width, height } = DIMENSIONS[input.aspectRatio];
  const bottomSafeMargin = Math.round(height * (input.aspectRatio === "9:16" ? 0.15 : 0.1));
  const sideMargin = Math.round(width * 0.08);
  const scrimHeight = Math.round(height * 0.32);

  const image = new ImageResponse(
    (
      <div style={{ width, height, display: "flex", position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- satori's own JSX subset for next/og, not a real DOM <img> */}
        <img
          src={input.photoUrl}
          width={width}
          height={height}
          style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: scrimHeight,
            display: "flex",
            alignItems: "flex-end",
            paddingLeft: sideMargin,
            paddingRight: sideMargin,
            paddingBottom: bottomSafeMargin,
            background: "linear-gradient(to top, rgba(10,10,12,0.78) 0%, rgba(10,10,12,0) 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              color: "#ffffff",
              fontSize: Math.round(width * 0.065),
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
            }}
          >
            {input.overlayText}
          </div>
        </div>
      </div>
    ),
    { width, height }
  );

  const buffer = Buffer.from(await image.arrayBuffer());
  const path = `${input.businessId}/studio/${crypto.randomUUID()}.png`;

  const { error } = await supabase.storage.from("business_media").upload(path, buffer, {
    contentType: "image/png",
    upsert: false,
  });
  if (error) throw new Error(`Failed to upload composited image: ${error.message}`);

  const { data } = supabase.storage.from("business_media").getPublicUrl(path);
  return data.publicUrl;
}
