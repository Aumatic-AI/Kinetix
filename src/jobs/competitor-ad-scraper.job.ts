import { inngest } from "@/services/inngest/client";
import { ApifyService } from "@/services/apify";
import { aiOrchestrator } from "@/services/ai/orchestrator";
import { generateCompetitorAnalysisPrompt } from "@/prompts/competitor-analysis";
import { processCompetitorAds, trimForPrompt } from "@/services/ai/competitor-ad-processor";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Ported from the legacy n8n workflow (toga Research analysis for ads.json).
// Real, working Apify actor for the Facebook Ads Library — not the
// placeholder actor id this job called before.
const FACEBOOK_ADS_LIBRARY_ACTOR = "curious_coder~facebook-ads-library-scraper";

export const competitorAdScraperJob = inngest.createFunction(
  { id: "jobs-competitor-ad-scraper", triggers: [{ cron: "0 0 * * 0" }] },
  async ({ step }: any) => {
    const businesses = await step.run("fetch-businesses", async () => {
      const { data } = await supabase.from("businesses").select("*");
      return data || [];
    });

    for (const business of businesses) {
      await step.sendEvent("trigger-scrape", {
        name: "jobs/competitor-ad-scraper",
        data: { businessId: business.id },
      });
    }
  }
);

export const competitorAdScraperWorker = inngest.createFunction(
  {
    id: "jobs-competitor-ad-scraper-worker",
    triggers: [{ event: "jobs/competitor-ad-scraper" }],
  },
  async ({ event, step }: any) => {
    const { businessId } = event.data;

    const business = await step.run("fetch-config", async () => {
      const { data } = await supabase.from("businesses").select("*").eq("id", businessId).single();
      return data;
    });

    if (!business) return;

    const countries: string[] = Array.isArray(business.target_countries) && business.target_countries.length > 0
      ? business.target_countries
      : ["US"];
    const keywords: string[] = Array.isArray(business.competitor_keywords) && business.competitor_keywords.length > 0
      ? business.competitor_keywords
      : [business.industry || business.name];
    const scrapeConfig = business.settings?.competitor_scrape || {};
    const onlyActive = scrapeConfig.only_active ?? true;
    const maxAds = scrapeConfig.max_ads || 100;
    const sortBy = scrapeConfig.sort || "impressions_desc";

    // Build one Facebook Ads Library URL per country x keyword pair, and the
    // Apify request body — same shape the legacy n8n workflow sent this actor.
    const runInputs = { countries, keywords, only_active: onlyActive, max_ads: maxAds, sort: sortBy };

    const datasetId = await step.run("trigger-apify", async () => {
      const urls: { url: string }[] = [];
      for (const country of countries) {
        for (const keyword of keywords) {
          const encodedKeyword = encodeURIComponent(keyword);
          urls.push({
            url: `https://www.facebook.com/ads/library/?active_status=${onlyActive ? "active" : "all"}&ad_type=all&country=${country}&q=${encodedKeyword}&search_type=keyword_unordered&media_type=all`,
          });
        }
      }

      const result = await ApifyService.runActor(FACEBOOK_ADS_LIBRARY_ACTOR, {
        count: maxAds,
        scrapeAdDetails: true,
        "scrapePageAds.activeStatus": onlyActive ? "active" : "all",
        "scrapePageAds.countryCode": countries[0],
        "scrapePageAds.sortBy": sortBy,
        urls,
      });
      return result.datasetId;
    });

    await step.sleep("wait-for-scraper", "5m");

    // Full ad-processing pipeline — relevance filter, copy extraction, type
    // detection, framework/angle tagging, scoring, competitor grouping,
    // market-wide stats, gap detection. Everything here is in-memory only;
    // see docs/ai_pipelines/intelligence_engine.md for why nothing is persisted.
    const trimmed = await step.run("process-ads", async () => {
      const items = await ApifyService.getDatasetItems(datasetId);
      const result = processCompetitorAds(items, {
        name: business.name,
        competitorKeywords: keywords,
        targetCountries: countries,
      });
      return { result, trimmed: trimForPrompt(result) };
    });

    if (!trimmed.result.all_ads.length) return;

    await step.run("generate-insight", async () => {
      const adScriptTopics = Array.isArray(business.ad_script_topics) && business.ad_script_topics.length > 0
        ? business.ad_script_topics
        : [{ topic: "General Offer Awareness", format: "Image Ad" }];

      const prompt = generateCompetitorAnalysisPrompt({
        businessName: business.name,
        industry: business.industry,
        businessVoice: business.business_voice,
        coreOfferings: business.core_offerings,
        targetAudience: business.target_audience,
        targetCountries: countries,
        adScriptTopics: adScriptTopics,
        competitors: trimmed.trimmed.competitors,
        topAds: trimmed.trimmed.top_ads,
        marketSummary: trimmed.trimmed.summary,
        gaps: trimmed.trimmed.gaps,
      });

      const responseText = (await aiOrchestrator.executeTask("analysis", prompt.user, "openai", { systemPrompt: prompt.system })) as string;

      try {
        const jsonStr = responseText.replace(/```json\n?|\n?```/g, "").trim();
        const report = JSON.parse(jsonStr);

        // The AI can't know the real time — the system stamps this itself.
        delete report.generated_at;

        await supabase.from("ad_analysis_reports").insert({
          business_id: businessId,
          report_type: "competitor",
          insights: {
            ...report,
            meta: {
              ...trimmed.result.meta,
              generated_at: new Date().toISOString(),
              run_inputs: runInputs,
              // Only the aggregate stats actually shown on the Competitors
              // page (Market Snapshot chart + stat callouts) — the full
              // per-competitor breakdown and top-ad gallery were dropped
              // from the UI, so they're not persisted either.
              market_stats: {
                formats: trimmed.result.summary.formats,
                top_angles: trimmed.result.summary.top_angles,
                longevity: trimmed.result.summary.longevity,
              },
            },
          },
        });
      } catch (e) {
        console.error("Failed to parse competitor analysis AI response into JSON", e);
      }
    });
  }
);
