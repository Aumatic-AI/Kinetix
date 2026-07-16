import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export const socialKeys = {
  all: ["social"] as const,
  posts: () => [...socialKeys.all, "posts"] as const,
  mediaAssets: () => [...socialKeys.all, "media-assets"] as const,
};

const IN_PROGRESS_STATUSES = ["generating", "publishing"];

export function useSocialPosts() {
  return useQuery({
    queryKey: socialKeys.posts(),
    queryFn: async () => {
      const { data, error } = await (supabase.from("social_posts") as any)
        .select("id, business_id, connection_id, status, format, idea_prompt, caption, media_asset_id, error_message, published_at, created_at, platform_connections(platform, display_name, metadata), media_assets(type, metadata)")
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
        .eq("status", "connected");
      if (error) throw error;
      return (data || []) as SocialConnection[];
    },
  });
}

export interface PreparedPlatformRow {
  id: string;
  platform: string;
  caption: string;
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

export function useMediaAssets() {
  return useQuery({
    queryKey: socialKeys.mediaAssets(),
    queryFn: async () => {
      const { data, error } = await supabase.from("media_assets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function usePublishPosts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (socialPostIds: string[]) => {
      const res = await fetch("/api/social/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socialPostIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish");
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
