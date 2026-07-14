import { inngest } from "@/services/inngest/client";
import { aiOrchestrator } from "@/services/ai/orchestrator";
import { MetaAdsService } from "@/modules/meta-ads/services/meta-ads.service";
import { createClient } from "@supabase/supabase-js";
import { generateCompetitorAnalysisPrompt } from "@/services/prompts/competitor-analysis.prompt";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const competitorAnalysisJob = inngest.createFunction(
  { id: "jobs-competitor-analysis", triggers: [{ cron: "0 6 * * 1" }] },
  async ({ step }: any) => {
    const brands = await step.run("fetch-brands", async () => {
      const { data } = await supabase.from("brands").select("*");
      return data || [];
    });

    for (const brand of brands) {
      const topAds = await step.run(`fetch-top-ads-${brand.id}`, async () => {
        // Fetch top scoring ads
        const { data } = await supabase
          .from("meta_competitor_ads")
          .select("*")
          .eq("brand_id", brand.id)
          .order("score", { ascending: false })
          .limit(10);
        return data || [];
      });

      if (!topAds || topAds.length === 0) continue;

      await step.run(`generate-insight-${brand.id}`, async () => {
        const marketSummary = {
          total_analyzed: topAds.length,
          note: "Top scoring ads based on heuristic evaluation"
        };

        const prompt = generateCompetitorAnalysisPrompt(
          brand.name,
          brand.industry,
          brand.brand_voice,
          brand.core_offerings,
          topAds.slice(0, 10), // pass top 10 as competitor data
          topAds.slice(0, 5),  // pass top 5 as strongest
          marketSummary
        );

        const responseText = (await aiOrchestrator.executeTask(
          "analysis",
          prompt,
          "openai"
        )) as string;

        try {
          // Extract JSON from potential markdown blocks
          const jsonStr = responseText
            .replace(/```json\n?|\n?```/g, "")
            .trim();
          const insights = JSON.parse(jsonStr);

          await MetaAdsService.insertIntelligence(supabase, {
            brand_id: brand.id,
            report_type: "competitor",
            insights,
          });
        } catch (e) {
          console.error("Failed to parse AI response into JSON", e);
        }
      });
    }
  }
);
