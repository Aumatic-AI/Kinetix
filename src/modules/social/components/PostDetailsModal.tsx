"use client";
import { CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PostGroup } from "../lib/postGroups";
import { platformMeta } from "../lib/platforms";
import { PlatformPreview } from "./previews";

interface PostDetailsModalProps {
  group: PostGroup | null;
  onClose: () => void;
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function PostDetailsModal({ group, onClose }: PostDetailsModalProps) {
  return (
    <Dialog open={!!group} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-background border-border text-text p-0 rounded-2xl gap-0 overflow-hidden outline-none flex flex-col max-h-[88vh]">
        {group && (
          <>
            <DialogHeader className="px-7 py-5 border-b border-border shrink-0 bg-surface">
              <DialogTitle className="text-xl font-bold text-text">Post details</DialogTitle>
              <DialogDescription className="text-xs text-muted mt-0.5">Exactly how this went out on each platform.</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-7">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {group.rows.map((row) => {
                  const meta = row.platform_connections ? platformMeta(row.platform_connections.platform) : undefined;
                  return (
                    <div key={row.id}>
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted mb-2">
                        <span>{meta?.label || row.platform_connections?.platform}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                        <span className="normal-case font-medium text-muted/80">Published {formatDate(row.published_at)}</span>
                      </div>
                      <PlatformPreview
                        platform={(row.platform_connections?.platform || "facebook") as any}
                        account={{
                          displayName: row.platform_connections?.display_name || meta?.label || "Account",
                          avatarUrl: row.platform_connections?.metadata?.avatarUrl,
                        }}
                        caption={row.caption || ""}
                        mediaUrl={group.thumbnailUrl || ""}
                        mediaType={group.mediaType === "video" ? "video" : "image"}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
