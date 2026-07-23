import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrapeJob, StartScrapeInput } from "../types/outreach.types";

export const scrapeJobsKeys = {
  all: ["outreach-scrape-jobs"] as const,
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

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
