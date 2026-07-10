/**
 * YouTube Data API v3
 * Uploads Videos and Shorts
 */

export interface YouTubeUploadOptions {
  accessToken: string;
  videoBuffer: Buffer; // The raw binary of the video
  
  title: string;
  description?: string;
  tags?: string[];
  
  // Privacy and Category
  privacyStatus?: 'public' | 'private' | 'unlisted';
  categoryId?: string; // e.g., "22" for People & Blogs, "20" for Gaming
  madeForKids?: boolean; // COPPA compliance
}

export class YouTubeService {
  private static UPLOAD_API = "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status";

  /**
   * Upload a video or Short to YouTube via a Multipart form upload.
   */
  static async uploadVideo(options: YouTubeUploadOptions) {
    try {
      const { 
        accessToken, videoBuffer, title, description, tags, 
        privacyStatus = 'private', categoryId = "22", madeForKids = false 
      } = options;

      // 1. Build the Metadata JSON
      const metadata = {
        snippet: {
          title,
          description: description || "",
          tags: tags || [],
          categoryId
        },
        status: {
          privacyStatus,
          selfDeclaredMadeForKids: madeForKids
        }
      };

      // 2. Build the Multipart Form Data manually (using FormData in Node >= 18 is possible, 
      // but building a custom boundary buffer is more robust for binary files without a dedicated file wrapper).
      const boundary = `----YouTubeUploadBoundary${Date.now()}`;
      
      const metadataPart = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify(metadata) + `\r\n`
      );

      const mediaPartHeader = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Type: video/mp4\r\n\r\n`
      );

      const footerPart = Buffer.from(`\r\n--${boundary}--`);

      // Combine parts into the final payload buffer
      const payload = Buffer.concat([metadataPart, mediaPartHeader, videoBuffer, footerPart]);

      // 3. Execute the Multipart Upload
      const response = await fetch(this.UPLOAD_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': payload.length.toString()
        },
        body: new Uint8Array(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`YouTube Upload Error: ${JSON.stringify(data)}`);
      }

      return data;
    } catch (error) {
      console.error("YouTube Upload Failed:", error);
      throw error;
    }
  }
}
