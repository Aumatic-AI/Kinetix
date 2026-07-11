"use client";

import { useEffect } from "react";
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
        // Expected payload: { jobId: "job-123", progress: 50, status: "processing" }
        const data = payload.payload as { jobId: string; progress?: number; status?: "processing" | "completed" | "failed" | "queued" };
        
        if (data.jobId) {
          updateJob(data.jobId, {
            ...(data.progress !== undefined && { progress: data.progress }),
            ...(data.status && { status: data.status }),
          });
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
