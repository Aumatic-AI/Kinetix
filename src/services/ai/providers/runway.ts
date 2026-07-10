// Runway ML API REST Wrapper

export class RunwayService {
  private static API_BASE = "https://api.runwayml.com/v1";

  private static getHeaders() {
    const secret = process.env.RUNWAY_API_SECRET;
    if (!secret) throw new Error("RUNWAY_API_SECRET is missing");

    return {
      "Authorization": `Bearer ${secret}`,
      "X-Runway-Version": "2024-11-06",
      "Content-Type": "application/json"
    };
  }

  /**
   * Generate video using Gen-3 Alpha
   */
  static async generateGen3Video(prompt: string, imageUrl?: string) {
    try {
      // Runway Gen-3 endpoint
      const response = await fetch(`${this.API_BASE}/image_to_video`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          promptText: prompt,
          promptImage: imageUrl,
          model: "gen3a_turbo",
          seed: Math.floor(Math.random() * 4294967295),
          watermark: false,
        })
      });

      if (!response.ok) {
        throw new Error(`Runway API Error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Returns a task ID to poll for completion
      return data.id;
    } catch (error) {
      console.error("Runway Gen-3 Error:", error);
      throw error;
    }
  }
}
