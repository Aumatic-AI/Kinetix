import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { CampaignListItem, CampaignDetail, LaunchCampaignInput } from "../types/meta-ads.types";

const supabase = createClient();

export const campaignsKeys = {
  all: ["campaigns"] as const,
  list: () => [...campaignsKeys.all, "list"] as const,
  detail: (id: string) => [...campaignsKeys.all, "detail", id] as const,
  launchedCreativeIds: () => [...campaignsKeys.all, "launched-creative-ids"] as const,
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

/** Always live from Meta — see the build guide's "store vs fetch" note.
 * Cached briefly so re-opening the tab doesn't re-hit the Graph API every time. */
export function useCampaignsList() {
  return useQuery({
    queryKey: campaignsKeys.list(),
    queryFn: () => fetchJson<{ campaigns: CampaignListItem[] }>("/api/meta-ads/campaigns").then((d) => d.campaigns),
    staleTime: 60 * 1000,
  });
}

export function useCampaignDetail(id: string | null) {
  return useQuery({
    queryKey: campaignsKeys.detail(id || ""),
    queryFn: () => fetchJson<{ campaign: CampaignDetail }>(`/api/meta-ads/campaigns/${id}`).then((d) => d.campaign),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

/** Which of our own creatives have already been launched as an ad at least
 * once — drives the "Launched" badge in Ad Library. A creative can be
 * relaunched (new campaign, new audience), so this never hides anything. */
export function useLaunchedCreativeIds() {
  return useQuery({
    queryKey: campaignsKeys.launchedCreativeIds(),
    queryFn: async () => {
      const { data, error } = await supabase.from("ads").select("creative_id").not("creative_id", "is", null);
      if (error) throw error;
      return new Set((data || []).map((r) => r.creative_id as string));
    },
    staleTime: 60 * 1000,
  });
}

function invalidateCampaigns(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  queryClient.invalidateQueries({ queryKey: campaignsKeys.list() });
  queryClient.invalidateQueries({ queryKey: campaignsKeys.launchedCreativeIds() });
  if (id) queryClient.invalidateQueries({ queryKey: campaignsKeys.detail(id) });
}

export function useLaunchCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LaunchCampaignInput) =>
      fetchJson<{ success: true; campaignId: string }>("/api/meta-ads/campaigns/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateCampaigns(queryClient),
  });
}

export function useUpdateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; level: "campaign" | "adset" | "ad"; status: "ACTIVE" | "PAUSED" | "ARCHIVED"; campaignId?: string }) =>
      fetchJson("/api/meta-ads/campaigns/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, variables) => invalidateCampaigns(queryClient, variables.campaignId),
  });
}

export function useSmartRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { adId: string; campaignId: string }) =>
      fetchJson<{ success: true; pausedSiblings: number }>("/api/meta-ads/campaigns/smart-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adId: input.adId }),
      }),
    onSuccess: (_data, variables) => invalidateCampaigns(queryClient, variables.campaignId),
  });
}

export function useEditAdCreative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { adId: string; campaignId: string; headline?: string; primaryText?: string; ctaType?: string; websiteUrl?: string }) =>
      fetchJson(`/api/meta-ads/campaigns/ads/${input.adId}/creative`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, variables) => invalidateCampaigns(queryClient, variables.campaignId),
  });
}

export function useArchiveCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: string) => fetchJson(`/api/meta-ads/campaigns/${campaignId}`, { method: "DELETE" }),
    onSuccess: () => invalidateCampaigns(queryClient),
  });
}
