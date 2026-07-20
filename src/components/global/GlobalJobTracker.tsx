"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useJobsStore } from "@/store";
import { createClient } from "@/lib/supabase/client";

export function GlobalJobTracker() {
  const { updateJob } = useJobsStore();
  const supabase = createClient();

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
