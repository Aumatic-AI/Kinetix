import React, { useState } from "react";
import { motion } from "framer-motion";
import { Play, Check, Clock, Video, Image as ImageIcon, Sparkles, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { MetaAdCreativeListItem } from "../../types/meta-ads.types";

interface AdCreativeCardProps {
  ad: MetaAdCreativeListItem;
  index: number;
  onSelect: (ad: MetaAdCreativeListItem) => void;
  onApprove: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onRetry: (id: string) => void;
  isRetrying?: boolean;
}

export function AdCreativeCard({ ad, index, onSelect, onApprove, onDelete, onRetry, isRetrying }: AdCreativeCardProps) {
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState("");

  const confirmReject = async () => {
    setRejectError("");
    setRejecting(true);
    try {
      await onDelete(ad.id);
      setConfirmingReject(false);
    } catch (e) {
      setRejectError(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setRejecting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group flex flex-col bg-background border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow relative"
    >
      {/* AI Generating Overlay */}
      {ad.status === "pending" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="relative w-8 h-8 mb-2">
            <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin" />
            <Sparkles className="absolute inset-0 m-auto w-3 h-3 text-primary animate-pulse" />
          </div>
          <p className="text-xs font-semibold text-text">Generating...</p>
        </div>
      )}

      {/* Media Thumbnail (Top) */}
      <div
        onClick={() => onSelect(ad)}
        className="relative w-full aspect-video bg-surface flex items-center justify-center overflow-hidden shrink-0 border-b border-border cursor-pointer"
      >
        {ad.media_urls?.[0] ? (
          ad.type === "video" ? (
            <video
              src={ad.media_urls[0]}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              preload="metadata"
              muted
              playsInline
            />
          ) : (
            <img
              src={ad.media_urls[0]}
              alt="creative thumbnail"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.parentElement?.querySelector(".fallback-icon");
                if (fallback) (fallback as HTMLElement).style.display = "flex";
              }}
            />
          )
        ) : (
          <div className="text-muted">
            {ad.type === "video" ? <Video size={32} /> : <ImageIcon size={32} />}
          </div>
        )}

        {/* Fallback Icon for image errors */}
        {ad.type !== "video" && (
          <div className="fallback-icon hidden absolute inset-0 w-full h-full items-center justify-center text-muted bg-surface z-0">
            <ImageIcon size={32} />
          </div>
        )}

        {/* Video play overlay */}
        {ad.type === "video" && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
            <div className="w-8 h-8 bg-background rounded-full flex items-center justify-center shadow-md">
              <Play className="w-4 h-4 text-text ml-0.5" fill="currentColor" />
            </div>
          </div>
        )}



        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          {ad.status === "approved" && (
            <span className="px-1.5 py-0.5 rounded bg-background/90 backdrop-blur-md border border-success/30 text-success text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Check size={10} /> Approved
            </span>
          )}
          {ad.status === "review" && (
            <span className="px-1.5 py-0.5 rounded bg-background/90 backdrop-blur-md border border-border text-muted text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Clock size={10} /> Review
            </span>
          )}
          {ad.status === "failed" && (
            <span className="px-1.5 py-0.5 rounded bg-background/90 backdrop-blur-md border border-danger/30 text-danger text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle size={10} /> Failed
            </span>
          )}
        </div>
      </div>

      {/* Content Section (Bottom) */}
      <div className="p-3 flex flex-col flex-1 bg-background">
        <div className="flex items-center justify-between text-[10px] text-muted font-medium mb-3">
          {ad.duration ? <span>{ad.duration}</span> : <span />}
          {ad.type === "video" ? <Video size={12} /> : <ImageIcon size={12} />}
        </div>

        <div className="flex items-center gap-2 w-full">
          {ad.status === "review" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmingReject(true)}
                className="flex-1 text-danger hover:bg-danger-bg hover:text-danger border-danger/30 h-7 text-[11px]"
              >
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => onApprove(ad.id)}
                className="flex-1 bg-success text-white hover:opacity-90 h-7 text-[11px]"
              >
                Approve
              </Button>
            </>
          ) : ad.status === "failed" ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 h-7 text-[11px]"
                onClick={() => onSelect(ad)}
              >
                Preview
              </Button>
              <Button
                size="sm"
                variant="primary"
                className="flex-1 shadow-sm h-7 text-[11px] gap-1"
                onClick={() => onRetry(ad.id)}
                disabled={isRetrying}
                icon={<RefreshCw className={`w-3 h-3 ${isRetrying ? "animate-spin" : ""}`} />}
              >
                {isRetrying ? "Retrying..." : "Retry"}
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 h-7 text-[11px]"
              onClick={() => onSelect(ad)}
            >
              Preview
            </Button>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmingReject}
        onOpenChange={(open) => { if (!open && !rejecting) { setConfirmingReject(false); setRejectError(""); } }}
        title="Reject this creative?"
        description="This permanently deletes the creative. This can't be undone."
        confirmLabel="Reject"
        variant="destructive"
        loading={rejecting}
        error={rejectError}
        onConfirm={confirmReject}
      />
    </motion.div>
  );
}
