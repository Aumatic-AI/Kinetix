"use client";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Play, Sparkles, Clock, Video, Image as ImageIcon, Rocket } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/utils/datetime";
import { MetaAdCreative } from "../types/meta-ads.types";

interface AdDetailsModalProps {
  ad: MetaAdCreative | null;
  onClose: () => void;
}

export function AdDetailsModal({ ad, onClose }: AdDetailsModalProps) {
  return (
    <Dialog open={!!ad} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl bg-background border-border text-text p-0 overflow-hidden outline-none flex shadow-lg h-[85vh] gap-0">
        
        {/* Left Side: Media Player (55% width) */}
        <div className="w-[55%] bg-black relative flex items-center justify-center shrink-0 h-full border-r border-border">
          {ad?.media_urls?.[0] ? (
            ad.type === "video" ? (
              <video 
                src={ad.media_urls[0]} 
                controls 
                autoPlay 
                className="w-full h-full object-contain"
              />
            ) : (
              <Image
                src={ad.media_urls[0]}
                alt="Ad Creative"
                fill
                unoptimized
                sizes="55vw"
                className="object-contain"
              />
            )
          ) : (
            <div className="text-white/50 flex flex-col items-center gap-2">
              {ad?.type === "video" ? <Video size={48} /> : <ImageIcon size={48} />}
              <p className="text-sm font-medium">Media not available</p>
            </div>
          )}
        </div>
        
        {/* Right Side: Details Panel (45% width, scrollable) */}
        <div className="w-[45%] p-8 overflow-y-auto h-full flex flex-col gap-6 bg-surface">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded-md bg-background border border-border text-xs font-bold uppercase tracking-wider text-primary">
                {ad?.type || "image"}
              </span>
              {ad?.duration && (
                <span className="px-2.5 py-1 rounded-md bg-background border border-border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted">
                  <Clock size={12} /> {ad.duration}
                </span>
              )}
            </div>
            <DialogTitle className="text-2xl font-bold mb-1 text-text">Ad Details</DialogTitle>
            <p className="text-sm text-muted">Created on {ad && formatDateTime(ad.created_at)}</p>
          </div>

          {ad?.idea_prompt && (
            <div className="bg-background border border-border rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-muted uppercase mb-3 flex items-center gap-2">
                <Sparkles size={14} className="text-primary" /> Prompt / Idea
              </h4>
              <p className="text-sm text-text leading-relaxed">{ad.idea_prompt}</p>
            </div>
          )}

          {ad?.ad_script?.headline && (
            <div className="bg-background border border-border rounded-xl p-5 shadow-sm">
              <h4 className="text-xs font-bold text-muted uppercase mb-3">Generated Copy</h4>
              <p className="text-base font-bold text-text mb-2">{ad.ad_script.headline}</p>
              {ad.ad_script.primary_text && (
                <p className="text-sm text-muted leading-relaxed">{ad.ad_script.primary_text}</p>
              )}
            </div>
          )}

          <div className="mt-auto pt-6 flex justify-end gap-3 border-t border-border">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Close
            </Button>
            {ad?.status === "approved" && (
              <Button 
                variant="primary"
                className="shadow-sm w-full sm:w-auto"
                icon={<Rocket className="w-4 h-4" />}
              >
                Launch Campaign
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
