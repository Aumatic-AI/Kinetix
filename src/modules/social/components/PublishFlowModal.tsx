"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Send, ArrowLeft, CheckCircle2, Link as LinkIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/config/routes";
import { PostGroup } from "../lib/postGroups";
import { SocialConnection, usePreparePlatforms, usePublishPosts, PreparedPlatformRow } from "../hooks/useSocialPosts";
import { PLATFORMS } from "../lib/platforms";
import { PlatformPreview } from "./previews";

interface PublishFlowModalProps {
  group: PostGroup | null;
  connections: SocialConnection[];
  onClose: () => void;
  onDone: () => void;
}

export function PublishFlowModal({ group, connections, onClose, onDone }: PublishFlowModalProps) {
  const [step, setStep] = useState<"select" | "preview">("select");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preparedRows, setPreparedRows] = useState<PreparedPlatformRow[]>([]);
  const [error, setError] = useState("");
  const prepareMutation = usePreparePlatforms();
  const publishMutation = usePublishPosts();

const draftPlatforms = new Set((group?.rows || []).filter((r) => r.status === "draft" && r.platform_connections).map((r) => r.platform_connections!.platform as string));
  const publishedPlatforms = new Set((group?.rows || []).filter((r) => r.status === "published" && r.platform_connections).map((r) => r.platform_connections!.platform as string));

  useEffect(() => {
    if (group) {
      setSelected(new Set(draftPlatforms));
      setStep("select");
      setPreparedRows([]);
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.key]);

  if (!group) return null;

  // Always show all 6 platforms — connected or not — so the user can see
  // everything available and connect on the spot instead of hitting a
  // dead-end "nothing connected" message. Ones that can't actually take
  // this content format (e.g. YouTube/TikTok for a plain image) still show,
  // just disabled with the reason, rather than silently disappearing.
  const isVideo = group.format === "video";
  const options = PLATFORMS;

  const close = () => {
    onClose();
    setStep("select");
    setPreparedRows([]);
    setError("");
  };

  const toggle = (platform: string) => {
    if (publishedPlatforms.has(platform)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(platform) ? next.delete(platform) : next.add(platform);
      return next;
    });
  };

  const handleNext = async () => {
    if (!selected.size || !group.mediaAssetId) return;
    setError("");
    try {
      const rows = await prepareMutation.mutateAsync({
        mediaAssetId: group.mediaAssetId,
        ideaPrompt: group.ideaPrompt,
        format: group.format,
        platforms: [...selected],
      });
      setPreparedRows(rows);
      setStep("preview");
    } catch (e: any) {
      setError(e.message || "Failed to prepare platforms");
    }
  };

  const handlePost = async () => {
    setError("");
    try {
      await publishMutation.mutateAsync(preparedRows.map((r) => r.id));
      onDone();
      close();
    } catch (e: any) {
      setError(e.message || "Failed to publish");
    }
  };

  return (
    <Dialog open={!!group} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="max-w-3xl bg-background border-border text-text p-0 rounded-2xl gap-0 overflow-hidden outline-none flex flex-col max-h-[88vh]">
        <DialogHeader className="px-7 py-5 border-b border-border shrink-0 bg-surface">
          <DialogTitle className="text-xl font-bold text-text">
            {step === "select" ? "Choose where to post" : "Preview before posting"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted mt-0.5">
            {step === "select"
              ? "Pick which accounts should get this content — connect any you haven't yet."
              : "This is exactly how each post will look once it's live."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-7">
          {step === "select" ? (
            <div className="grid grid-cols-3 gap-3">
              {options.map((p) => {
                const Icon = p.icon;
                const conn = connections.find((c) => c.platform === p.platform);
                const isConnected = !!conn;
                const isSelected = selected.has(p.platform);
                const isPosted = publishedPlatforms.has(p.platform);
                const supportsFormat = isVideo ? p.supportsVideo : p.supportsImage;

                if (!supportsFormat) {
                  return (
                    <div key={p.platform} className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-default opacity-50">
                      <Icon className="w-9 h-9 shrink-0 text-muted" />
                      <div className="text-center min-w-0">
                        <p className="text-xs font-bold truncate text-text">{p.label}</p>
                        <p className="text-[10px] text-muted truncate">Not supported</p>
                      </div>
                    </div>
                  );
                }

                if (!isConnected) {
                  return (
                    <div key={p.platform} className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-dashed border-default">
                      <Icon className="w-9 h-9 shrink-0 text-muted" />
                      <div className="text-center min-w-0">
                        <p className="text-xs font-bold truncate text-text">{p.label}</p>
                        <p className="text-[10px] text-muted truncate">Not connected</p>
                      </div>
                      <Link
                        href={ROUTES.SOCIAL.CONNECTED_ACCOUNTS}
                        className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                      >
                        <LinkIcon className="w-2.5 h-2.5" /> Connect
                      </Link>
                    </div>
                  );
                }

                return (
                  <button
                    key={p.platform}
                    type="button"
                    disabled={isPosted}
                    onClick={() => toggle(p.platform)}
                    className={cn(
                      "relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all",
                      isPosted ? "opacity-50 cursor-not-allowed border-default" : isSelected ? "shadow-sm" : "border-default hover:bg-surface"
                    )}
                    style={isSelected && !isPosted ? { background: p.color, borderColor: p.color, color: "#fff" } : undefined}
                  >
                    {isSelected && !isPosted && <CheckCircle2 className="w-4 h-4 absolute top-2 right-2" />}
                    <Icon className="w-6 h-6 shrink-0" />
                    <div className="text-center min-w-0">
                      <p className="text-xs font-bold truncate">{p.label}</p>
                      <p className={cn("text-[10px] truncate", isSelected && !isPosted ? "text-white/80" : "text-muted")}>
                        {isPosted ? "Already posted" : conn?.display_name || "Connected"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {preparedRows.map((row) => (
                <div key={row.id}>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted mb-2">{row.platform}</p>
                  <PlatformPreview
                    platform={row.platform as any}
                    account={row.account}
                    caption={row.caption}
                    mediaUrl={group.thumbnailUrl || ""}
                    mediaType={group.mediaType === "video" ? "video" : "image"}
                  />
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-danger mt-4">{error}</p>}
        </div>

        <DialogFooter className="px-7 py-4 border-t border-border bg-surface flex flex-row justify-end gap-3 shrink-0">
          {step === "preview" && (
            <Button variant="outline" onClick={() => setStep("select")} className="rounded-lg font-semibold" icon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
          )}
          <Button variant="outline" onClick={close} className="rounded-lg font-semibold">Cancel</Button>
          {step === "select" ? (
            <Button
              onClick={handleNext}
              disabled={!selected.size || prepareMutation.isPending}
              className="px-6 rounded-lg font-bold"
            >
              {prepareMutation.isPending ? "Preparing..." : "Next: Preview"}
            </Button>
          ) : (
            <Button
              onClick={handlePost}
              disabled={publishMutation.isPending}
              className="px-6 rounded-lg font-bold"
              icon={<Send className="w-4 h-4" />}
            >
              {publishMutation.isPending ? "Posting..." : `Post Now (${preparedRows.length})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
