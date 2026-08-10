import { inngest } from "../client";
import { aiOrchestrator } from "../../ai/orchestrator";
import { createClient } from "@supabase/supabase-js";
import { getStudioAdPrompt } from "../../../prompts/meta-ads/ad-studio/generate";
import { composeCreativeImage } from "../../creative-render/composeCreativeImage";
import { env } from "@/config";

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY!
);

export const generateStudioImage = inngest.createFunction(
  {
    id: "generate-studio-image",
    triggers: [{ event: "meta-ads/generate-studio-image" }]
  },
  async ({ event, step }) => {
    const { sessionId, businessId, creativeId, service, initialIdea, qaBrief, referenceImageUrl, aspectRatio } = event.data;

    if (!sessionId || !creativeId) throw new Error("sessionId and creativeId are required");

    try {
      const intelligence = await step.run("fetch-intelligence", async () => {
        const { data: businessData } = await supabase
          .from("businesses")
          .select("*")
          .eq("id", businessId)
          .single();

        const { data: compData } = await supabase
          .from("ad_analysis_reports")
          .select("*")
          .eq("business_id", businessId)
          .eq("report_type", "competitor")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const { data: selfData } = await supabase
          .from("ad_analysis_reports")
          .select("*")
          .eq("business_id", businessId)
          .eq("report_type", "self")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        return {
          business: businessData || {},
          competitor: compData?.insights || {},
          self: selfData?.insights || {}
        };
      });

      const prompt = getStudioAdPrompt(intelligence, {
        service,
        initialIdea,
        qaBrief: qaBrief || [],
        hasReferenceImage: !!referenceImageUrl,
        aspectRatio,
      });

      const scriptJson = await step.run("generate-script", async () => {
        const response = await aiOrchestrator.executeTask("text", prompt, "openai");
        const jsonStr = (response as string).replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(jsonStr);
      });

      const jobId = await step.run("trigger-image", async () => {
        return await aiOrchestrator.createImageTask(scriptJson.visual_prompt, aspectRatio, referenceImageUrl, "reference");
      });

      let rawImageUrl: string | null = null;
      let attempts = 0;
      const MAX_ATTEMPTS = 24;

      while (!rawImageUrl && attempts < MAX_ATTEMPTS) {
        await step.sleep(`wait-image-${attempts}`, attempts === 0 ? "8s" : "6s");

        const status = await step.run(`check-image-status-${attempts}`, async () => {
          return await aiOrchestrator.checkTaskStatus(jobId);
        });

        if (status.state === "success") {
          try {
            const resultJson = JSON.parse(status.resultJson);
            rawImageUrl = resultJson.resultUrls?.[0] || resultJson.urls?.[0] || null;
          } catch {
            console.error("Failed to parse Kie AI resultJson:", status.resultJson);
            rawImageUrl = null;
          }
        } else if (status.state === "fail") {
          throw new Error(`Kie AI Image Generation Failed: ${status.failMsg || status.failCode || "no reason given"}`);
        }
        attempts++;
      }

      if (!rawImageUrl) throw new Error("Kie AI Image Generation Timed Out");

      const finalImageUrl = await step.run("compose-final-image", async () => {
        return await composeCreativeImage({
          businessId,
          photoUrl: rawImageUrl as string,
          overlayText: scriptJson.overlay_text,
          aspectRatio,
        });
      });

      await step.run("finalize", async () => {
        await supabase
          .from("meta_ad_creatives")
          .update({
            status: "review",
            ad_script: { headline: scriptJson.headline, primary_text: scriptJson.primary_text, overlay_text: scriptJson.overlay_text },
            media_urls: [finalImageUrl],
          })
          .eq("id", creativeId);

        await supabase
          .from("studio_sessions")
          .update({ status: "reviewing", raw_image_url: rawImageUrl })
          .eq("id", sessionId);

        await supabase.from("studio_messages").insert({
          session_id: sessionId,
          role: "assistant",
          kind: "image",
          payload: { imageUrl: finalImageUrl, headline: scriptJson.headline, primary_text: scriptJson.primary_text },
        });
      });

      return { success: true, creativeId };
    } catch (e: any) {
      await supabase.from("meta_ad_creatives").update({ status: "failed" }).eq("id", creativeId);
      await supabase.from("studio_sessions").update({ status: "failed" }).eq("id", sessionId);
      await supabase.from("studio_messages").insert({
        session_id: sessionId,
        role: "assistant",
        kind: "text",
        content: "Something went wrong generating that ad. Please try again.",
      });
      throw e;
    }
  }
);
