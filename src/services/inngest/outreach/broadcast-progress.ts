import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type BroadcastJobStatus = "queued" | "processing" | "completed" | "failed";

/** Fire-and-forget progress updates for the bottom-right jobs widget —
 * subscribes just long enough to guarantee the broadcast actually sends,
 * then tears the channel down. Same channel/event contract
 * GlobalJobTracker already listens for. */
export async function broadcastJobProgress(jobId: string, progress: number, status: BroadcastJobStatus, message?: string): Promise<void> {
  const channel = supabase.channel("kinetix-jobs");
  await new Promise<void>((resolve) => {
    channel.subscribe((subStatus) => {
      if (subStatus === "SUBSCRIBED") {
        channel.send({ type: "broadcast", event: "job-progress", payload: { jobId, progress, status, message } }).finally(resolve);
      }
    });
  });
  await supabase.removeChannel(channel);
}
