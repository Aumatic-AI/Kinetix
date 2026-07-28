import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MetaAdsService } from "../services/meta-ads.service";
import { createClient } from "@/lib/supabase/client";
import { CreativeFilters, PaginationOptions, MetaAdCreative } from "../types/meta-ads.types";

const supabase = createClient();

export const metaAdsKeys = {
  all: ["meta-ads"] as const,
  creatives: (filters?: CreativeFilters, pagination?: PaginationOptions) => 
    [...metaAdsKeys.all, "creatives", filters, pagination] as const,
  creative: (id: string) => [...metaAdsKeys.all, "creatives", id] as const,
};

export function useMetaAdCreatives(filters?: CreativeFilters, pagination?: PaginationOptions) {
  return useQuery({
    queryKey: metaAdsKeys.creatives(filters, pagination),
    queryFn: () => MetaAdsService.getCreatives(supabase, filters, pagination),
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
