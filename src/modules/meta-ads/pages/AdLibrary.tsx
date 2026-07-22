"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Check, X, Clock, Video, Image as ImageIcon, Sparkles, Plus, Eye, Rocket } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CreateAdModal } from "../components/CreateAdModal";
import { AdDetailsModal } from "../components/AdDetailsModal";
import { AdCreativeCard } from "../components/AdCreativeCard";
import { LaunchCampaignModal } from "../components/campaigns/LaunchCampaignModal";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { useQueryClient } from "@tanstack/react-query";
import { useMetaAdCreatives, useUpdateMetaAdCreative, useDeleteMetaAdCreative, useRetryMetaAdCreative, metaAdsKeys } from "../hooks/useMetaAds";
import { useLaunchedCreativeIds } from "../hooks/useCampaigns";
import { MetaAdCreative } from "../types/meta-ads.types";

export function AdLibrary() {
  const { data: ads = [], isLoading: loading } = useMetaAdCreatives();
  const { data: launchedIds } = useLaunchedCreativeIds();
  const updateMutation = useUpdateMetaAdCreative();
  const deleteMutation = useDeleteMetaAdCreative();
  const retryMutation = useRetryMetaAdCreative();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState<MetaAdCreative | null>(null);
  const [launchingAd, setLaunchingAd] = useState<MetaAdCreative | null>(null);
  const [prefillValues, setPrefillValues] = useState<{ type?: "video" | "image"; duration?: string; idea?: string; service?: string } | undefined>();
  const supabase = createClient();

  // Auto-open Create Ad, pre-filled, when arriving from the Competitors
  // page's "Create Ad" action on a ready-to-launch script.
  useEffect(() => {
    const raw = window.sessionStorage.getItem("kinetix_prefill_ad");
    if (raw) {
      try {
        setPrefillValues(JSON.parse(raw));
        setIsModalOpen(true);
      } catch {
        // ignore malformed payload
      }
      window.sessionStorage.removeItem("kinetix_prefill_ad");
    }
  }, []);

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

  const filteredAds =
    filter === "all"
      ? ads
      : ads.filter((ad) => ad.type?.toLowerCase() === filter);

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
    approved: ads.filter((a) => a.status === "approved").length,
    pending: ads.filter((a) => a.status === "pending" || a.status === "processing").length,
    review: ads.filter((a) => a.status === "review").length,
    failed: ads.filter((a) => a.status === "failed").length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-40 bg-surface animate-pulse rounded-lg" />
          <div className="flex gap-3">
            <div className="h-10 w-36 bg-surface animate-pulse rounded-lg" />
            <div className="h-10 w-36 bg-surface animate-pulse rounded-lg" />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-background rounded-lg border border-border flex flex-col overflow-hidden shadow-sm">
              <div className="w-full aspect-video bg-surface border-b border-border shrink-0 animate-pulse"></div>
              <div className="p-3 flex flex-col flex-1 justify-between">
                <div>
                  <div className="h-3 w-3/4 bg-surface rounded mb-2 animate-pulse"></div>
                  <div className="h-2 w-1/3 bg-surface rounded animate-pulse"></div>
                </div>
                <div className="flex items-center justify-between mt-auto pt-4">
                  <div className="h-2 w-16 bg-surface rounded animate-pulse"></div>
                  <div className="h-7 w-20 bg-surface rounded-md animate-pulse"></div>
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
            {statusCounts.all} total · {statusCounts.approved} approved · {statusCounts.pending} generating
            {statusCounts.failed > 0 && (
              <span className="text-danger font-semibold"> · {statusCounts.failed} failed</span>
            )}
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
          Create Ad
        </Button>
      </div>

      {/* Tabs removed temporarily */}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredAds.map((ad, idx) => (
          <AdCreativeCard
            key={ad.id}
            ad={ad}
            index={idx}
            onSelect={setSelectedAd}
            onApprove={handleApprove}
            onDelete={handleDelete}
            onRetry={handleRetry}
            isRetrying={retryMutation.isPending && retryMutation.variables === ad.id}
            launched={launchedIds?.has(ad.id)}
            onLaunch={setLaunchingAd}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredAds.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-24 text-center border-2 border-dashed border-default rounded-lg flex flex-col items-center"
        >
          <div className="w-16 h-16 bg-surface rounded-lg flex items-center justify-center mb-4">
            <ImageIcon className="w-8 h-8 text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">No creatives yet</h3>
          <p className="text-muted mb-6 max-w-xs">
            {filter === "all"
              ? "Generate your first AI-powered ad creative to get started."
              : `No creatives with status "${filter}" found.`}
          </p>
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
        onClose={() => { setIsModalOpen(false); setPrefillValues(undefined); }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: metaAdsKeys.creatives() })}
        initialValues={prefillValues}
      />

      <AdDetailsModal ad={selectedAd} onClose={() => setSelectedAd(null)} />

      <LaunchCampaignModal
        creative={launchingAd}
        onClose={() => setLaunchingAd(null)}
        onLaunched={() => queryClient.invalidateQueries({ queryKey: metaAdsKeys.creatives() })}
      />
    </div>
  );
}
