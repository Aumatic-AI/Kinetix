import { inngest } from "@/services/inngest/client";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/config";
import { LeadsService } from "@/modules/meta-ads/services/leads.service";

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY!);

/**
 * Keeps the `leads` table fresh in the background so the Leads page's own
 * GET never has to wait on a live Meta Graph API call — that round trip
 * (every Instant Form, every lead on each) routinely took 7-8 seconds,
 * far too slow for a page load. Runs every 5 minutes; the manual "Sync
 * now" button on the Leads page still triggers an immediate, blocking
 * sync on demand for anyone who doesn't want to wait for the next tick.
 */
export const metaAdsLeadsSyncJob = inngest.createFunction(
  { id: "jobs-meta-ads-leads-sync", triggers: [{ cron: "*/5 * * * *" }] },
  async ({ step }: any) => {
    const businesses = await step.run("fetch-businesses", async () => {
      const { data } = await supabase.from("businesses").select("id");
      return data || [];
    });

    for (const business of businesses) {
      await step.run(`sync-leads-${business.id}`, async () => {
        try {
          await LeadsService.syncFromMeta(supabase, business.id);
        } catch (e) {
          // Most common cause: META_PAGE_ID/META_PAGE_TOKEN not configured
          // for this business yet — degrade silently, same as the route.
          console.error(`[META_ADS_LEADS_SYNC_JOB] failed for business ${business.id}:`, e);
        }
      });
    }
  }
);
