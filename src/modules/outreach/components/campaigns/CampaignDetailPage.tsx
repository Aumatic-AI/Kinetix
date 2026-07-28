"use client";
import { useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play } from "lucide-react";
import { useOutreachCampaign, useResumeOutreachCampaign } from "../../hooks/useCampaigns";
import { CampaignDraftPanel } from "./CampaignDraftPanel";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ROUTES } from "@/config/routes";
import { formatDate } from "@/utils/datetime";
import { OutreachCampaignDetail } from "../../types/outreach.types";

const TONE_STYLE: Record<string, string> = {
  success: "text-success bg-success-bg",
  warning: "text-warning bg-warning-bg",
  danger: "text-danger bg-danger-bg",
  muted: "text-muted bg-surface",
};

const STATS: { key: keyof OutreachCampaignDetail; label: string; rateKey?: keyof OutreachCampaignDetail }[] = [
  { key: "sent", label: "Sent" },
  { key: "opened", label: "Opened", rateKey: "openRate" },
  { key: "replied", label: "Replied", rateKey: "replyRate" },
  { key: "clicked", label: "Clicked", rateKey: "clickRate" },
  { key: "bounced", label: "Bounced", rateKey: "bounceRate" },
];

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2 min-w-0" : "min-w-0"}>
      <p className="text-[10px] font-semibold text-muted uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-text mt-0.5 truncate">{value}</p>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-default overflow-hidden">
      <div className="px-4 py-2 bg-surface/60">
        <p className="text-[11px] font-bold text-muted uppercase tracking-wide">{title}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">{children}</div>
    </div>
  );
}

function CampaignMeta({ campaign }: { campaign: OutreachCampaignDetail }) {
  return (
    <InfoCard title="Campaign Details">
      <Field label="List" value={campaign.listName} />
      <Field label="Service" value={campaign.serviceType || "—"} />
      <Field label="Region" value={campaign.targetRegion || "—"} />
      <Field label="Daily limit" value={String(campaign.dailyLimit)} />
      <Field label="Goal" value={campaign.goal || "—"} wide />
      <Field label="Tone" value={campaign.tone || "—"} wide />
      {campaign.ctaText && <Field label="CTA" value={campaign.ctaText} wide />}
      <Field label="Created" value={formatDate(campaign.createdAt)} />
    </InfoCard>
  );
}

function CampaignStats({ campaign }: { campaign: OutreachCampaignDetail }) {
  return (
    <InfoCard title="Performance">
      {STATS.map((s) => (
        <div key={s.key} className="min-w-0">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wide">{s.label}</p>
          <p className="text-base font-bold text-text tabular-nums mt-0.5">
            {(campaign[s.key] as number).toLocaleString()}
            {s.rateKey && <span className="text-xs text-muted font-normal ml-1">({campaign[s.rateKey] as number}%)</span>}
          </p>
        </div>
      ))}
    </InfoCard>
  );
}

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: campaign, isLoading } = useOutreachCampaign(id);

  const resumeCampaign = useResumeOutreachCampaign();
  const [confirmingResume, setConfirmingResume] = useState(false);
  const [resumeError, setResumeError] = useState("");

  const handleResume = async () => {
    if (!campaign) return;
    setResumeError("");
    try {
      await resumeCampaign.mutateAsync(campaign.id);
      setConfirmingResume(false);
    } catch (e) {
      setResumeError(e instanceof Error ? e.message : "Something went wrong — please try again.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <Link href={ROUTES.OUTREACH.CAMPAIGNS} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-text">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </Link>

      {isLoading || !campaign ? (
        <div className="h-40 rounded-xl bg-surface animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl font-bold text-text">{campaign.name}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${TONE_STYLE[campaign.statusTone]}`}>
                  {campaign.statusLabel}
                </span>
              </div>
              {campaign.statusReason && <p className="text-xs text-muted mt-1">{campaign.statusReason}</p>}
              {campaign.status === "paused" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => { setResumeError(""); setConfirmingResume(true); }}
                  icon={<Play className="w-3.5 h-3.5" />}
                >
                  Resume
                </Button>
              )}
            </div>

            <CampaignMeta campaign={campaign} />

            {(campaign.status === "sending" || campaign.status === "sent" || campaign.status === "paused") && (
              <CampaignStats campaign={campaign} />
            )}
          </div>

          <CampaignDraftPanel campaign={campaign} />
        </div>
      )}

      <ConfirmModal
        open={confirmingResume}
        onOpenChange={(open) => { if (!open) { setConfirmingResume(false); setResumeError(""); } }}
        title="Resume this campaign?"
        description={campaign ? `"${campaign.name}" will start sending on Instantly again.` : ""}
        confirmLabel="Resume"
        loading={resumeCampaign.isPending}
        error={resumeError}
        onConfirm={handleResume}
      />
    </div>
  );
}
