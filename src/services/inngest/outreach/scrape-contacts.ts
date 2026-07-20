import { inngest } from "../client";
import { createClient } from "@supabase/supabase-js";
import { ApifyService } from "@/services/apify";
import { MillionVerifierService } from "@/services/millionverifier";
import { broadcastJobProgress } from "./broadcast-progress";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Ported from the legacy Outreach n8n workflow — a job-title + city/country
// business-contact finder. Confirm this actor id and its input fields
// against Apify's current listing before relying on it in production.
const LEADS_FINDER_ACTOR = "code_crafter~leads-finder";
const MAX_POLL_ATTEMPTS = 20; // 20 x 15s = 5 minutes, replacing the legacy loop's uncapped retry

export const scrapeOutreachContacts = inngest.createFunction(
  { id: "outreach-scrape-contacts", triggers: [{ event: "outreach/scrape-contacts" }] },
  async ({ event, step }) => {
    const { jobId } = event.data;

    const job = await step.run("fetch-job", async () => {
      const { data } = await supabase.from("outreach_scrape_jobs").select("*").eq("id", jobId).single();
      return data;
    });
    if (!job) throw new Error("Scrape job not found");

    await step.run("mark-running", async () => {
      await supabase.from("outreach_scrape_jobs").update({ status: "running" }).eq("id", jobId);
    });
    await broadcastJobProgress(jobId, 5, "processing");

    try {
      const { runId, datasetId: initialDatasetId } = await step.run("start-apify", async () => {
        const result = await ApifyService.runActor(LEADS_FINDER_ACTOR, {
          contact_job_title: job.niches,
          contact_location: job.location,
          fetch_count: job.max_results,
        });
        return { runId: result.runId, datasetId: result.datasetId };
      });
      await broadcastJobProgress(jobId, 15, "processing");

      const datasetId = initialDatasetId;
      let succeeded = false;
      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        await step.sleep("wait-for-scrape", "15s");
        const status = await step.run(`check-status-${attempt}`, () => ApifyService.getRunStatus(runId));
        await broadcastJobProgress(jobId, Math.min(20 + Math.round((attempt / MAX_POLL_ATTEMPTS) * 50), 70), "processing");
        if (status === "SUCCEEDED") {
          succeeded = true;
          break;
        }
        if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
          throw new Error(`Apify run ended with status ${status}`);
        }
      }
      if (!succeeded) throw new Error("Scrape timed out waiting for results");

      const items = await step.run("fetch-results", () => ApifyService.getDatasetItems(datasetId));
      await broadcastJobProgress(jobId, 75, "processing");

      const stats = await step.run("verify-and-save", async () => {
        let validEmails = 0;
        let invalidEmails = 0;

        for (const item of items) {
          const email = item.email || item.contact_email;
          if (!email) continue;

          let verification: "verified" | "invalid" | "catch_all" | "unknown" = "unknown";
          try {
            verification = await MillionVerifierService.verify(email);
          } catch {
            continue; // verification service unavailable — skip rather than save an unverified contact
          }

          if (verification !== "verified") {
            invalidEmails++;
            continue;
          }
          validEmails++;

          await supabase.from("contacts").upsert(
            {
              business_id: job.business_id,
              category_id: job.category_id,
              email,
              first_name: item.first_name || null,
              last_name: item.last_name || null,
              phone: item.phone || item.mobile_number || null,
              linkedin_url: item.linkedin || null,
              company: item.company_name || item.company || null,
              city: item.city || null,
              country: item.country || null,
              source: "scraped",
              email_verification_status: "verified",
            },
            { onConflict: "business_id,email" }
          );
        }

        return { total: items.length, validEmails, invalidEmails };
      });
      await broadcastJobProgress(jobId, 95, "processing");

      await step.run("mark-succeeded", async () => {
        await supabase.from("outreach_scrape_jobs").update({
          status: "succeeded",
          apify_run_id: runId,
          total_scraped: stats.total,
          valid_emails: stats.validEmails,
          invalid_emails: stats.invalidEmails,
        }).eq("id", jobId);
      });
      await broadcastJobProgress(jobId, 100, "completed", `Found ${stats.total}, ${stats.validEmails} verified`);

      return stats;
    } catch (error: any) {
      await step.run("mark-failed", async () => {
        await supabase.from("outreach_scrape_jobs").update({ status: "failed", error_message: error.message }).eq("id", jobId);
      });
      await broadcastJobProgress(jobId, 100, "failed", error.message);
      throw error;
    }
  }
);
