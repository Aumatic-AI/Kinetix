import { inngest } from "@/services/inngest/client";
import { MetaAdsInsightsService } from "@/services/meta-ads/insights.service";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Daily sync of each business's own Meta ad performance into
// ad_performance_daily — the input to the self-ad ("business ad")
// analysis job. This is "Performance Polling" from modules/meta_ads.md,
// previously undocumented as unbuilt — first real implementation.
export const metaAdsPerformanceSyncJob = inngest.createFunction(
  { id: "jobs-meta-ads-performance-sync", triggers: [{ cron: "0 4 * * *" }] }, // daily, 4 AM UTC
  async ({ step }: any) => {
    const businesses = await step.run("fetch-businesses", async () => {
      const { data } = await supabase.from("businesses").select("*");
      return data || [];
    });

    for (const business of businesses) {
      await step.run(`sync-ads-${business.id}`, async () => {
        // Prefer a real connected ad account; fall back to env vars for
        // dev/testing when no platform_connections row exists yet.
        const { data: connection } = await supabase
          .from("platform_connections")
          .select("*")
          .eq("business_id", business.id)
          .eq("platform", "facebook")
          .eq("account_kind", "ad_account")
          .eq("status", "connected")
          .maybeSingle();

        // NOTE: access_token_ref is a placeholder for the eventual Supabase
        // Vault reference (see docs/architecture/system_design.md) — Vault
        // isn't wired up yet, so this column currently holds the raw token.
        const accessToken = connection?.access_token_ref || process.env.META_ACCESS_TOKEN;
        const adAccountId = connection?.external_id || process.env.META_AD_ACCOUNT_ID;

        if (!accessToken || !adAccountId) {
          console.log(`Business ${business.id} has no connected Meta ad account and no META_ACCESS_TOKEN/META_AD_ACCOUNT_ID fallback — skipping.`);
          return;
        }

        let ads;
        try {
          ads = await MetaAdsInsightsService.fetchAdsWithInsights(accessToken, adAccountId, "yesterday");
        } catch (e) {
          console.error(`Meta Insights fetch failed for business ${business.id}:`, e);
          return;
        }

        if (!ads.length) return;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const metricDate = yesterday.toISOString().split("T")[0];

        const rows = ads.map((ad) => ({
          business_id: business.id,
          meta_ad_id: ad.metaAdId,
          metric_date: metricDate,
          spend_cents: ad.spendCents,
          impressions: ad.impressions,
          clicks: ad.clicks,
          reach: ad.reach,
          ctr: ad.ctr,
          cpc_cents: ad.cpcCents,
          cpm_cents: ad.cpmCents,
          conversions: ad.conversions,
          cpa: ad.conversions > 0 ? Number((ad.spendCents / 100 / ad.conversions).toFixed(2)) : null,
          ad_text: [ad.headline, ad.body].filter(Boolean).join(" — ") || null,
          media_url: ad.imageUrl || null,
          format: ad.imageUrl ? "image" : null,
        }));

        const { error } = await supabase
          .from("ad_performance_daily")
          .upsert(rows, { onConflict: "meta_ad_id,metric_date" });

        if (error) console.error(`Failed to upsert ad_performance_daily for business ${business.id}:`, error.message);
      });
    }
  }
);
