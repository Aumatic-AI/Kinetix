/**
 * X (Twitter) API Wrapper
 * Utilizes v2 for Tweeting and v1.1 for Media Uploads
 */

export interface TwitterMediaParams {
  mediaBuffer: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'video/mp4';
}

export interface TwitterPostOptions {
  accessToken: string;
  accessTokenSecret: string; // If using OAuth 1.0a, otherwise ignored if Bearer
  
  text: string;
  media?: TwitterMediaParams[];
  
  // Threads / Replies
  inReplyToTweetId?: string;
  
  // Settings
  replySettings?: 'everyone' | 'mentionedUsers' | 'following';
  
  // Polls
  pollOptions?: string[]; // Array of up to 4 choices
  pollDurationMinutes?: number; // 5 to 10080
}

export class TwitterService {
  private static API_V2 = "https://api.twitter.com/2";
  private static UPLOAD_V1 = "https://upload.twitter.com/1.1";

  /**
   * Helper to upload media via v1.1 (Required before tweeting via v2)
   * Note: In a production OAuth environment, these requests must be signed with OAuth 1.0a HMAC-SHA1.
   * For simplicity, this wrapper assumes a Bearer token is valid or relies on an external OAuth client setup.
   */
  private static async uploadMedia(media: TwitterMediaParams, token: string): Promise<string> {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(media.mediaBuffer)], { type: media.mimeType });
    formData.append("media", blob);

    const response = await fetch(`${this.UPLOAD_V1}/media/upload.json`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}` // Or OAuth 1.0a Authorization header
      },
      body: formData
    });

    const data = await response.json();
    if (!data.media_id_string) throw new Error("Twitter media upload failed");
    
    return data.media_id_string;
  }

  /**
   * Publish a Tweet or Thread
   */
  static async publishTweet(options: TwitterPostOptions) {
    try {
      const { text, media, inReplyToTweetId, replySettings, pollOptions, pollDurationMinutes, accessToken } = options;

      // 1. Upload Media (if any)
      const mediaIds: string[] = [];
      if (media && media.length > 0) {
        for (const item of media) {
          const id = await this.uploadMedia(item, accessToken);
          mediaIds.push(id);
        }
      }

      // 2. Build Tweet Payload
      const payload: any = { text };

      if (mediaIds.length > 0) {
        payload.media = { media_ids: mediaIds };
      }

      if (inReplyToTweetId) {
        payload.reply = { in_reply_to_tweet_id: inReplyToTweetId };
      }

      if (replySettings) {
        payload.reply_settings = replySettings;
      }

      if (pollOptions && pollOptions.length > 0) {
        payload.poll = {
          options: pollOptions,
          duration_minutes: pollDurationMinutes || 1440
        };
      }

      // 3. Execute Publish
      const response = await fetch(`${this.API_V2}/tweets`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`, // Or OAuth 1.0a
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Twitter Publish Error: ${JSON.stringify(data)}`);
      }

      return data;
    } catch (error) {
      console.error("Twitter Publish Error:", error);
      throw error;
    }
  }
}
