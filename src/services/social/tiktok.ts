/**
 * TikTok Content API Wrapper
 * Direct Post Integration (Two-Step Upload)
 */

export interface TikTokPostOptions {
  accessToken: string;
  videoBuffer: Buffer;
  
  title: string; // The caption/description on TikTok
  
  // Privacy
  privacyLevel?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
  
  // Feature Toggles
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
  
  // Auto Music
  autoAddMusic?: boolean;
}

export class TikTokService {
  private static API_BASE = "https://open.tiktokapis.com/v2";

  /**
   * Publish a video to TikTok using the Direct Post flow
   */
  static async publishVideo(options: TikTokPostOptions) {
    try {
      const { 
        accessToken, videoBuffer, title, 
        privacyLevel = 'PUBLIC_TO_EVERYONE',
        disableComment = false, disableDuet = false, disableStitch = false,
        autoAddMusic = false
      } = options;

      // 1. Initialize Upload to get the Upload URL
      const initPayload = {
        post_info: {
          title,
          privacy_level: privacyLevel,
          disable_comment: disableComment,
          disable_duet: disableDuet,
          disable_stitch: disableStitch,
          video_cover_timestamp_ms: 1000,
          auto_add_music: autoAddMusic
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: videoBuffer.length,
          chunk_size: videoBuffer.length,
          total_chunk_count: 1
        }
      };

      const initRes = await fetch(`${this.API_BASE}/post/publish/video/init/`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(initPayload)
      });

      const initData = await initRes.json();
      if (initData.error?.code !== 'ok') {
        throw new Error(`TikTok Init Error: ${JSON.stringify(initData)}`);
      }

      const uploadUrl = initData.data.upload_url;
      const publishId = initData.data.publish_id;

      // 2. Upload the Binary Video chunk
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Range": `bytes 0-${videoBuffer.length - 1}/${videoBuffer.length}`,
          "Content-Length": videoBuffer.length.toString(),
          "Content-Type": "video/mp4"
        },
        body: new Uint8Array(videoBuffer)
      });

      if (!uploadRes.ok) {
        throw new Error(`TikTok Binary Upload Error: ${uploadRes.statusText}`);
      }

      // Note: TikTok automatically publishes the video once all chunks are fully uploaded to the upload_url.
      // We just need to return the publish ID so the client can query its status later.
      return {
        success: true,
        publish_id: publishId
      };
      
    } catch (error) {
      console.error("TikTok Publish Error:", error);
      throw error;
    }
  }
}
