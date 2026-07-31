import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { MetaAdsService } from "../services/meta-ads.service";
import { createClient } from "@/lib/supabase/client";
import { CreativeFilters, PaginationOptions, MetaAdCreative, MetaAdCreativeListItem } from "../types/meta-ads.types";
import { generationRefetchInterval } from "@/lib/generation-polling";
import { paginationMeta, PaginationMeta } from "@/lib/pagination";

const supabase = createClient();

export const metaAdsKeys = {
  all: ["meta-ads"] as const,
  creatives: (filters?: CreativeFilters, pagination?: PaginationOptions) =>
    [...metaAdsKeys.all, "creatives", filters, pagination] as const,
  creative: (id: string) => [...metaAdsKeys.all, "creatives", id] as const,
};

const IN_PROGRESS_CREATIVE_STATUSES = ["pending", "processing"];

// Realistic floor before a creative could possibly be done, derived from
// the actual pipeline (see generate-image-ad.ts/generate-video-ad.ts):
// image = intelligence fetch + script LLM call + Kie image trigger + its
// own poll (first check at 8s); video = script + visual-prompts LLM calls
// + TTS + per-scene image generation (poll starts at 30s) + per-scene
// video generation (poll starts at 40s) + FFmpeg stitch — genuinely
// minutes, not seconds, even in the fastest realistic case.
const CREATIVE_WARMUP_MS: Record<string, number> = { image: 20_000, video: 120_000 };
const CREATIVE_STEADY_POLL_MS: Record<string, number> = { image: 8_000, video: 20_000 };

export interface MetaAdCreativesPage extends PaginationMeta {
  items: MetaAdCreativeListItem[];
  statusCounts: { all: number; review: number; failed: number };
}

export function useMetaAdCreatives(pagination: Required<PaginationOptions>, filters?: CreativeFilters) {
  return useQuery({
    queryKey: metaAdsKeys.creatives(filters, pagination),
    queryFn: async (): Promise<MetaAdCreativesPage> => {
      const [{ data, total }, statusCounts] = await Promise.all([
        MetaAdsService.getCreatives(supabase, filters, pagination),
        MetaAdsService.getCreativeCounts(supabase),
      ]);
      return { items: data, statusCounts, ...paginationMeta(total, pagination.page, pagination.limit) };
    },
    refetchInterval: (query) => generationRefetchInterval<MetaAdCreativeListItem>(
      query.state.data?.items,
      IN_PROGRESS_CREATIVE_STATUSES,
      (row) => CREATIVE_WARMUP_MS[row.type] ?? CREATIVE_WARMUP_MS.image,
      (row) => CREATIVE_STEADY_POLL_MS[row.type] ?? CREATIVE_STEADY_POLL_MS.image
    ),
    placeholderData: keepPreviousData,
  });
}

/** For CampaignPickCreativeDialog — needs idea_prompt/ad_script/service to
 * pre-fill ad copy on pick, so it can't use the narrower useMetaAdCreatives. */
export function useMetaAdCreativesForPicker(filters?: CreativeFilters) {
  return useQuery({
    queryKey: [...metaAdsKeys.creatives(filters), "picker"] as const,
    queryFn: () => MetaAdsService.getCreativesForPicker(supabase, filters),
  });
}

export function useMetaAdCreative(id: string) {
  return useQuery({
    queryKey: metaAdsKeys.creative(id),
    queryFn: () => MetaAdsService.getCreativeById(supabase, id),
    enabled: !!id,
  });
}

export function useCreateMetaAdCreative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<MetaAdCreative>) => MetaAdsService.createCreative(supabase, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: metaAdsKeys.creatives() });
    },
  });
}

export function useUpdateMetaAdCreative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MetaAdCreative> }) => 
      MetaAdsService.updateCreative(supabase, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: metaAdsKeys.creatives() });
    },
  });
}

export function useDeleteMetaAdCreative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => MetaAdsService.deleteCreative(supabase, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: metaAdsKeys.creatives() });
    },
  });
}

export function useRetryMetaAdCreative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/meta-ads/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to retry generation");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: metaAdsKeys.creatives() });
    },
  });
}
