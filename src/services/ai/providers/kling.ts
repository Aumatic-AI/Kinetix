// Kling API uses JWT authentication based on AccessKey and SecretKey
// Currently this is a REST wrapper since there is no official Node SDK.

export class KlingService {
  private static API_BASE = "https://open.klingai.com/v1";

  /**
   * Temporary helper to get the JWT token (Placeholder implementation)
   * In a real implementation, you would generate a JWT using your AccessKey and SecretKey
   */
  private static async getAuthToken(): Promise<string> {
    const apiKey = process.env.KLING_API_KEY;
    if (!apiKey) throw new Error("KLING_API_KEY is missing");
    
    // Normally you'd sign a JWT here using a library like `jsonwebtoken`
    // For now, we return the placeholder or the direct API key if supported directly.
    return apiKey;
  }

  /**
   * Generate a video from text using Kling API
   */
  static async textToVideo(prompt: string) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${this.API_BASE}/videos/text2video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt,
          model_name: "kling-v1",
          mode: "standard",
          duration: 5
        })
      });

      if (!response.ok) {
        throw new Error(`Kling API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Kling Text-to-Video Error:", error);
      throw error;
    }
  }

  /**
   * Generate a video from an image using Kling API
   */
  static async imageToVideo(imageUrl: string, prompt: string) {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${this.API_BASE}/videos/image2video`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          image_url: imageUrl,
          prompt,
          model_name: "kling-v1",
          mode: "standard",
          duration: 5
        })
      });

      if (!response.ok) {
        throw new Error(`Kling API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Kling Image-to-Video Error:", error);
      throw error;
    }
  }
}
