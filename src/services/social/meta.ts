/**
 * Meta Graph API Service (Facebook Pages & Instagram Business)
 * Version: v19.0 / v20.0
 */

export interface InstagramPostOptions {
  igUserId: string;
  userAccessToken: string;
  caption?: string;

  // Media Options
  mediaType: "IMAGE" | "VIDEO" | "REELS" | "STORIES" | "CAROUSEL";
  imageUrl?: string;
  videoUrl?: string;
  children?: string[]; // Array of container IDs for carousels

  // Video specific
  thumbOffset?: number; // Cover frame position in milliseconds

  // Tags & Location
  locationId?: string; // Facebook Page ID of the location
  userTags?: Array<{ username: string; x: number; y: number }>;

  // Reels specific
  shareToFeed?: boolean;
  audioName?: string;

  // Collabs
  collaborators?: string[];
}

export interface FacebookPostOptions {
  pageId: string;
  pageAccessToken: string;

  message?: string;
  link?: string;

  // Media
  published?: boolean; // If false, the post is saved as a draft or scheduled
  scheduledPublishTime?: number; // Unix timestamp

  // Tags
  tags?: string[]; // Array of page IDs
  place?: string; // Page ID of a location
}

export class MetaSocialService {
  private static GRAPH_URL = "https://graph.facebook.com/v19.0";

  // ==========================================
  // INSTAGRAM BUSINESS API
  // ==========================================

  /**
   * Fetch connected Instagram accounts for a given Facebook page
   */
  static async getConnectedAccounts(pageId: string, pageAccessToken: string) {
    try {
      const response = await fetch(
        `${this.GRAPH_URL}/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`,
      );
      if (!response.ok) throw new Error("Failed to fetch Instagram accounts");
      return await response.json();
    } catch (error) {
      console.error("Meta Graph API Error (IG Connected Accounts):", error);
      throw error;
    }
  }

  /**
   * Publish a post/reel/story to Instagram
   * This is a 2-step process: 1. Create Media Container -> 2. Publish Container
   */
  static async publishInstagramPost(options: InstagramPostOptions) {
    try {
      const {
        igUserId,
        userAccessToken,
        caption,
        mediaType,
        imageUrl,
        videoUrl,
        children,
        thumbOffset,
        locationId,
        userTags,
        shareToFeed,
        audioName,
        collaborators,
      } = options;

      // 1. Build Container Request URL
      const containerParams = new URLSearchParams();
      containerParams.append("access_token", userAccessToken);

      if (caption) containerParams.append("caption", caption);
      if (locationId) containerParams.append("location_id", locationId);
      if (userTags && userTags.length > 0)
        containerParams.append("user_tags", JSON.stringify(userTags));
      if (collaborators && collaborators.length > 0)
        containerParams.append("collaborators", JSON.stringify(collaborators));

      switch (mediaType) {
        case "IMAGE":
          if (!imageUrl)
            throw new Error("imageUrl is required for IMAGE mediaType");
          containerParams.append("image_url", imageUrl);
          break;
        case "VIDEO":
          if (!videoUrl)
            throw new Error("videoUrl is required for VIDEO mediaType");
          containerParams.append("media_type", "VIDEO");
          containerParams.append("video_url", videoUrl);
          if (thumbOffset !== undefined)
            containerParams.append("thumb_offset", thumbOffset.toString());
          break;
        case "REELS":
          if (!videoUrl)
            throw new Error("videoUrl is required for REELS mediaType");
          containerParams.append("media_type", "REELS");
          containerParams.append("video_url", videoUrl);
          if (shareToFeed !== undefined)
            containerParams.append("share_to_feed", shareToFeed.toString());
          if (audioName) containerParams.append("audio_name", audioName);
          if (thumbOffset !== undefined)
            containerParams.append("thumb_offset", thumbOffset.toString());
          break;
        case "STORIES":
          if (imageUrl) {
            containerParams.append("media_type", "STORIES");
            containerParams.append("image_url", imageUrl);
          } else if (videoUrl) {
            containerParams.append("media_type", "STORIES");
            containerParams.append("video_url", videoUrl);
          } else {
            throw new Error(
              "imageUrl or videoUrl is required for STORIES mediaType",
            );
          }
          break;
        case "CAROUSEL":
          if (!children || children.length === 0)
            throw new Error("children container IDs required for CAROUSEL");
          containerParams.append("media_type", "CAROUSEL");
          containerParams.append("children", children.join(","));
          break;
      }

      // Step 1: Create Container
      const containerRes = await fetch(`${this.GRAPH_URL}/${igUserId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: containerParams.toString(),
      });
      const containerData = await containerRes.json();

      if (!containerData.id) {
        throw new Error(
          `Failed to create IG media container: ${JSON.stringify(containerData)}`,
        );
      }

      // Step 2: Publish Container
      const publishParams = new URLSearchParams();
      publishParams.append("creation_id", containerData.id);
      publishParams.append("access_token", userAccessToken);

      const publishRes = await fetch(
        `${this.GRAPH_URL}/${igUserId}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: publishParams.toString(),
        },
      );

      const publishData = await publishRes.json();
      if (!publishRes.ok) {
        throw new Error(
          `Failed to publish IG media: ${JSON.stringify(publishData)}`,
        );
      }

      return publishData;
    } catch (error) {
      console.error("Instagram Publish Error:", error);
      throw error;
    }
  }

  // ==========================================
  // FACEBOOK PAGE API
  // ==========================================

  /**
   * Publish a text, link, or media post to a Facebook Page Feed
   */
  static async publishFacebookPagePost(options: FacebookPostOptions) {
    try {
      const {
        pageId,
        pageAccessToken,
        message,
        link,
        published,
        scheduledPublishTime,
        tags,
        place,
      } = options;

      const params = new URLSearchParams();
      params.append("access_token", pageAccessToken);

      if (message) params.append("message", message);
      if (link) params.append("link", link);
      if (place) params.append("place", place);
      if (tags && tags.length > 0) params.append("tags", tags.join(","));

      if (published !== undefined)
        params.append("published", published.toString());
      if (scheduledPublishTime !== undefined) {
        params.append(
          "scheduled_publish_time",
          scheduledPublishTime.toString(),
        );
      }

      const response = await fetch(`${this.GRAPH_URL}/${pageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Facebook Publish Error: ${JSON.stringify(data)}`);
      }

      return data;
    } catch (error) {
      console.error("Facebook Publish Error:", error);
      throw error;
    }
  }
}
