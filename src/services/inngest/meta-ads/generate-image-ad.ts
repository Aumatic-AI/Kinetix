import { inngest } from "../client";
import { aiOrchestrator } from "../../ai/orchestrator";
import { createClient } from "@supabase/supabase-js";
import { getImageAdPrompt } from "../../ai/prompts/meta-ads";
import { KieService } from "../../ai/providers/kie";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const generateImageAd = inngest.createFunction(
  { 
    id: "generate-image-ad",
    triggers: [{ event: "meta-ads/generate-image" }]
  },
  async ({ event, step }) => {
    const { ideaPrompt, creativeId, brandId } = event.data;
    
    if (!creativeId) throw new Error("No creativeId provided");

    try {
      // 1. Fetch intelligence (mocking or getting recent)
      const intelligence = await step.run("fetch-intelligence", async () => {
        const { data: compData } = await supabase
          .from("meta_ad_intelligence")
          .select("*")
          .eq("brand_id", brandId)
          .eq("report_type", "competitor")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
          
        const { data: selfData } = await supabase
          .from("meta_ad_intelligence")
          .select("*")
          .eq("brand_id", brandId)
          .eq("report_type", "self")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        return {
          competitor: compData?.insights || {},
          brand: selfData?.insights || {}
        };
      });

      // 2. Generate prompt
      const prompt = getImageAdPrompt(intelligence, { ideaPrompt });
      
      // 3. Generate script via LLM
      const scriptJson = await step.run("generate-script", async () => {
        const response = await aiOrchestrator.executeTask('text', prompt, 'openai');
        const jsonStr = (response as string).replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(jsonStr);
      });

      // 4. Trigger image generation via Kie directly
      const jobId = await step.run("trigger-image", async () => {
        return await KieService.createImageTask(scriptJson.visual_prompt, "4:5");
      });

      // 5. Poll for image completion with step.sleep
      let imageUrl = null;
      let attempts = 0;
      const MAX_ATTEMPTS = 8;
      
      while (!imageUrl && attempts < MAX_ATTEMPTS) {
        // Sleep dynamically based on attempt
        await step.sleep(`wait-image-${attempts}`, attempts === 0 ? "30s" : "20s");
        
        const status = await step.run(`check-image-status-${attempts}`, async () => {
          return await KieService.checkSingleTaskStatus(jobId);
        });

        if (status.state === "success") {
          try {
            const resultJson = JSON.parse(status.resultJson);
            imageUrl = resultJson.resultUrls?.[0] || resultJson.urls?.[0] || null;
          } catch (e) {
            console.error("Failed to parse Kie AI resultJson:", status.resultJson);
            imageUrl = null; // Will trigger timeout if last attempt
          }
        } else if (status.state === "failed" || status.state === "error") {
          throw new Error(`Kie AI Image Generation Failed: ${JSON.stringify(status)}`);
        }
        attempts++;
      }

      if (!imageUrl) {
        throw new Error("Kie AI Image Generation Timed Out");
      }

      // 6. Finalize
      await step.run("finalize", async () => {
        await supabase
          .from('meta_ad_creatives')
          .update({
            status: 'review',
            ad_script: {
              headline: scriptJson.headline,
              primary_text: scriptJson.primary_text
            },
            media_urls: [imageUrl]
          })
          .eq('id', creativeId);
      });

      return { success: true, creativeId };
    } catch (e: any) {
      await supabase
        .from('meta_ad_creatives')
        .update({ status: 'failed' })
        .eq('id', creativeId);
      throw e;
    }
  }
);
