"use client";
import { useState } from "react";
import { Play, Pause, Archive, Zap, Pencil, Image as ImageIcon, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { useCampaignDetail, useUpdateStatus, useSmartRun, useEditAdCreative, useArchiveCampaign } from "../../hooks/useCampaigns";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "text-success bg-success-bg border-success-border",
  PAUSED: "text-warning bg-warning-bg border-warning-border",
  CAMPAIGN_PAUSED: "text-warning bg-warning-bg border-warning-border",
  ADSET_PAUSED: "text-warning bg-warning-bg border-warning-border",
  ARCHIVED: "text-danger bg-danger-bg border-danger-border",
  NOT_ON_META: "text-muted bg-surface border-default",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${STATUS_STYLE[status] || "text-muted bg-surface border-default"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function AdRow({ ad, campaignId }: { ad: { id: string; name: string; status: string; thumbnailUrl?: string; externalCreativeId: string | null }; campaignId: string }) {
  const updateStatus = useUpdateStatus();
  const smartRun = useSmartRun();
  const editCreative = useEditAdCreative();
  const [editing, setEditing] = useState(false);
  const [headline, setHeadline] = useState("");
  const [primaryText, setPrimaryText] = useState("");

  const busy = updateStatus.isPending || smartRun.isPending;

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-center gap-3 p-3">
        <div className="w-14 h-14 rounded-md bg-surface overflow-hidden shrink-0 flex items-center justify-center">
          {ad.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ad.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-4 h-4 text-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text truncate">{ad.name}</p>
          <StatusPill status={ad.status} />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {ad.status !== "ACTIVE" && (
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => smartRun.mutate({ adId: ad.id, campaignId })} icon={<Zap className="w-3.5 h-3.5" />}>
              Smart Run
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => updateStatus.mutate({ id: ad.id, level: "ad", status: ad.status === "ACTIVE" ? "PAUSED" : "ACTIVE", campaignId })}
            icon={busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : ad.status === "ACTIVE" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          >
            {ad.status === "ACTIVE" ? "Pause" : "Resume"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing((v) => !v)} icon={<Pencil className="w-3.5 h-3.5" />} />
        </div>
      </div>
      {editing && (
        <div className="border-t border-border p-3 space-y-2 bg-surface/40">
          <p className="text-[11px] text-muted">Leave a field blank to keep it unchanged — Meta creatives are immutable, so saving creates a new one and repoints this ad.</p>
          <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="New headline (optional)" />
          <Textarea value={primaryText} onChange={(e) => setPrimaryText(e.target.value)} placeholder="New primary text (optional)" rows={2} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button
              size="sm"
              loading={editCreative.isPending}
              onClick={() =>
                editCreative.mutate(
                  { adId: ad.id, campaignId, ...(headline.trim() ? { headline: headline.trim() } : {}), ...(primaryText.trim() ? { primaryText: primaryText.trim() } : {}) },
                  { onSuccess: () => { setEditing(false); setHeadline(""); setPrimaryText(""); } }
                )
              }
            >
              Save as new creative
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CampaignDetailsDialog({ campaignId, onClose }: { campaignId: string | null; onClose: () => void }) {
  const { data: campaign, isLoading } = useCampaignDetail(campaignId);
  const updateStatus = useUpdateStatus();
  const archiveCampaign = useArchiveCampaign();

  return (
    <Dialog open={!!campaignId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-2xl bg-background border-border text-text p-0 sm:rounded-xl gap-0 overflow-hidden outline-none flex flex-col h-[85vh] shadow-lg">
        {isLoading || !campaign ? (
          <div className="flex-1 flex items-center justify-center text-muted text-sm">Loading…</div>
        ) : (
          <>
            <DialogHeader className="px-6 py-5 border-b border-border shrink-0">
              <div className="flex items-center justify-between gap-3">
                <DialogTitle className="truncate">{campaign.name}</DialogTitle>
                <StatusPill status={campaign.status} />
              </div>
              <p className="text-xs text-muted">
                {campaign.objective?.replace("OUTCOME_", "") || "—"} · ${((campaign.dailyBudgetCents || 0) / 100).toFixed(2)}/day · {campaign.adSetCount} ad set{campaign.adSetCount === 1 ? "" : "s"} · {campaign.adCount} ad{campaign.adCount === 1 ? "" : "s"}
              </p>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {campaign.adSets.map((adSet) => (
                <div key={adSet.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-text">{adSet.name}</p>
                    <div className="flex items-center gap-2">
                      <StatusPill status={adSet.status} />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateStatus.mutate({ id: adSet.id, level: "adset", status: adSet.status === "ACTIVE" ? "PAUSED" : "ACTIVE", campaignId: campaign.id })}
                        icon={adSet.status === "ACTIVE" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {adSet.ads.map((ad) => (
                      <AdRow key={ad.id} ad={ad} campaignId={campaign.id} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between">
              <Button
                variant="outline"
                className="text-danger border-danger/30 hover:bg-danger-bg"
                loading={archiveCampaign.isPending}
                onClick={() => archiveCampaign.mutate(campaign.id, { onSuccess: onClose })}
                icon={<Archive className="w-4 h-4" />}
              >
                Archive Campaign
              </Button>
              <Button variant="secondary" onClick={onClose}>Close</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
