import { MetaSocialService } from "./meta";
import { LinkedInService } from "./linkedin";
import { TwitterService } from "./twitter";
import { TikTokService } from "./tiktok";
import { YouTubeService } from "./youtube";

interface PublishContext {
  platform: string;
  externalId: string;
  accessToken: string;
  caption: string | null;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch media for publishing: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** Dispatches a single social_posts row to the right platform's real
 * publish API. Each platform needs a different shape (a page token +
 * public URL for Meta, a raw file buffer for TikTok/YouTube/X) — this is
 * the one place that translates our generic {caption, mediaUrl,
 * mediaType} into each wrapper's exact expected input. */
export async function publishToPlatform(ctx: PublishContext): Promise<any> {
  const { platform, externalId, accessToken, caption, mediaUrl, mediaType } = ctx;
  if (!accessToken) throw new Error("No access token stored for this connection — reconnect it in Connected Accounts.");

  switch (platform) {
    case "facebook": {
      if (mediaType === "image" && mediaUrl) {
        return MetaSocialService.publishFacebookPhoto({ pageId: externalId, pageAccessToken: accessToken, imageUrl: mediaUrl, caption: caption || undefined });
      }
      if (mediaType === "video" && mediaUrl) {
        return MetaSocialService.publishFacebookVideo({ pageId: externalId, pageAccessToken: accessToken, videoUrl: mediaUrl, description: caption || undefined });
      }
      return MetaSocialService.publishFacebookPagePost({ pageId: externalId, pageAccessToken: accessToken, message: caption || undefined });
    }
    case "instagram": {
      if (!mediaUrl || !mediaType) throw new Error("Instagram requires an image or video");
      return MetaSocialService.publishInstagramPost({
        igUserId: externalId,
        userAccessToken: accessToken,
        caption: caption || undefined,
        mediaType: mediaType === "video" ? "VIDEO" : "IMAGE",
        imageUrl: mediaType === "image" ? mediaUrl : undefined,
        videoUrl: mediaType === "video" ? mediaUrl : undefined,
      });
    }
    case "linkedin": {
      return LinkedInService.sharePost({
        accessToken,
        authorUrn: externalId,
        text: caption || "",
        visibility: "PUBLIC",
        shareMediaCategory: mediaUrl ? (mediaType === "video" ? "VIDEO" : "IMAGE") : "NONE",
        media: mediaUrl ? [{ originalUrl: mediaUrl }] : undefined,
      });
    }
    case "x": {
      const media = mediaUrl
        ? [{ mediaBuffer: await fetchBuffer(mediaUrl), mimeType: (mediaType === "video" ? "video/mp4" : "image/jpeg") as "video/mp4" | "image/jpeg" }]
        : undefined;
      return TwitterService.publishTweet({ accessToken, accessTokenSecret: "", text: caption || "", media });
    }
    case "tiktok": {
      if (!mediaUrl) throw new Error("TikTok requires a video");
      return TikTokService.publishVideo({ accessToken, videoBuffer: await fetchBuffer(mediaUrl), title: caption || "" });
    }
    case "youtube": {
      if (!mediaUrl) throw new Error("YouTube requires a video");
      return YouTubeService.uploadVideo({ accessToken, videoBuffer: await fetchBuffer(mediaUrl), title: (caption || "Untitled").slice(0, 100), description: caption || "" });
    }
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
