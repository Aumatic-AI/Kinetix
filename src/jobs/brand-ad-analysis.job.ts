import { inngest } from "@/services/inngest/client";
import { aiOrchestrator } from "@/services/ai/orchestrator";
import { MetaAdsService } from "@/modules/meta-ads/services/meta-ads.service";
import { createClient } from "@supabase/supabase-js";
import { generateBrandAnalysisPrompt } from "@/services/prompts/brand-analysis.prompt";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const brandAdAnalysisJob = inngest.createFunction(
  { id: "jobs-brand-ad-analysis", triggers: [{ cron: "0 2 * * 0" }] }, // Weekly on Sunday 2 AM
  async ({ step }: any) => {
    
    // 1. Fetch Brands
    const brands = await step.run("fetch-brands", async () => {
      const { data } = await supabase.from("brands").select("*");
      return data || [];
    });

    for (const brand of brands) {
      
      // 2. Fetch Seasoned Ads (at least 7 days old)
      const seasonedAds = await step.run(`fetch-seasoned-ads-${brand.id}`, async () => {
        // In a real scenario, we'd filter by an 'ad_created_date' column. 
        // For this mock logic, we'll assume the date is 7 days ago.
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const dateString = sevenDaysAgo.toISOString().split('T')[0];
        
        const { data } = await supabase
          .from("meta_self_ad_metrics")
          .select("*")
          .eq("brand_id", brand.id)
          .lte("date", dateString); 
          
        return data || [];
      });

      // 3. The Volume Check: Min 10 Ads
      if (seasonedAds.length < 10) {
        console.log(`Brand ${brand.id} has less than 10 seasoned ads. Skipping analysis to avoid hallucination.`);
        continue;
      }

      // 4. Programmatic Bucketing
      const buckets = await step.run(`bucket-ads-${brand.id}`, async () => {
        const scalingWinners = seasonedAds.filter(ad => ad.roas >= 3);
        const consistentLosers = seasonedAds.filter(ad => ad.roas < 1 && ad.spend > 50);
        const fatigued = seasonedAds.filter(ad => ad.roas >= 1 && ad.roas < 3 && ad.ctr < 1); // Simple heuristic mock
        
        return { scalingWinners, fatigued, consistentLosers };
      });

      // 5. Fetch Last Week's Insights (For Delta Analysis)
      const lastWeekInsights = await step.run(`fetch-last-insights-${brand.id}`, async () => {
        const { data } = await supabase
          .from("meta_ad_intelligence")
          .select("insights")
          .eq("brand_id", brand.id)
          .eq("report_type", "self")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
          
        return data?.insights || null;
      });

      // 6. Generate New Delta Insights
      await step.run(`generate-insight-${brand.id}`, async () => {
        const prompt = generateBrandAnalysisPrompt(
          brand.name,
          brand.industry,
          buckets,
          lastWeekInsights
        );

        const responseText = (await aiOrchestrator.executeTask(
          "analysis",
          prompt,
          "openai"
        )) as string;

        try {
          const jsonStr = responseText.replace(/```json\n?|\n?```/g, "").trim();
          const insights = JSON.parse(jsonStr);

          // Save the new insights
          await MetaAdsService.insertIntelligence(supabase, {
            brand_id: brand.id,
            report_type: "self",
            insights,
          });
        } catch (e) {
          console.error("Failed to parse Self Analysis AI response into JSON", e);
        }
      });
    }
  }
);
