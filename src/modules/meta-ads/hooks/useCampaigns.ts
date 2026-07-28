import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CampaignListItem, CampaignPageDetail, AdSetPageDetail, AdPageDetail, LaunchCampaignInput, CreateAdSetInput, CreateAdInput } from "../types/meta-ads.types";

export const campaignsKeys = {
  all: ["campaigns"] as const,
  list: () => [...campaignsKeys.all, "list"] as const,
  detail: (id: string) => [...campaignsKeys.all, "detail", id] as const,
  adSetDetail: (id: string) => [...campaignsKeys.all, "adset-detail", id] as const,
  adDetail: (id: string) => [...campaignsKeys.all, "ad-detail", id] as const,
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
    queryFn: () => fetchJson<{ campaign: CampaignPageDetail }>(`/api/meta-ads/campaigns/${id}`).then((d) => d.campaign),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useAdSetDetail(id: string | null) {
  return useQuery({
    queryKey: campaignsKeys.adSetDetail(id || ""),
    queryFn: () => fetchJson<{ adSet: AdSetPageDetail }>(`/api/meta-ads/campaigns/ad-sets/${id}`).then((d) => d.adSet),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useAdDetail(id: string | null) {
  return useQuery({
    queryKey: campaignsKeys.adDetail(id || ""),
    queryFn: () => fetchJson<{ ad: AdPageDetail }>(`/api/meta-ads/campaigns/ads/${id}`).then((d) => d.ad),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

function invalidateCampaigns(
  queryClient: ReturnType<typeof useQueryClient>,
  opts?: { campaignId?: string; adSetId?: string; adId?: string }
) {
  queryClient.invalidateQueries({ queryKey: campaignsKeys.list() });
  if (opts?.campaignId) queryClient.invalidateQueries({ queryKey: campaignsKeys.detail(opts.campaignId) });
  if (opts?.adSetId) queryClient.invalidateQueries({ queryKey: campaignsKeys.adSetDetail(opts.adSetId) });
  if (opts?.adId) queryClient.invalidateQueries({ queryKey: campaignsKeys.adDetail(opts.adId) });
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
    onSuccess: (_data, variables) =>
      invalidateCampaigns(queryClient, {
        campaignId: variables.campaignId,
        adSetId: variables.level === "adset" ? variables.id : undefined,
        adId: variables.level === "ad" ? variables.id : undefined,
      }),
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
    onSuccess: (_data, variables) => invalidateCampaigns(queryClient, { campaignId: variables.campaignId, adId: variables.adId }),
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
    onSuccess: (_data, variables) => invalidateCampaigns(queryClient, { campaignId: variables.campaignId, adId: variables.adId }),
  });
}

export function useArchiveCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: string) => fetchJson(`/api/meta-ads/campaigns/${campaignId}`, { method: "DELETE" }),
    onSuccess: (_data, campaignId) => invalidateCampaigns(queryClient, { campaignId }),
  });
}

/** "+ Add Ad Set" on an existing campaign — Campaign Detail page. Creates
 * an empty Ad Set only, no Ad yet. */
export function useCreateAdSet(campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdSetInput) =>
      fetchJson<{ success: true; adSetId: string; externalAdSetId: string }>(`/api/meta-ads/campaigns/${campaignId}/ad-sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateCampaigns(queryClient, { campaignId }),
  });
}

/** "Create Ad" on an existing Ad Set — Ad Set Detail page. */
export function useCreateAd(adSetId: string, campaignId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdInput) =>
      fetchJson<{ success: true; adId: string }>(`/api/meta-ads/campaigns/ad-sets/${adSetId}/ads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateCampaigns(queryClient, { campaignId, adSetId }),
  });
}
