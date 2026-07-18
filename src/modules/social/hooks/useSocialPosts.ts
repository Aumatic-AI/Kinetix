import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export const socialKeys = {
  all: ["social"] as const,
  posts: () => [...socialKeys.all, "posts"] as const,
};

const IN_PROGRESS_STATUSES = ["generating", "publishing"];

export function useSocialPosts() {
  return useQuery({
    queryKey: socialKeys.posts(),
    queryFn: async () => {
      const { data, error } = await (supabase.from("social_posts") as any)
        .select("id, business_id, connection_id, status, format, idea_prompt, caption, title, media_asset_id, error_message, published_at, scheduled_at, created_at, generation_inputs, platform_connections(platform, display_name, metadata), media_assets(type, metadata)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    // Generation runs as a background Inngest job that can take a minute or
    // more — poll while anything is still generating/publishing so the
    // card flips to its finished state without a manual refresh.
    refetchInterval: (query) => {
      const rows = (query.state.data as { status: string }[] | undefined) || [];
      return rows.some((r) => IN_PROGRESS_STATUSES.includes(r.status)) ? 5000 : false;
    },
  });
}

export interface SocialConnection {
  id: string;
  platform: string;
  display_name: string | null;
  status: string;
  metadata: any;
}

export function useConnections() {
  return useQuery({
    queryKey: [...socialKeys.all, "connections"] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_connections")
        .select("id, platform, display_name, status, metadata")
        .eq("account_kind", "upload_post")
        .eq("status", "connected");
      if (error) throw error;
      return (data || []) as SocialConnection[];
    },
  });
}

export interface ConnectedAccount extends SocialConnection {
  created_at: string;
}

/** Connected Accounts page — pulls every platform's live status (including
 * "not connected") from Upload-Post and upserts our own platform_connections
 * cache. This is a real account-status change, not something that happens
 * throughout the day, so it's cached for a while instead of re-fetching on
 * every visit to the page. */
export function useConnectedAccountsSync() {
  return useQuery({
    queryKey: [...socialKeys.all, "connected-accounts-sync"] as const,
    queryFn: async () => {
      const res = await fetch("/api/social/upload-post/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sync connection status");
      return (data.connections || []) as ConnectedAccount[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export interface PreparedPlatformRow {
  id: string;
  platform: string;
  caption: string;
  /** YouTube only — Upload-Post needs a distinct title, separate from the
   * caption (which becomes the description). Unset for every other platform. */
  title?: string;
  account: { displayName: string; avatarUrl?: string };
}

export function usePreparePlatforms() {
  return useMutation({
    mutationFn: async (input: { mediaAssetId: string; ideaPrompt: string | null; format: string; platforms: string[] }) => {
      const res = await fetch("/api/social/posts/prepare-platforms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to prepare platforms");
      return data.rows as PreparedPlatformRow[];
    },
  });
}

export function useImproveCaption() {
  return useMutation({
    mutationFn: async (input: { platform: string; caption: string; instruction?: string }) => {
      const res = await fetch("/api/social/posts/improve-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to improve caption");
      return data.caption as string;
    },
  });
}

export function useUpdateCaption() {
  return useMutation({
    mutationFn: async ({ id, caption, title }: { id: string; caption: string; title?: string }) => {
      const update: { caption: string; title?: string } = { caption };
      if (title !== undefined) update.title = title;
      const { error } = await supabase.from("social_posts").update(update).eq("id", id);
      if (error) throw error;
    },
  });
}

export interface PublishPostsInput {
  socialPostIds: string[];
  /** Presence alone schedules instead of publishing immediately. */
  scheduledDate?: string;
  timezone?: string;
}

export function usePublishPosts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: string[] | PublishPostsInput) => {
      const body = Array.isArray(input) ? { socialPostIds: input } : input;
      const res = await fetch("/api/social/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish");
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: socialKeys.posts() }),
  });
}

export function useCancelSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (socialPostIds: string[]) => {
      const res = await fetch("/api/social/posts/cancel-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socialPostIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel");
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: socialKeys.posts() }),
  });
}

export function useRetryPosts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (socialPostIds: string[]) => {
      const res = await fetch("/api/social/posts/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socialPostIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to retry");
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: socialKeys.posts() }),
  });
}

export function useDeletePosts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (socialPostIds: string[]) => {
      const { error } = await supabase.from("social_posts").delete().in("id", socialPostIds);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: socialKeys.posts() }),
  });
}
