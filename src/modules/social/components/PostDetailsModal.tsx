"use client";
import { CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PostGroup } from "../lib/postGroups";
import { platformMeta } from "../lib/platforms";
import { PlatformPreview } from "./previews";
import { formatDateTime } from "@/utils/datetime";

interface PostDetailsModalProps {
  group: PostGroup | null;
  onClose: () => void;
}

function statusLabel(row: PostGroup["rows"][number]): string {
  if (row.status === "published") return `Published ${formatDateTime(row.published_at)}`;
  if (row.status === "scheduled") return `Scheduled for ${formatDateTime(row.scheduled_at)}`;
  if (row.status === "failed") return "Failed";
  if (row.status === "draft") return "Draft — not posted yet";
  return row.status.charAt(0).toUpperCase() + row.status.slice(1);
}

export function PostDetailsModal({ group, onClose }: PostDetailsModalProps) {
  return (
    <Dialog open={!!group} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-background border-border text-text p-0 rounded-2xl gap-0 overflow-hidden outline-none flex flex-col max-h-[88vh]">
        {group && (
          <>
            <DialogHeader className="px-7 py-5 border-b border-border shrink-0 bg-surface">
              <DialogTitle className="text-xl font-bold text-text">Post details</DialogTitle>
              <DialogDescription className="text-xs text-muted mt-0.5">Exactly how this looks on each platform.</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-7">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {group.rows.map((row) => {
                  const meta = row.platform_connections ? platformMeta(row.platform_connections.platform) : undefined;
                  return (
                    <div key={row.id}>
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted mb-2">
                        <span>{meta?.label || row.platform_connections?.platform}</span>
                        {row.status === "published" && <CheckCircle2 className="w-3.5 h-3.5 text-success" />}
                        <span className="normal-case font-medium text-muted/80">{statusLabel(row)}</span>
                      </div>
                      <PlatformPreview
                        platform={(row.platform_connections?.platform || "facebook") as any}
                        account={{
                          displayName: row.platform_connections?.display_name || meta?.label || "Account",
                          avatarUrl: row.platform_connections?.metadata?.avatarUrl,
                        }}
                        caption={row.caption || ""}
                        title={row.title || undefined}
                        mediaUrl={group.thumbnailUrl || undefined}
                        mediaType={group.mediaType === "video" ? "video" : group.mediaType === "image" ? "image" : undefined}
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
