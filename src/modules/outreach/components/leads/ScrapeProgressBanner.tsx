"use client";
import { Loader2 } from "lucide-react";
import { useJobsStore } from "@/store";

export function ScrapeProgressBanner() {
  const jobs = useJobsStore((s) => s.jobs);
  const active = jobs.filter((j) => j.type === "outreach-scrape" && (j.status === "queued" || j.status === "processing"));
  if (active.length === 0) return null;

  return (
    <div className="space-y-2">
      {active.map((job) => (
        <div key={job.id} className="bg-primary-subtle border border-primary/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text truncate">{job.title}</p>
            <p className="text-xs text-muted">Runs in the background — you can keep working.</p>
          </div>
          <div className="w-28 h-1.5 rounded-full bg-surface overflow-hidden shrink-0">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${job.progress}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
