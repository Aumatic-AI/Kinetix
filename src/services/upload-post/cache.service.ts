import { SupabaseClient } from "@supabase/supabase-js";
import { Database, Json } from "@/types/supabase";
import { getProfileAnalytics, getTotalImpressions } from "./analytics";
import { UploadPostPlatform, UploadPostProfileAnalytics, UploadPostTotalImpressions } from "./types";

/**
 * The Root and Social dashboards read Upload-Post analytics ONLY through
 * this cache — never live — because Upload-Post's own analytics endpoints
 * aggregate data from each connected platform's API server-side and can
 * take several seconds to respond, far too slow for a dashboard page load.
 * `jobs/social-analytics-cache-refresh.job.ts` (cron, every 5 minutes) is
 * the one real writer, keeping this warm regardless of who's viewing a
 * dashboard. The "bootstrap on miss" fallback below only matters right
 * after this feature first ships, or if a cache row is somehow missing —
 * in steady state every read here is a single fast Postgres lookup.
 */
async function readCache<T>(supabase: SupabaseClient<Database>, businessId: string, cacheKey: string): Promise<T | null> {
  const { data } = await supabase
    .from("upload_post_analytics_cache")
    .select("data")
    .eq("business_id", businessId)
    .eq("cache_key", cacheKey)
    .maybeSingle();
  return (data?.data as T) ?? null;
}

async function writeCache(supabase: SupabaseClient<Database>, businessId: string, cacheKey: string, data: Json): Promise<void> {
  await supabase.from("upload_post_analytics_cache").upsert(
    { business_id: businessId, cache_key: cacheKey, data, fetched_at: new Date().toISOString() },
    { onConflict: "business_id,cache_key" }
  );
}

export const PROFILE_ANALYTICS_CACHE_KEY = "profile_analytics";
export const totalImpressionsCacheKey = (period: string) => `total_impressions:${period}`;

export class UploadPostCacheService {
  static async readProfileAnalytics(
    supabase: SupabaseClient<Database>,
    businessId: string,
    username: string,
    platforms: UploadPostPlatform[]
  ): Promise<Record<string, UploadPostProfileAnalytics>> {
    const cached = await readCache<Record<string, UploadPostProfileAnalytics>>(supabase, businessId, PROFILE_ANALYTICS_CACHE_KEY);
    if (cached) return cached;

    const fresh = await getProfileAnalytics(username, platforms).catch(() => ({}) as Record<string, UploadPostProfileAnalytics>);
    await writeCache(supabase, businessId, PROFILE_ANALYTICS_CACHE_KEY, fresh as unknown as Json);
    return fresh;
  }

  static async readTotalImpressions(
    supabase: SupabaseClient<Database>,
    businessId: string,
    username: string,
    period: string
  ): Promise<UploadPostTotalImpressions | null> {
    const cacheKey = totalImpressionsCacheKey(period);
    const cached = await readCache<UploadPostTotalImpressions>(supabase, businessId, cacheKey);
    if (cached) return cached;

    const fresh = await getTotalImpressions(username, { period, breakdown: true }).catch(() => null);
    if (fresh) await writeCache(supabase, businessId, cacheKey, fresh as unknown as Json);
    return fresh;
  }
}
