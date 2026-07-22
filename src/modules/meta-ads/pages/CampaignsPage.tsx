"use client";
import { useState } from "react";
import { Rocket, PlayCircle, Layers } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCampaignsList } from "../hooks/useCampaigns";
import { CampaignListItem, MetaAdCreative } from "../types/meta-ads.types";
import { CampaignPickCreativeDialog } from "../components/campaigns/CampaignPickCreativeDialog";
import { LaunchCampaignModal } from "../components/campaigns/LaunchCampaignModal";
import { CampaignDetailsDialog } from "../components/campaigns/CampaignDetailsDialog";

const STATUS_DOT: Record<string, string> = {
  ACTIVE: "bg-success",
  PAUSED: "bg-warning",
  CAMPAIGN_PAUSED: "bg-warning",
  ADSET_PAUSED: "bg-warning",
  ARCHIVED: "bg-danger",
  NOT_ON_META: "bg-muted",
};

function CampaignCard({ campaign, onOpen }: { campaign: CampaignListItem; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="text-left bg-background border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow flex gap-3 p-3"
    >
      <div className="w-16 h-16 rounded-md bg-surface overflow-hidden shrink-0 flex items-center justify-center">
        {campaign.creativeThumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={campaign.creativeThumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Layers className="w-5 h-5 text-muted" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[campaign.status] || "bg-muted"}`} />
          <p className="text-sm font-bold text-text truncate">{campaign.name}</p>
        </div>
        <p className="text-xs text-muted mt-1">{campaign.objective?.replace("OUTCOME_", "") || "—"}</p>
        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted font-medium">
          <span>${((campaign.dailyBudgetCents || 0) / 100).toFixed(0)}/day</span>
          <span>{campaign.adSetCount} ad set{campaign.adSetCount === 1 ? "" : "s"}</span>
          <span>{campaign.adCount} ad{campaign.adCount === 1 ? "" : "s"}</span>
        </div>
      </div>
    </button>
  );
}

export function CampaignsPage() {
  const { data: campaigns = [], isLoading } = useCampaignsList();
  const [pickingCreative, setPickingCreative] = useState(false);
  const [launchingCreative, setLaunchingCreative] = useState<MetaAdCreative | null>(null);
  const [openCampaignId, setOpenCampaignId] = useState<string | null>(null);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-text">Campaigns</h2>
          <p className="text-sm text-muted mt-1">Launch approved creatives as live campaigns and manage everything that&apos;s running.</p>
        </div>
        <Button onClick={() => setPickingCreative(true)} icon={<Rocket className="w-4 h-4" />}>
          Launch New Campaign
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-surface animate-pulse" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="py-24 text-center border-2 border-dashed border-default rounded-lg flex flex-col items-center">
          <div className="w-16 h-16 bg-surface rounded-lg flex items-center justify-center mb-4">
            <PlayCircle className="w-8 h-8 text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">No campaigns yet</h3>
          <p className="text-muted mb-6 max-w-xs">Launch an approved creative from Ad Library, or start here.</p>
          <Button onClick={() => setPickingCreative(true)} icon={<Rocket className="w-4 h-4" />}>Launch New Campaign</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {campaigns.map((c) => <CampaignCard key={c.id} campaign={c} onOpen={() => setOpenCampaignId(c.id)} />)}
        </div>
      )}

      <CampaignPickCreativeDialog
        open={pickingCreative}
        onClose={() => setPickingCreative(false)}
        onPick={(creative) => { setPickingCreative(false); setLaunchingCreative(creative); }}
      />
      <LaunchCampaignModal creative={launchingCreative} onClose={() => setLaunchingCreative(null)} />
      <CampaignDetailsDialog campaignId={openCampaignId} onClose={() => setOpenCampaignId(null)} />
    </div>
  );
}
