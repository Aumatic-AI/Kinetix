"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ROUTES } from "@/config/routes";
import { formatDate, formatDateTime } from "@/utils/datetime";
import { useCampaignDetail } from "../../hooks/useCampaigns";
import { StatusChip, LevelChip, InfoItem, MetricsRow, Section, DetailBreadcrumbSkeleton, DetailHeaderSkeleton, InfoGridSkeleton, MetricsRowSkeleton, DetailChildRowsSkeleton } from "./shared";
import { StatusActions } from "./StatusActions";
import { AddAdSetModal } from "./AddAdSetModal";

function formatMoney(cents: number | null): string {
  return cents != null ? `$${(cents / 100).toFixed(2)}` : "—";
}

function buyingTypeLabel(buyingType: string | null): string {
  return buyingType === "RESERVED" ? "Reach & Frequency" : "Auction";
}

function budgetSummary(dailyBudgetCents: number | null, lifetimeBudgetCents: number | null): string {
  if (dailyBudgetCents != null) return `${formatMoney(dailyBudgetCents)}/day (CBO)`;
  if (lifetimeBudgetCents != null) return `${formatMoney(lifetimeBudgetCents)} total (CBO)`;
  return "Per ad set";
}

/**
 * Campaign Detail — a full page (not a modal), reached from the Campaigns
 * grid. Shows every field Meta has for this campaign plus lifetime
 * performance, then the list of its Ad Sets (counts only — a given Ad
 * Set's own Ads are a separate page, one level down).
 */
export function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const router = useRouter();
  const { data: campaign, isLoading } = useCampaignDetail(campaignId);
  const [addingAdSet, setAddingAdSet] = useState(false);

  if (isLoading || !campaign) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-10">
        <DetailBreadcrumbSkeleton levels={2} />
        <DetailHeaderSkeleton />

        <Section title="Campaign Info" description="Everything Meta has on record for this campaign.">
          <InfoGridSkeleton count={9} />
        </Section>

        <Section title="Performance" description="Lifetime totals, live from Meta — never a cached snapshot.">
          <MetricsRowSkeleton />
        </Section>

        <div className="flex items-center justify-between pt-2">
          <h3 className="text-lg font-semibold text-text">Ad Sets</h3>
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        <DetailChildRowsSkeleton count={2} variant="twoLine" />
      </div>
    );
  }

  const isLeadsObjective = campaign.objective === "OUTCOME_LEADS";
  const isCbo = campaign.dailyBudgetCents != null || campaign.lifetimeBudgetCents != null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={ROUTES.META_ADS.CAMPAIGNS} />}>Campaigns</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{campaign.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <LevelChip level="campaign" />
            <h2 className="text-2xl font-bold text-text truncate">{campaign.name}</h2>
            <StatusChip status={campaign.status} />
          </div>
        </div>
        <StatusActions level="campaign" id={campaign.id} campaignId={campaign.id} status={campaign.status} />
      </div>

      <Section title="Campaign Info" description="Everything Meta has on record for this campaign.">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoItem label="Objective" value={campaign.objective?.replace("OUTCOME_", "") || "—"} />
          <InfoItem label="Buying Type" value={buyingTypeLabel(campaign.buyingType)} />
          <InfoItem label="Budget" value={budgetSummary(campaign.dailyBudgetCents, campaign.lifetimeBudgetCents)} />
          <InfoItem label="Currency" value={campaign.currency} />
          <InfoItem label="Start" value={campaign.startAt ? formatDateTime(campaign.startAt) : "—"} />
          <InfoItem label="End" value={campaign.endAt ? formatDateTime(campaign.endAt) : "No end date"} />
          <InfoItem label="Created" value={formatDate(campaign.createdAt)} />
          <InfoItem label="Ad Sets" value={String(campaign.adSetCount)} />
          <InfoItem label="Ads" value={String(campaign.adCount)} />
        </div>
      </Section>

      <Section title="Performance" description="Lifetime totals, live from Meta — never a cached snapshot.">
        <MetricsRow metrics={campaign.metrics} showLeads={isLeadsObjective} />
      </Section>

      <div className="flex items-center justify-between pt-2">
        <h3 className="text-lg font-semibold text-text">Ad Sets</h3>
        <Button size="sm" variant="outline" onClick={() => setAddingAdSet(true)} icon={<Layers className="w-3.5 h-3.5" />}>
          Add Ad Set
        </Button>
      </div>

      {campaign.adSets.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-default rounded-lg text-sm text-muted">
          No ad sets yet — add one to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {campaign.adSets.map((adSet) => (
            <button
              key={adSet.id}
              onClick={() => router.push(ROUTES.META_ADS.AD_SET_DETAIL(campaign.id, adSet.id))}
              className="w-full text-left flex items-center justify-between gap-3 bg-background border border-border rounded-lg px-4 py-3 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-text truncate">{adSet.name}</p>
                <p className="text-xs text-muted mt-0.5 truncate">
                  {adSet.optimizationGoal?.replace(/_/g, " ") || "—"} · {adSet.adCount} ad{adSet.adCount === 1 ? "" : "s"}
                  {adSet.dailyBudgetCents != null && ` · $${(adSet.dailyBudgetCents / 100).toFixed(2)}/day`}
                  {adSet.lifetimeBudgetCents != null && ` · $${(adSet.lifetimeBudgetCents / 100).toFixed(2)} total`}
                </p>
              </div>
              <StatusChip status={adSet.status} />
            </button>
          ))}
        </div>
      )}

      <AddAdSetModal campaignId={campaign.id} campaignObjective={campaign.objective} isCbo={isCbo} open={addingAdSet} onClose={() => setAddingAdSet(false)} />
    </div>
  );
}
