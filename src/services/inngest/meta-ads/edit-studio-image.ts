import { inngest } from "../client";
import { aiOrchestrator } from "../../ai/orchestrator";
import { createClient } from "@supabase/supabase-js";
import { getAdEditPrompt } from "../../../prompts/meta-ads/ad-studio/edit";
import { composeCreativeImage } from "../../creative-render/composeCreativeImage";
import { env } from "@/config";

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY!
);

export const editStudioImage = inngest.createFunction(
  {
    id: "edit-studio-image",
    triggers: [{ event: "meta-ads/edit-studio-image" }]
  },
  async ({ event, step }) => {
    const { sessionId, businessId, creativeId, rawImageUrl, overlayText, aspectRatio, editInstruction } = event.data;

    if (!sessionId || !creativeId || !rawImageUrl) {
      throw new Error("sessionId, creativeId and rawImageUrl are required");
    }

    try {
      const editPrompt = getAdEditPrompt(editInstruction);

      const jobId = await step.run("trigger-edit", async () => {
        return await aiOrchestrator.createImageTask(editPrompt, aspectRatio, rawImageUrl, "reference");
      });

      let newRawImageUrl: string | null = null;
      let attempts = 0;
      const MAX_ATTEMPTS = 24;

      while (!newRawImageUrl && attempts < MAX_ATTEMPTS) {
        await step.sleep(`wait-edit-${attempts}`, attempts === 0 ? "8s" : "6s");

        const status = await step.run(`check-edit-status-${attempts}`, async () => {
          return await aiOrchestrator.checkTaskStatus(jobId);
        });

        if (status.state === "success") {
          try {
            const resultJson = JSON.parse(status.resultJson);
            newRawImageUrl = resultJson.resultUrls?.[0] || resultJson.urls?.[0] || null;
          } catch {
            console.error("Failed to parse Kie AI resultJson:", status.resultJson);
            newRawImageUrl = null;
          }
        } else if (status.state === "fail") {
          throw new Error(`Kie AI Edit Failed: ${status.failMsg || status.failCode || "no reason given"}`);
        }
        attempts++;
      }

      if (!newRawImageUrl) throw new Error("Kie AI Edit Timed Out");

      const finalImageUrl = await step.run("compose-final-image", async () => {
        return await composeCreativeImage({
          businessId,
          photoUrl: newRawImageUrl as string,
          overlayText,
          aspectRatio,
        });
      });

      await step.run("finalize", async () => {
        const { data: creative } = await supabase
          .from("meta_ad_creatives")
          .select("media_urls, ad_script, revision_history")
          .eq("id", creativeId)
          .single();

        const priorHistory = Array.isArray(creative?.revision_history) ? creative.revision_history : [];
        const nextHistory = [
          ...priorHistory,
          {
            prior_media_urls: creative?.media_urls ?? [],
            action: `chat edit: ${editInstruction}`,
            at: new Date().toISOString(),
          },
        ];

        await supabase
          .from("meta_ad_creatives")
          .update({ media_urls: [finalImageUrl], revision_history: nextHistory })
          .eq("id", creativeId);

        await supabase
          .from("studio_sessions")
          .update({ status: "reviewing", raw_image_url: newRawImageUrl })
          .eq("id", sessionId);

        const adScript = (creative?.ad_script as { headline?: string; primary_text?: string } | null) || {};
        await supabase.from("studio_messages").insert({
          session_id: sessionId,
          role: "assistant",
          kind: "image",
          payload: { imageUrl: finalImageUrl, headline: adScript.headline, primary_text: adScript.primary_text },
        });
      });

      return { success: true, creativeId };
    } catch (e: any) {
      await supabase.from("studio_messages").insert({
        session_id: sessionId,
        role: "assistant",
        kind: "text",
        content: "That edit didn't go through. Please try describing the change again.",
      });
      throw e;
    }
  }
);
