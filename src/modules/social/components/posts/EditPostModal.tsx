"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/textarea";
import { TabSwitch } from "@/components/global/TabSwitch";
import { PostGroup } from "../../lib/postGroups";
import { platformMeta } from "../../lib/platforms";
import { PlatformPreview } from "./previews";
import { useImproveCaption, useUpdateCaption } from "../../hooks/usePosts";

interface EditPostModalProps {
  group: PostGroup | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Lightweight caption/title editor for a draft post — saves immediately via
 * useUpdateCaption, no platform (re)selection or scheduling involved. Kept
 * deliberately separate from PublishPostPage's wizard: that flow is for
 * actually posting (choose platforms -> preview -> schedule), this is just
 * for tweaking what's already there before you decide to publish.
 */
export function EditPostModal({ group, onClose, onSaved }: EditPostModalProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [improvingId, setImprovingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const improveMutation = useImproveCaption();
  const updateCaptionMutation = useUpdateCaption();

  // Only rows already tied to a platform have a caption worth editing here
  // — a draft still sitting in the Media Library with no platform chosen
  // yet has nothing to edit until Publish generates one per platform.
  const rows = (group?.rows || []).filter((r) => r.platform_connections);
  const activeRow = (selectedRowId && rows.find((row) => row.id === selectedRowId)) || rows[0];
  const activePlatform = activeRow?.platform_connections?.platform;
  const activeMeta = activePlatform ? platformMeta(activePlatform) : undefined;

  const resetState = () => {
    setSelectedRowId(null);
    setCaptions({});
    setTitles({});
    setError("");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleImprove = async (row: (typeof rows)[number]) => {
    if (!row.platform_connections) return;
    setImprovingId(row.id);
    setError("");
    try {
      const improved = await improveMutation.mutateAsync({
        platform: row.platform_connections.platform,
        caption: captions[row.id] ?? row.caption ?? "",
      });
      setCaptions((prev) => ({ ...prev, [row.id]: improved }));
    } catch (e: any) {
      setError(e.message || "Failed to improve caption");
    } finally {
      setImprovingId(null);
    }
  };

  const handleSave = async () => {
    setError("");
    setIsSaving(true);
    try {
      const edited = rows.filter((r) =>
        (captions[r.id] !== undefined && captions[r.id] !== (r.caption || "")) ||
        (titles[r.id] !== undefined && titles[r.id] !== (r.title || ""))
      );
      if (edited.length) {
        await Promise.all(edited.map((r) => updateCaptionMutation.mutateAsync({
          id: r.id,
          caption: captions[r.id] ?? r.caption ?? "",
          title: titles[r.id] !== undefined ? titles[r.id] : (r.title || undefined),
        })));
      }
      onSaved();
      handleClose();
    } catch (e: any) {
      setError(e.message || "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={!!group} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-3xl bg-background border-border text-text p-0 rounded-2xl gap-0 overflow-hidden outline-none flex flex-col max-h-[88vh]">
        {group && (
          <>
            <DialogHeader className="px-7 py-5 border-b border-border shrink-0 bg-surface">
              <DialogTitle className="text-xl font-bold text-text">Edit post</DialogTitle>
              <DialogDescription className="text-xs text-muted mt-0.5">Update the caption for each platform before it goes out.</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-7 space-y-5">
              {rows.length === 0 ? (
                <p className="text-sm text-muted text-center py-10">
                  No platforms selected yet — publish this post to choose where it goes and write a caption for each one.
                </p>
              ) : (
                <>
                  <TabSwitch
                    items={rows.map((row) => {
                      const meta = row.platform_connections ? platformMeta(row.platform_connections.platform) : undefined;
                      const Icon = meta?.icon;
                      return {
                        value: row.id,
                        label: (
                          <span className="flex items-center gap-1.5">
                            {Icon && <Icon className="w-3.5 h-3.5" style={{ color: meta?.color }} />}
                            {meta?.label || row.platform_connections?.platform || "Unknown"}
                          </span>
                        ),
                      };
                    })}
                    value={activeRow?.id || ""}
                    onValueChange={setSelectedRowId}
                  />

                  {activeRow && (
                    <div className="grid grid-cols-2 gap-8 items-start">
                      <div className="flex justify-center">
                        <PlatformPreview
                          platform={(activePlatform || "facebook") as any}
                          account={{
                            displayName: activeRow.platform_connections?.display_name || activeMeta?.label || "Account",
                            avatarUrl: activeRow.platform_connections?.metadata?.avatarUrl,
                          }}
                          caption={captions[activeRow.id] ?? activeRow.caption ?? ""}
                          title={titles[activeRow.id] ?? activeRow.title ?? undefined}
                          mediaUrl={group.thumbnailUrl || undefined}
                          mediaType={group.mediaType === "video" ? "video" : group.mediaType === "image" ? "image" : undefined}
                        />
                      </div>

                      <div className="space-y-3.5">
                        {activePlatform === "youtube" && (
                          <div className="space-y-1.5">
                            <p className="text-xs font-bold uppercase tracking-wide text-muted">Title</p>
                            <input
                              type="text"
                              value={titles[activeRow.id] ?? activeRow.title ?? ""}
                              onChange={(e) => setTitles((prev) => ({ ...prev, [activeRow.id]: e.target.value }))}
                              className="w-full h-10 px-3 rounded-lg border border-default bg-background text-text text-sm focus:outline-none"
                            />
                          </div>
                        )}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wide text-muted">
                              {activePlatform === "youtube" ? "Description" : "Caption"}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleImprove(activeRow)}
                              disabled={improvingId === activeRow.id}
                              className="h-7 px-3 rounded-md text-xs"
                              icon={improvingId === activeRow.id ? <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            >
                              {improvingId === activeRow.id ? "Improving..." : "Improve with AI"}
                            </Button>
                          </div>
                          <Textarea
                            value={captions[activeRow.id] ?? activeRow.caption ?? ""}
                            onChange={(e) => setCaptions((prev) => ({ ...prev, [activeRow.id]: e.target.value }))}
                            className="min-h-[220px] py-3 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {error && <p className="text-sm text-danger">{error}</p>}
            </div>

            <DialogFooter className="px-7 py-4 border-t border-border bg-surface flex flex-row justify-end gap-3 shrink-0">
              <Button variant="outline" onClick={handleClose} className="rounded-lg font-semibold">Cancel</Button>
              {rows.length > 0 && (
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 rounded-lg font-bold"
                  icon={isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : undefined}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
