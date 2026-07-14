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
