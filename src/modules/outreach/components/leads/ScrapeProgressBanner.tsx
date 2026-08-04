"use client";
import { Loader2 } from "lucide-react";
import { useScrapeJobs } from "../../hooks/useLeads";

/** Polls outreach_scrape_jobs directly (useScrapeJobs' own refetchInterval
 * stops once nothing's queued/running) — same page-scoped polling pattern
 * Meta Ads/Social Media use for AI generation, not a global "jobs" widget. */
export function ScrapeProgressBanner() {
  const { data: jobs = [] } = useScrapeJobs();
  const active = jobs.filter((j) => j.status === "queued" || j.status === "running");
  if (active.length === 0) return null;

  return (
    <div className="space-y-2">
      {active.map((job) => (
        <div key={job.id} className="bg-primary-subtle border border-primary/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text truncate">Finding leads: {job.niches} in {job.location}</p>
            <p className="text-xs text-muted">Runs in the background — you can keep working.</p>
          </div>
        </div>
      ))}
    </div>
  );
}
