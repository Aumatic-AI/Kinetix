import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OutreachCampaign, CreateOutreachCampaignInput } from "../types/outreach.types";

export const outreachKeys = {
  all: ["outreach"] as const,
  campaigns: () => [...outreachKeys.all, "campaigns"] as const,
  campaign: (id: string) => [...outreachKeys.all, "campaigns", id] as const,
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function useOutreachCampaigns() {
  return useQuery({
    queryKey: outreachKeys.campaigns(),
    queryFn: () => fetchJson<{ campaigns: OutreachCampaign[] }>("/api/outreach/campaigns").then((d) => d.campaigns),
  });
}

export function useOutreachCampaign(id: string | null) {
  return useQuery({
    queryKey: outreachKeys.campaign(id || ""),
    queryFn: () => fetchJson<{ campaign: OutreachCampaign }>(`/api/outreach/campaigns/${id}`).then((d) => d.campaign),
    enabled: !!id,
  });
}

export function useCreateOutreachCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOutreachCampaignInput) =>
      fetchJson<{ campaign: OutreachCampaign }>("/api/outreach/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: outreachKeys.campaigns() }),
  });
}

export function useRegenerateOutreachCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, feedback }: { campaignId: string; feedback: string }) =>
      fetchJson(`/api/outreach/campaigns/${campaignId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feedback }) }),
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: outreachKeys.campaign(variables.campaignId) }),
  });
}

export function useEditOutreachCampaignContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, subject, body }: { campaignId: string; subject: string; body: string }) =>
      fetchJson(`/api/outreach/campaigns/${campaignId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ manualEdit: { subject, body } }) }),
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: outreachKeys.campaign(variables.campaignId) }),
  });
}

export function useApproveOutreachCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson(`/api/outreach/campaigns/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approve: true }) }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: outreachKeys.campaigns() });
      queryClient.invalidateQueries({ queryKey: outreachKeys.campaign(id) });
    },
  });
}

export function useSendOutreachCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, listId }: { id: string; listId?: string }) =>
      fetchJson(`/api/outreach/campaigns/${id}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listId }) }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: outreachKeys.campaigns() });
      queryClient.invalidateQueries({ queryKey: outreachKeys.campaign(variables.id) });
    },
  });
}

export function useDeleteOutreachCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson(`/api/outreach/campaigns/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: outreachKeys.campaigns() }),
  });
}

export function useOutreachAnalytics() {
  return useQuery({
    queryKey: [...outreachKeys.all, "analytics"] as const,
    queryFn: () => fetchJson<{ counts: Record<string, number>; totalCampaignsSent: number; totalLeads: number }>("/api/outreach/analytics"),
  });
}
