"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Image as ImageIcon, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CreateAdModal } from "../components/ad-library/CreateAdModal";
import { MediaPreview } from "@/components/global/MediaPreview";
import { AdCreativeCard } from "../components/ad-library/AdCreativeCard";
import { Button } from "@/components/ui/Button";

import { useQueryClient } from "@tanstack/react-query";
import { useMetaAdCreatives, useUpdateMetaAdCreative, useDeleteMetaAdCreative, useRetryMetaAdCreative, metaAdsKeys } from "../hooks/useAdLibrary";
import { MetaAdCreativeListItem } from "../types/meta-ads.types";

export function AdLibrary() {
  const { data: ads = [], isLoading: loading } = useMetaAdCreatives();
  const updateMutation = useUpdateMetaAdCreative();
  const deleteMutation = useDeleteMetaAdCreative();
  const retryMutation = useRetryMetaAdCreative();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState<MetaAdCreativeListItem | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("meta_ad_creatives_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meta_ad_creatives" },
        () => {
          queryClient.invalidateQueries({ queryKey: metaAdsKeys.creatives() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, supabase]);

  const handleApprove = async (id: string) => {
    await updateMutation.mutateAsync({ id, data: { status: "approved" } });
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const handleRetry = async (id: string) => {
    await retryMutation.mutateAsync(id);
  };

  const statusCounts = {
    all: ads.length,
    review: ads.filter((a) => a.status === "review").length,
    failed: ads.filter((a) => a.status === "failed").length,
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-40 bg-surface animate-pulse rounded-lg" />
            <div className="h-4 w-24 bg-surface animate-pulse rounded-lg mt-2" />
          </div>
          <div className="h-10 w-32 bg-surface animate-pulse rounded-lg" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 15 }, (_, i) => (
            <div key={i} className="bg-background rounded-lg border border-border flex flex-col overflow-hidden shadow-sm">
              <div className="w-full aspect-video bg-surface border-b border-border shrink-0 animate-pulse" />
              <div className="p-3 flex flex-col flex-1 justify-between gap-3">
                <div>
                  <div className="h-3 w-3/4 bg-surface rounded mb-2 animate-pulse" />
                  <div className="h-2 w-1/2 bg-surface rounded animate-pulse" />
                </div>
                <div>
                  <div className="h-2 w-16 bg-surface rounded animate-pulse mb-3" />
                  <div className="h-7 w-full bg-surface rounded-md animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-text">Ad Creatives</h2>
          <p className="text-sm text-muted mt-1">
            {statusCounts.all} total
            {statusCounts.failed > 0 && (
              <span className="text-danger font-semibold"> · {statusCounts.failed} failed</span>
            )}
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
          Create Ad
        </Button>
      </div>


      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {ads.map((ad, idx) => (
          <AdCreativeCard
            key={ad.id}
            ad={ad}
            index={idx}
            onSelect={setSelectedAd}
            onApprove={handleApprove}
            onDelete={handleDelete}
            onRetry={handleRetry}
            isRetrying={retryMutation.isPending && retryMutation.variables === ad.id}
          />
        ))}
      </div>

      {/* Empty State */}
      {ads.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-24 text-center border-2 border-dashed border-default rounded-lg flex flex-col items-center"
        >
          <div className="w-16 h-16 bg-surface rounded-lg flex items-center justify-center mb-4">
            <ImageIcon className="w-8 h-8 text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">No creatives yet</h3>
          <p className="text-muted mb-6 max-w-xs">Generate your first AI-powered ad creative to get started.</p>
          <Button
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Create Your First Ad
          </Button>
        </motion.div>
      )}

      <CreateAdModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: metaAdsKeys.creatives() })}
      />

      <MediaPreview
        open={!!selectedAd}
        onClose={() => setSelectedAd(null)}
        mediaUrl={selectedAd?.media_urls?.[0] || null}
        type={selectedAd?.type === "video" ? "video" : "image"}
        duration={selectedAd?.duration}
      />
    </div>
  );
}
