"use client";
import { Video, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMetaAdCreatives } from "../../hooks/useMetaAds";
import { MetaAdCreative } from "../../types/meta-ads.types";

/** "Launch New Campaign" from the Campaigns tab has no creative in hand
 * yet (unlike the Ad Library "Launch" button, which already knows which
 * one) — this picks one from every approved creative before handing off
 * to LaunchCampaignModal. */
export function CampaignPickCreativeDialog({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (creative: MetaAdCreative) => void }) {
  const { data: ads = [] } = useMetaAdCreatives({ status: "approved" });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl sm:max-w-3xl bg-background border-border text-text p-0 sm:rounded-xl gap-0 overflow-hidden outline-none flex flex-col h-[75vh] shadow-lg">
        <DialogHeader className="px-6 py-5 border-b border-border shrink-0">
          <DialogTitle>Pick a creative to launch</DialogTitle>
          <p className="text-xs text-muted">Only approved creatives can be launched — approve one in Ad Library first if you don&apos;t see it here.</p>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6">
          {ads.length === 0 ? (
            <div className="py-16 text-center text-muted text-sm">No approved creatives yet.</div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {ads.map((ad) => (
                <button
                  key={ad.id}
                  onClick={() => onPick(ad)}
                  className="text-left rounded-lg border border-border overflow-hidden hover:border-primary hover:shadow-md transition-all bg-background"
                >
                  <div className="aspect-video bg-surface flex items-center justify-center">
                    {ad.media_urls?.[0] ? (
                      ad.type === "video" ? (
                        <video src={ad.media_urls[0]} className="w-full h-full object-cover" muted preload="metadata" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ad.media_urls[0]} alt="" className="w-full h-full object-cover" />
                      )
                    ) : ad.type === "video" ? (
                      <Video className="w-6 h-6 text-muted" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-muted" />
                    )}
                  </div>
                  <p className="p-2 text-xs font-semibold text-text line-clamp-2">{ad.idea_prompt || ad.ad_script?.headline || "Untitled creative"}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
