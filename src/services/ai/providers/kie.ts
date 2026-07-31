import { env } from "@/config";

export class KieService {
  /**
   * Pings the API once for task status (Useful for Inngest step.sleep polling)
   */
  static async checkSingleTaskStatus(jobId: string): Promise<any> {
    const res = await fetch(`https://api.kie.ai/api/v1/jobs/recordInfo?taskId=${jobId}`, {
      headers: { Authorization: `Bearer ${env.KIE_API_KEY}` }
    });
    
    const response = await res.json();
    return response.data || {};
  }

  /**
   * Original inline polling implementation (keeps backwards compatibility)
   */
  private static async checkTaskStatus(jobId: string, maxRetries = 10, delayMs = 20000): Promise<any> {
    for (let i = 0; i < maxRetries; i++) {
      const status = await this.checkSingleTaskStatus(jobId);
      
      if (status.state === "success") {
        return status;
      } else if (status.state === "fail") {
        throw new Error(`Kie AI Task Failed: ${status.failMsg || status.failCode || "no reason given"}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    throw new Error(`Kie AI Task Timed Out after ${maxRetries} retries`);
  }

  /**
   * Triggers an Image Generation Task and returns the raw jobId.
   *
   * `referenceImageUrl`, when given, locks the generated subject's face/
   * identity to that photo via nano-banana's image-to-image conditioning
   * — the exact mechanism the proven legacy video pipelines used to keep
   * one consistent character across every scene of a video, instead of
   * each scene's text-to-image call improvising its own person.
   */
  static async createImageTask(prompt: string, imageSize: "9:16" | "4:5" | "16:9" | "1:1" = "4:5", referenceImageUrl?: string) {
    const finalPrompt = referenceImageUrl
      ? `${prompt} The subject face and identity must match the reference image exactly. Facial expression is critical and must match the emotion described in the prompt precisely.`
      : prompt;

    const input: Record<string, any> = {
      prompt: finalPrompt,
      output_format: "png",
      image_size: imageSize,
    };
    if (referenceImageUrl) input.image_urls = [referenceImageUrl];

    const response = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.KIE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/nano-banana",
        input,
      }),
    });

    if (!response.ok) {
      throw new Error(`Kie API Error: ${await response.text()}`);
    }

    const data = await response.json();
    const jobId = data.taskId || data.jobId || data.id || data.data?.taskId || data.data?.jobId || data.data?.id;
    
    if (!jobId) throw new Error(`No jobId returned from Kie. Response data: ${JSON.stringify(data)}`);
    return jobId;
  }

  /**
   * Triggers a Video Generation Task and returns the raw jobId
   */
  static async createVideoTask(prompt: string, imageUrls: string[], aspectRatio: string = "9:16", duration: string = "4") {
    const response = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.KIE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "bytedance/seedance-1.5-pro",
        input: {
          prompt,
          input_urls: imageUrls,
          aspect_ratio: aspectRatio,
          duration: duration,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Kie API Error: ${await response.text()}`);
    }

    const data = await response.json();
    const jobId = data.taskId || data.jobId || data.id || data.data?.taskId || data.data?.jobId || data.data?.id;

    if (!jobId) throw new Error(`No jobId returned from Kie. Response data: ${JSON.stringify(data)}`);
    return jobId;
  }

  static async generateImage(prompt: string, imageSize: "9:16" | "4:5" = "4:5") {
    const jobId = await this.createImageTask(prompt, imageSize);
    const result = await this.checkTaskStatus(jobId, 8, 20000);
    
    try {
      const resultJson = JSON.parse(result.resultJson);
      return resultJson.resultUrls?.[0] || resultJson.urls?.[0] || null;
    } catch (e) {
      console.error("Failed to parse Kie AI resultJson:", result.resultJson);
      return null;
    }
  }

  static async generateVideo(prompt: string, imageUrls: string[], aspectRatio: string = "9:16", duration: string = "4") {
    const jobId = await this.createVideoTask(prompt, imageUrls, aspectRatio, duration);
    const result = await this.checkTaskStatus(jobId, 12, 20000); // Video takes longer, so 12 retries (4 mins)
    
    try {
      const resultJson = JSON.parse(result.resultJson);
      return resultJson.resultUrls?.[0] || resultJson.urls?.[0] || null;
    } catch (e) {
      console.error("Failed to parse Kie AI resultJson for video:", result.resultJson);
      return null;
    }
  }
}
