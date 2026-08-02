import { inngest } from "@/services/inngest/client";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/config";
import { UploadPostService, SUPPORTED_UPLOAD_POST_PLATFORMS } from "@/services/upload-post";
import { PROFILE_ANALYTICS_CACHE_KEY, totalImpressionsCacheKey } from "@/services/upload-post/cache.service";

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY!);

// Every distinct `period` value the Root Dashboard's range selector and the
// Social Dashboard ever request — see the periodByRange map in
// src/app/api/dashboard/route.ts.
const IMPRESSIONS_PERIODS = ["last_week", "last_month", "last_3months"] as const;

/**
 * Keeps upload_post_analytics_cache warm so the Root and Social dashboards
 * never have to wait on Upload-Post's own (multi-second) analytics API —
 * see src/services/upload-post/cache.service.ts for why. Runs every 5
 * minutes; each business's cache is at most 5 minutes stale, which is a
 * non-issue for follower/impression/engagement counts.
 */
export const socialAnalyticsCacheRefresh = inngest.createFunction(
  { id: "jobs-social-analytics-cache-refresh", triggers: [{ cron: "*/5 * * * *" }] },
  async ({ step }: any) => {
    const username = env.UPLOAD_POST_PROFILE;
    if (!username) return;

    const businesses = await step.run("fetch-businesses", async () => {
      const { data } = await supabase.from("businesses").select("id");
      return data || [];
    });

    for (const business of businesses) {
      const connectedPlatforms = await step.run(`connected-platforms-${business.id}`, async () => {
        const { data: connectionRows } = await supabase
          .from("platform_connections")
          .select("platform, status")
          .eq("business_id", business.id);
        return SUPPORTED_UPLOAD_POST_PLATFORMS.filter((p) => (connectionRows || []).some((c) => c.platform === p && c.status === "connected"));
      });

      if (connectedPlatforms.length === 0) continue;

      await step.run(`refresh-profile-analytics-${business.id}`, async () => {
        try {
          const profileAnalytics = await UploadPostService.getProfileAnalytics(username, connectedPlatforms);
          await supabase.from("upload_post_analytics_cache").upsert(
            { business_id: business.id, cache_key: PROFILE_ANALYTICS_CACHE_KEY, data: profileAnalytics, fetched_at: new Date().toISOString() },
            { onConflict: "business_id,cache_key" }
          );
        } catch (e) {
          console.error(`[SOCIAL_ANALYTICS_CACHE_REFRESH] profile analytics failed for business ${business.id}:`, e);
        }
      });

      for (const period of IMPRESSIONS_PERIODS) {
        await step.run(`refresh-total-impressions-${period}-${business.id}`, async () => {
          try {
            const totalImpressions = await UploadPostService.getTotalImpressions(username, { period, breakdown: true });
            await supabase.from("upload_post_analytics_cache").upsert(
              { business_id: business.id, cache_key: totalImpressionsCacheKey(period), data: totalImpressions, fetched_at: new Date().toISOString() },
              { onConflict: "business_id,cache_key" }
            );
          } catch (e) {
            console.error(`[SOCIAL_ANALYTICS_CACHE_REFRESH] total impressions (${period}) failed for business ${business.id}:`, e);
          }
        });
      }
    }
  }
);
