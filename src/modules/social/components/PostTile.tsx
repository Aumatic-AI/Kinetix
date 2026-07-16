"use client";
import { useState } from "react";
import { Loader2, Video, Image as ImageIcon, AlertCircle, Send, Info, RotateCcw } from "lucide-react";
import { PostGroup, groupState } from "../lib/postGroups";
import { Lightbox } from "./Lightbox";

interface PostTileProps {
  group: PostGroup;
  onPublish: (group: PostGroup) => void;
  onViewDetails: (group: PostGroup) => void;
  onRetry: (group: PostGroup) => void;
}

export function PostTile({ group, onPublish, onViewDetails, onRetry }: PostTileProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const state = groupState(group);
  const isVideo = group.mediaType === "video";

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden bg-surface mb-4 break-inside-avoid group">
        {group.thumbnailUrl ? (
          <div className="cursor-zoom-in" onClick={() => setLightboxOpen(true)}>
            {isVideo ? (
              <video src={group.thumbnailUrl} className="w-full h-auto block" muted preload="metadata" />
            ) : (
              <img src={group.thumbnailUrl} alt="" className="w-full h-auto block" />
            )}
          </div>
        ) : (
          <div className="w-full aspect-[4/5] flex items-center justify-center text-muted">
            {state === "generating" ? <Loader2 className="w-6 h-6 animate-spin" /> : group.format === "video" ? <Video className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
          </div>
        )}

        {state === "generating" && (
          <span className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/60 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full pointer-events-none">
            <Loader2 className="w-3 h-3 animate-spin" /> Generating
          </span>
        )}
        {state === "failed" && (
          <span className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-danger text-white text-[11px] font-semibold px-2.5 py-1 rounded-full pointer-events-none">
            <AlertCircle className="w-3 h-3" /> Failed
          </span>
        )}

        {state !== "generating" && (
          <div className="absolute inset-x-0 bottom-0 p-3 pt-10 bg-gradient-to-t from-black/75 via-black/25 to-transparent opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center">
            {state === "published" && (
              <button
                onClick={(e) => { e.stopPropagation(); onViewDetails(group); }}
                className="flex items-center gap-1.5 text-xs font-bold text-[#050505] bg-white hover:bg-white/90 rounded-lg px-4 py-2 transition-colors shadow-lg"
              >
                <Info className="w-3.5 h-3.5" /> View Details
              </button>
            )}
            {state === "draft" && (
              <button
                onClick={(e) => { e.stopPropagation(); onPublish(group); }}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg px-4 py-2 transition-colors shadow-lg"
              >
                <Send className="w-3.5 h-3.5" /> Publish
              </button>
            )}
            {state === "failed" && (
              <button
                onClick={(e) => { e.stopPropagation(); onRetry(group); }}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-danger hover:opacity-90 rounded-lg px-4 py-2 transition-colors shadow-lg"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retry
              </button>
            )}
          </div>
        )}
      </div>

      {lightboxOpen && group.thumbnailUrl && (
        <Lightbox mediaUrl={group.thumbnailUrl} mediaType={isVideo ? "video" : "image"} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}
