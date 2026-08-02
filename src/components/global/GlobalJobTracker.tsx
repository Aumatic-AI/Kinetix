"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useJobsStore } from "@/store";
import { createClient } from "@/lib/supabase/client";
import { useScrapeJobs } from "@/modules/outreach/hooks/useLeads";

export function GlobalJobTracker() {
  const { updateJob } = useJobsStore();
  const supabase = createClient();

  // -------------------------------------------------------------
  // DB RECONCILIATION FALLBACK (outreach scrape jobs)
  // The broadcast below is a single, unpersisted WebSocket message — if
  // the browser's Realtime connection has any hiccup during a multi-minute
  // scrape job (reconnect, brief network blip, tab throttled in the
  // background), the terminal "completed"/"failed" message is gone
  // forever and the progress banner is stranded at whatever percentage
  // was last received, even though the job genuinely finished. This
  // polls the real outreach_scrape_jobs table (useScrapeJobs' own
  // refetchInterval already stops once nothing is queued/running there)
  // and corrects the store the moment the DB shows a terminal status,
  // independent of whether any broadcast ever arrived.
  const { data: scrapeJobs } = useScrapeJobs();

  useEffect(() => {
    if (!scrapeJobs) return;
    for (const dbJob of scrapeJobs) {
      if (dbJob.status === "queued" || dbJob.status === "running") continue;

      const storeJob = useJobsStore.getState().jobs.find((j) => j.id === dbJob.id);
      if (!storeJob || storeJob.status === "completed" || storeJob.status === "failed") continue;

      const nextStatus = dbJob.status === "succeeded" ? "completed" : "failed";
      updateJob(dbJob.id, {
        status: nextStatus,
        progress: 100,
        ...(nextStatus === "failed" && { error: dbJob.error_message || "Find Leads failed" }),
      });

      const label = storeJob.title || "Find Leads";
      if (nextStatus === "completed") {
        toast.success(`${label} — found ${dbJob.total_scraped}, ${dbJob.valid_emails} verified`);
      } else {
        toast.error(dbJob.error_message || `${label} — failed`);
      }
    }
  }, [scrapeJobs, updateJob]);

  useEffect(() => {
    // -------------------------------------------------------------
    // SUPABASE REALTIME BROADCAST LISTENER
    // This listens for direct WebSocket messages from the Inngest backend
    // bypassing the database entirely for blazing fast UI updates.
    // -------------------------------------------------------------
    const channel = supabase.channel("kinetix-jobs");

    channel
      .on("broadcast", { event: "job-progress" }, (payload) => {
        // Expected payload: { jobId, progress?, status?, message? }
        const data = payload.payload as { jobId: string; progress?: number; status?: "processing" | "completed" | "failed" | "queued"; message?: string };

        if (!data.jobId) return;

        updateJob(data.jobId, {
          ...(data.progress !== undefined && { progress: data.progress }),
          ...(data.status && { status: data.status }),
        });

        if (data.status === "completed" || data.status === "failed") {
          const job = useJobsStore.getState().jobs.find((j) => j.id === data.jobId);
          const label = job?.title || "Task";
          if (data.status === "completed") toast.success(data.message || `${label} — done`);
          else toast.error(data.message || `${label} — failed`);
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Subscribed to kinetix-jobs realtime broadcasts");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [updateJob, supabase]);

  // Headless component, renders nothing
  return null;
}
