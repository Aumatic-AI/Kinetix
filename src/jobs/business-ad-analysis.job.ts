import { inngest } from "@/services/inngest/client";
import { aiOrchestrator } from "@/services/ai/orchestrator";
import { MetaAdsService } from "@/modules/meta-ads/services/meta-ads.service";
import { createClient } from "@supabase/supabase-js";
import { generateBusinessAnalysisPrompt } from "@/prompts/business-analysis";
import { aggregateByAd, diagnosePattern, bucketAds, ruleBasedSelfAdReport } from "@/services/ai/self-ad-processor";
import { env } from "@/config";
import { shouldRunScheduledJob } from "@/services/scheduling/business-schedule";

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY!
);

// Hourly checker, not the user-facing schedule itself — see the matching
// comment in competitor-ad-scraper.job.ts for why this can't just be a
// weekly cron reading businesses.self_ad_analysis_schedule_day/hour
// (Settings > Automation Defaults > Analysis Schedule) directly.
export const businessAdAnalysisJob = inngest.createFunction(
  { id: "jobs-business-ad-analysis", triggers: [{ cron: "0 * * * *" }] },
  async ({ step }: any) => {

    // 1. Fetch Businesses
    const businesses = await step.run("fetch-businesses", async () => {
      const { data } = await supabase.from("businesses").select("*");
      return data || [];
    });

    for (const business of businesses) {
      const timezone = business.outreach_settings?.timezone || "America/Detroit";
      const isDue = shouldRunScheduledJob({
        scheduleDay: business.self_ad_analysis_schedule_day,
        scheduleHour: business.self_ad_analysis_schedule_hour,
        lastRunAt: business.self_ad_analysis_last_run_at,
        timezone,
      });
      if (!isDue) continue;

      // Marked before the real work starts, not after, so a slow run can't
      // leave the window open for the same hourly tick to fire twice.
      await step.run(`mark-scheduled-${business.id}`, async () => {
        await supabase.from("businesses").update({ self_ad_analysis_last_run_at: new Date().toISOString() }).eq("id", business.id);
      });

      // 2. Fetch every daily performance row for this business (not
      // pre-filtered by date — aggregation happens per-ad next, since a
      // single ad spans many daily rows and "seasoned" is a property of
      // the ad's lifetime, not of any one row).
      const dailyRows = await step.run(`fetch-daily-rows-${business.id}`, async () => {
        const { data } = await supabase
          .from("ad_performance_daily")
          .select("*")
          .eq("business_id", business.id);
        return data || [];
      });

      // 3. Aggregate into one record per ad, and gate on total ad volume —
      // this is a business-wide check, on distinct ads, not daily rows.
      const { qualifies, seasonedScored } = await step.run(`aggregate-and-gate-${business.id}`, async () => {
        const aggregated = aggregateByAd(dailyRows as any);

        if (aggregated.length <= 10) {
          console.log(`Business ${business.id} has ${aggregated.length} tracked ads (needs >10). Skipping analysis to avoid hallucination.`);
          return { qualifies: false, seasonedScored: [] };
        }

        // Only ads running 7+ days have stable enough signal to bucket.
        const seasoned = aggregated.filter((a) => a.daysRunning >= 7);
        const accountAvgCpcCents = seasoned.length
          ? Math.round(seasoned.reduce((s, a) => s + a.spendCents, 0) / Math.max(1, seasoned.reduce((s, a) => s + a.clicks, 0)))
          : 0;
        const scored = seasoned.map((a) => ({ ...a, pattern: diagnosePattern(a, accountAvgCpcCents) }));

        return { qualifies: true, seasonedScored: scored };
      });

      if (!qualifies || seasonedScored.length === 0) continue;

      // 4. Bucket into top performers vs. underperformers, with account totals.
      const bucketed = await step.run(`bucket-ads-${business.id}`, async () => bucketAds(seasonedScored as any));

      // 5. Fetch last week's self report, for delta framing.
      const lastWeekInsights = await step.run(`fetch-last-insights-${business.id}`, async () => {
        const { data } = await supabase
          .from("ad_analysis_reports")
          .select("insights")
          .eq("business_id", business.id)
          .eq("report_type", "self")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        return data?.insights || null;
      });

      // 6. Generate the report — AI first, deterministic rule-based fallback
      // if the call fails, so this job always produces something usable.
      await step.run(`generate-insight-${business.id}`, async () => {
        let report: Record<string, unknown>;
        try {
          const prompt = generateBusinessAnalysisPrompt({
            businessName: business.name,
            industry: business.industry,
            bucketed,
            lastWeekInsights,
          });
          const responseText = (await aiOrchestrator.executeTask("analysis", prompt.user, "openai", { systemPrompt: prompt.system })) as string;
          const jsonStr = responseText.replace(/```json\n?|\n?```/g, "").trim();
          report = JSON.parse(jsonStr);
        } catch (e) {
          console.error(`AI self-ad analysis failed for business ${business.id}, using rule-based fallback:`, e);
          report = ruleBasedSelfAdReport(bucketed);
        }

        await MetaAdsService.insertIntelligence(supabase, {
          business_id: business.id,
          report_type: "self",
          insights: {
            ...report,
            meta: {
              generated_at: new Date().toISOString(),
              total_ads_tracked: dailyRows.length ? new Set((dailyRows as any[]).map((r) => r.meta_ad_id)).size : 0,
              seasoned_ads_analyzed: seasonedScored.length,
              account_totals: bucketed.totals,
            },
          },
        });
      });
    }
  }
);
