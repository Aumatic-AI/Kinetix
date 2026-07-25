"use client";
import { useState } from "react";
import Image from "next/image";
import { Loader2, Video, Image as ImageIcon, MessageSquareText, AlertCircle, Send, Info, RotateCcw, Clock, X } from "lucide-react";
import { PostGroup, groupState } from "../lib/postGroups";
import { Lightbox } from "./Lightbox";
import { formatDateTime } from "@/utils/datetime";

interface PostTileProps {
  group: PostGroup;
  onPublish: (group: PostGroup) => void;
  onViewDetails: (group: PostGroup) => void;
  onRetry: (group: PostGroup) => void;
  onCancelSchedule: (group: PostGroup) => void;
}

const ASPECT_CLASS: Record<PostGroup["aspectRatio"], string> = {
  "16:9": "aspect-[16/9]",
  "9:16": "aspect-[9/16]",
  "4:5": "aspect-[4/5]",
  "1:1": "aspect-square",
};

export function PostTile({ group, onPublish, onViewDetails, onRetry, onCancelSchedule }: PostTileProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const state = groupState(group);
  const isVideo = group.mediaType === "video";
  const isText = group.format === "text";
  const scheduledAt = group.rows.find((r) => r.status === "scheduled")?.scheduled_at || null;

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden bg-surface group">
        {isText ? (
          <div
            onClick={() => onViewDetails(group)}
            className={`w-full ${ASPECT_CLASS[group.aspectRatio]} flex flex-col items-center justify-center gap-2 text-muted cursor-pointer hover:bg-secondary transition-colors`}
          >
            <MessageSquareText className="w-8 h-8" />
            <span className="text-xs font-semibold">Text Post</span>
          </div>
        ) : group.thumbnailUrl ? (
          <div className="cursor-zoom-in" onClick={() => setLightboxOpen(true)}>
            {isVideo ? (
              <video src={group.thumbnailUrl} className="w-full h-auto block" muted preload="metadata" />
            ) : (
              <Image
                src={group.thumbnailUrl}
                alt=""
                width={1080}
                height={1350}
                className="w-full h-auto block"
                sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              />
            )}
          </div>
        ) : (
          <div className={`w-full ${ASPECT_CLASS[group.aspectRatio]} flex items-center justify-center text-muted`}>
            {state === "generating" ? <Loader2 className="w-6 h-6 animate-spin" /> : group.format === "video" ? <Video className="w-6 h-6" /> : <ImageIcon className="w-6 h-6" />}
          </div>
        )}

        {state === "generating" && (
          <span className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/60 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full pointer-events-none">
            <Loader2 className="w-3 h-3 animate-spin" /> Generating
          </span>
        )}
        {state === "publishing" && (
          <span className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/60 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full pointer-events-none">
            <Loader2 className="w-3 h-3 animate-spin" /> Publishing
          </span>
        )}
        {state === "failed" && (
          <span className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-danger text-white text-[11px] font-semibold px-2.5 py-1 rounded-full pointer-events-none">
            <AlertCircle className="w-3 h-3" /> Failed
          </span>
        )}
        {state === "scheduled" && (
          <span className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/60 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full pointer-events-none">
            <Clock className="w-3 h-3" /> {formatDateTime(scheduledAt)}
          </span>
        )}

        {(state === "published" || state === "draft" || state === "failed" || state === "scheduled") && (
          <div className="absolute inset-x-0 bottom-0 p-3 pt-10 bg-gradient-to-t from-black/75 via-black/25 to-transparent opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2">
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
            {state === "scheduled" && (
              <button
                onClick={(e) => { e.stopPropagation(); onCancelSchedule(group); }}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-white/15 hover:bg-white/25 rounded-lg px-4 py-2 transition-colors shadow-lg"
              >
                <X className="w-3.5 h-3.5" /> Cancel Schedule
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
