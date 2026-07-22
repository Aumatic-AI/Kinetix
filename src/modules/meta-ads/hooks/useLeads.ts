import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Lead {
  id: string;
  created_at: string;
  meta_lead_id: string;
  meta_form_id: string | null;
  ad_id: string | null;
  ad_name: string | null;
  adset_name: string | null;
  campaign_name: string | null;
  field_data: Record<string, string>;
}

export const leadsKeys = {
  all: ["leads"] as const,
  list: () => [...leadsKeys.all, "list"] as const,
  forms: () => [...leadsKeys.all, "forms"] as const,
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

/** Reads straight from our own leads table — populated by the webhook in
 * real time, so unlike Campaigns/Reports there's no live Meta call here. */
export function useLeadsList() {
  return useQuery({
    queryKey: leadsKeys.list(),
    queryFn: () => fetchJson<{ leads: Lead[] }>("/api/meta-ads/leads").then((d) => d.leads),
  });
}

/** User-triggered only — backfills anything submitted before the webhook
 * was registered, or while it was down. Never called automatically. */
export function useSyncLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fetchJson<{ success: true; formsChecked: number; leadsImported: number }>("/api/meta-ads/leads/sync", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsKeys.list() }),
  });
}

export function useLeadForms() {
  return useQuery({
    queryKey: leadsKeys.forms(),
    queryFn: () => fetchJson<{ forms: { id: string; name: string; status: string }[] }>("/api/meta-ads/lead-forms").then((d) => d.forms),
    retry: false,
  });
}

export function useCreateLeadForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; presetQuestions?: string[]; customQuestions?: string[]; thankYouUrl?: string }) =>
      fetchJson("/api/meta-ads/lead-forms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsKeys.forms() }),
  });
}

export function useArchiveLeadForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formId: string) => fetchJson(`/api/meta-ads/lead-forms?formId=${formId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsKeys.forms() }),
  });
}
