import { fal } from "@fal-ai/client";

export class FalService {
  /**
   * Generate an image using FLUX.1 Pro
   */
  static async generateFluxImage(prompt: string, imageSize: "square_hd" | "landscape_4_3" | "portrait_4_3" = "landscape_4_3") {
    try {
      const result: any = await fal.subscribe("fal-ai/flux-pro", {
        input: {
          prompt,
          image_size: imageSize,
          num_inference_steps: 28,
          guidance_scale: 3.5,
          num_images: 1,
          enable_safety_checker: true
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            console.log("Fal.ai generation in progress...", update.logs);
          }
        },
      });

      return result.images[0]?.url || null;
    } catch (error) {
      console.error("Fal.ai FLUX.1 Error:", error);
      throw error;
    }
  }
}
