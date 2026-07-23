import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Lead, LeadFilters, LeadList, LeadCampaignHistoryEntry } from "../types/leads.types";

export const leadsKeys = {
  all: ["leads"] as const,
  list: (filters?: LeadFilters, page?: number) => [...leadsKeys.all, "list", filters, page] as const,
  infiniteList: (filters?: LeadFilters, limit?: number) => [...leadsKeys.all, "infinite-list", filters, limit] as const,
  lists: () => [...leadsKeys.all, "lists"] as const,
  history: (leadId: string) => [...leadsKeys.all, "history", leadId] as const,
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function buildLeadsParams(filters: LeadFilters | undefined, page: number, limit: number): URLSearchParams {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters?.listId) params.set("listId", filters.listId);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.excludeStatuses?.length) params.set("excludeStatuses", filters.excludeStatuses.join(","));
  return params;
}

export function useLeads(filters?: LeadFilters, page = 1, limit = 50) {
  return useQuery({
    queryKey: leadsKeys.list(filters, page),
    queryFn: () => fetchJson<{ leads: Lead[]; count: number }>(`/api/outreach/leads?${buildLeadsParams(filters, page, limit).toString()}`),
  });
}

/** Infinite-scroll pagination — fetches one page (default 30 leads) at a
 * time instead of the whole list up front. Call fetchNextPage() when the
 * scroll container nears its bottom; hasNextPage/isFetchingNextPage drive
 * the loading state. */
export function useInfiniteLeads(filters?: LeadFilters, limit = 30) {
  return useInfiniteQuery({
    queryKey: leadsKeys.infiniteList(filters, limit),
    queryFn: ({ pageParam }) => fetchJson<{ leads: Lead[]; count: number }>(`/api/outreach/leads?${buildLeadsParams(filters, pageParam, limit).toString()}`),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const fetchedSoFar = allPages.reduce((sum, p) => sum + p.leads.length, 0);
      return fetchedSoFar < lastPage.count ? allPages.length + 1 : undefined;
    },
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; firstName?: string; lastName?: string; phone?: string; company?: string; listId?: string }) =>
      fetchJson<{ success: true; lead: Lead }>("/api/outreach/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsKeys.all }),
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; firstName?: string; lastName?: string; phone?: string; company?: string; listId?: string; status?: string }) =>
      fetchJson(`/api/outreach/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsKeys.all }),
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson(`/api/outreach/leads/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsKeys.all }),
  });
}

export function useLeadCampaignHistory(leadId: string | null) {
  return useQuery({
    queryKey: leadsKeys.history(leadId || ""),
    queryFn: () => fetchJson<{ history: LeadCampaignHistoryEntry[] }>(`/api/outreach/leads/${leadId}/history`).then((d) => d.history),
    enabled: !!leadId,
  });
}

export interface LeadListWithCount extends LeadList {
  leadCount: number;
}

export function useLeadLists() {
  return useQuery({
    queryKey: leadsKeys.lists(),
    queryFn: () => fetchJson<{ lists: LeadListWithCount[] }>("/api/outreach/lists").then((d) => d.lists),
    staleTime: 60 * 1000,
  });
}

export function useCreateLeadList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => fetchJson<{ success: true; list: LeadList }>("/api/outreach/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsKeys.lists() }),
  });
}

export function useRenameLeadList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => fetchJson(`/api/outreach/lists/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsKeys.lists() }),
  });
}

export function useDeleteLeadList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson(`/api/outreach/lists/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: leadsKeys.all }),
  });
}
