import { useQuery, useInfiniteQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Lead, LeadSummary, LeadFilters, LeadList, LeadListSummary, LeadCampaignHistoryEntry } from "../types/leads.types";
import { ScrapeJob, StartScrapeInput } from "../types/outreach.types";
import { PaginationMeta } from "@/lib/pagination";

export const leadsKeys = {
  all: ["leads"] as const,
  list: (filters?: LeadFilters, page?: number) => [...leadsKeys.all, "list", filters, page] as const,
  infiniteList: (filters?: LeadFilters, limit?: number) => [...leadsKeys.all, "infinite-list", filters, limit] as const,
  lists: () => [...leadsKeys.all, "lists"] as const,
  history: (leadId: string) => [...leadsKeys.all, "history", leadId] as const,
};

export const scrapeJobsKeys = {
  all: ["outreach-scrape-jobs"] as const,
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
    queryFn: () => fetchJson<{ leads: LeadSummary[]; count: number }>(`/api/outreach/leads?${buildLeadsParams(filters, page, limit).toString()}`),
  });
}

/** Infinite-scroll pagination — fetches one page (default 30 leads) at a
 * time instead of the whole list up front. Call fetchNextPage() when the
 * scroll container nears its bottom; hasNextPage/isFetchingNextPage drive
 * the loading state. */
export function useInfiniteLeads(filters?: LeadFilters, limit = 30) {
  return useInfiniteQuery({
    queryKey: leadsKeys.infiniteList(filters, limit),
    queryFn: ({ pageParam }) => fetchJson<{ leads: LeadSummary[]; count: number }>(`/api/outreach/leads?${buildLeadsParams(filters, pageParam, limit).toString()}`),
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

export interface LeadListWithCount extends LeadListSummary {
  leadCount: number;
}

/** The full list, unpaginated — for pickers/dropdowns that need every list
 * at once (FindLeadsModal, NewCampaignPage). For the Leads page's
 * paginated table, use usePaginatedLeadLists instead. */
export function useLeadLists() {
  return useQuery({
    queryKey: leadsKeys.lists(),
    queryFn: () => fetchJson<{ lists: LeadListWithCount[] }>("/api/outreach/lists").then((d) => d.lists),
    staleTime: 60 * 1000,
  });
}

/** The Leads page's paginated table — same underlying route as
 * useLeadLists, just with page/limit passed so the response comes back
 * paginated (see the route's own comment). */
export function usePaginatedLeadLists(page: number, limit: number) {
  return useQuery({
    queryKey: [...leadsKeys.lists(), "paginated", page, limit] as const,
    queryFn: () => fetchJson<{ lists: LeadListWithCount[] } & PaginationMeta>(`/api/outreach/lists?page=${page}&limit=${limit}`),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
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

/** "Find Leads" (Leads tab) — kicks off a background scrape job, recorded in
 * outreach_scrape_jobs. Polled directly by ScrapeProgressBanner while a job
 * is queued/running — this is the only source of truth for that banner,
 * no realtime broadcast or global jobs widget involved. */
export function useScrapeJobs() {
  return useQuery({
    queryKey: scrapeJobsKeys.all,
    queryFn: () => fetchJson<{ jobs: ScrapeJob[] }>("/api/outreach/scrape/jobs").then((d) => d.jobs),
    refetchInterval: (query) => {
      const jobs = (query.state.data as ScrapeJob[] | undefined) || [];
      return jobs.some((j) => j.status === "queued" || j.status === "running") ? 4000 : false;
    },
  });
}

export function useStartScrape() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StartScrapeInput) =>
      fetchJson<{ success: true; job: ScrapeJob }>("/api/outreach/scrape", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scrapeJobsKeys.all }),
  });
}
