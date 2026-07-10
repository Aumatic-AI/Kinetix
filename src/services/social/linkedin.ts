/**
 * LinkedIn REST API Service
 * Version: v2 (Rest.li)
 * Using the /ugcPosts endpoint for User Generated Content
 */

export interface LinkedInMediaAsset {
  originalUrl: string; // Direct link to image/video/document
  title?: string;
  description?: string;
  thumbnails?: string[]; // Array of thumbnail URLs (especially for videos)
}

export interface LinkedInPostOptions {
  accessToken: string;
  authorUrn: string; // The URN of the user or organization (e.g., "urn:li:person:12345")
  
  text: string;
  visibility: 'PUBLIC' | 'CONNECTIONS';
  
  // Media
  shareMediaCategory: 'NONE' | 'ARTICLE' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  media?: LinkedInMediaAsset[]; // Array supporting multi-image or single video/article
}

export class LinkedInService {
  private static API_BASE = "https://api.linkedin.com/v2";

  /**
   * Share a comprehensive post on LinkedIn
   * Supports Text, Links (Articles), Images, Videos, and PDF Documents
   */
  static async sharePost(options: LinkedInPostOptions) {
    try {
      const { accessToken, authorUrn, text, visibility, shareMediaCategory, media } = options;

      const body: any = {
        author: authorUrn.includes("urn:li:") ? authorUrn : `urn:li:person:${authorUrn}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: text
            },
            shareMediaCategory: shareMediaCategory
          }
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": visibility
        }
      };

      // Map media assets to the strictly required LinkedIn format
      if (media && media.length > 0 && shareMediaCategory !== 'NONE') {
        const linkedInMediaArray = media.map(asset => {
          const mediaObj: any = {
            status: "READY",
            originalUrl: asset.originalUrl
          };

          if (asset.title) {
            mediaObj.title = { text: asset.title };
          }
          if (asset.description) {
            mediaObj.description = { text: asset.description };
          }
          if (asset.thumbnails && asset.thumbnails.length > 0) {
            mediaObj.thumbnails = asset.thumbnails.map(thumb => ({ url: thumb }));
          }

          return mediaObj;
        });

        body.specificContent["com.linkedin.ugc.ShareContent"].media = linkedInMediaArray;
      }

      const response = await fetch(`${this.API_BASE}/ugcPosts`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0"
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`LinkedIn API Error: ${JSON.stringify(data)}`);
      }

      return data;
    } catch (error) {
      console.error("LinkedIn Share Error:", error);
      throw error;
    }
  }
}
