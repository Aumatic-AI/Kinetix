import { env } from "@/config";

/**
 * Seedance 2.5 on Kie ("bytedance/seedance-2-5"): one finished video from one
 * prompt, 4–30 seconds, with its own sound — speech with lip sync or
 * voice-over, music, sound effects, captions and on-screen words. Used by the
 * one-shot Meta Ads video pipeline (generate-one-shot-video-ad.ts); the
 * per-scene pipelines keep using KieService.createVideoTask (Seedance 2.0).
 *
 * Reference images (the main character's photo) are named in the prompt by
 * their order. Kie answers HTTP 200 even when it refuses a task, so
 * the body's own `code` is what decides success.
 */
export interface FullVideoRequest {
  prompt: string;
  referenceImageUrls: string[];
  durationSeconds: number;
  aspectRatio: "9:16" | "16:9";
  resolution: "480p" | "720p" | "1080p";
}

export class KieSeedanceFullService {
  static readonly MODEL = "bytedance/seedance-2-5";
  static readonly MIN_SECONDS = 4;
  static readonly MAX_SECONDS = 30;

  static async createFullVideoTask(req: FullVideoRequest): Promise<string> {
    const durationSeconds = Math.min(this.MAX_SECONDS, Math.max(this.MIN_SECONDS, Math.round(req.durationSeconds)));
    const requestBody = {
      model: this.MODEL,
      input: {
        prompt: req.prompt,
        ...(req.referenceImageUrls.length ? { reference_image_urls: req.referenceImageUrls.slice(0, 30) } : {}),
        duration: durationSeconds,
        aspect_ratio: req.aspectRatio,
        resolution: req.resolution,
        generate_audio: true,
      },
    };
    console.log("[KIE_REQUEST] POST createTask (seedance 2.5)", { ...requestBody, input: { ...requestBody.input, prompt: `${req.prompt.length} chars` } });

    const response = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.KIE_API_KEY}` },
      body: JSON.stringify(requestBody),
    });
    const text = await response.text();
    console.log("[KIE_RESPONSE] POST createTask (seedance 2.5)", response.status, text.slice(0, 500));

    let data: { code?: number; msg?: string; taskId?: string; data?: { taskId?: string } } | null = null;
    try {
      data = JSON.parse(text);
    } catch {
      /* not JSON — reported below */
    }
    if (!response.ok || !data || (data.code !== undefined && data.code !== 200)) {
      throw new Error(`Kie couldn't start the Seedance 2.5 video (${data?.code ?? response.status}): ${data?.msg || text.slice(0, 300) || "no reason given"}`);
    }
    const jobId = data.data?.taskId || data.taskId;
    if (!jobId) throw new Error(`Kie started the Seedance 2.5 video but sent no task id: ${text.slice(0, 300)}`);
    return jobId as string;
  }
}
