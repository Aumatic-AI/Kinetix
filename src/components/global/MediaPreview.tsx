"use client";
import { Video as VideoIcon, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/** A big, focused preview of one image or video — opened by the play
 * button on a creative thumbnail wherever creatives are picked (Ad Library,
 * the creative picker dialog, Campaign Details). Deliberately just the
 * media itself, no copy/metadata alongside it — this is for looking closely
 * at the asset, not reading about it. */
export function MediaPreview({
  open,
  onClose,
  mediaUrl,
  type,
}: {
  open: boolean;
  onClose: () => void;
  mediaUrl: string | null;
  type: "video" | "image";
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl sm:max-w-3xl bg-black border-border p-0 sm:rounded-xl gap-0 overflow-hidden outline-none shadow-lg">
        <div className="relative w-full aspect-[9/16] max-h-[85vh] mx-auto bg-black flex items-center justify-center">
          {mediaUrl ? (
            type === "video" ? (
              <video src={mediaUrl} className="w-full h-full object-contain" controls autoPlay />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl} alt="" className="w-full h-full object-contain" />
            )
          ) : (
            <div className="text-white/50 flex flex-col items-center gap-2">
              {type === "video" ? <VideoIcon size={40} /> : <ImageIcon size={40} />}
              <p className="text-sm font-medium">Media not available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
