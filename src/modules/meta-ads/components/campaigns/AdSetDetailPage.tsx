"use client";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ROUTES } from "@/config/routes";
import { formatDate, formatDateTime } from "@/utils/datetime";
import { useAdSetDetail } from "../hooks/useCampaigns";
import { AdSetPageDetail } from "../types/meta-ads.types";
import { StatusChip, LevelChip, InfoItem, MetricsRow, Section } from "../components/campaigns/shared";
import { StatusActions } from "../components/campaigns/StatusActions";
import { AddCreativeModal } from "../components/campaigns/AddCreativeModal";

function genderLabel(genders: number[]): string {
  if (genders.length === 0) return "All";
  const hasMale = genders.includes(1);
  const hasFemale = genders.includes(2);
  if (hasMale && hasFemale) return "All";
  return hasMale ? "Male" : "Female";
}

function locationsSummary(t: AdSetPageDetail["targetingSummary"]): string {
  const parts: string[] = [];
  if (t.countries.length) parts.push(t.countries.join(", "));
  if (t.regions.length) parts.push(`${t.regions.length} region${t.regions.length === 1 ? "" : "s"}`);
  if (t.cities.length) parts.push(`${t.cities.length} cit${t.cities.length === 1 ? "y" : "ies"}`);
  return parts.length ? parts.join(" + ") : "—";
}

function placementsSummary(p: AdSetPageDetail["placementsSummary"]): string {
  if (p.mode !== "manual") return "Advantage+ (automatic)";
  return p.publisherPlatforms.length ? p.publisherPlatforms.map((v) => (v === "facebook" ? "Facebook" : v === "instagram" ? "Instagram" : v)).join(", ") : "Manual";
}

/**
 * Ad Set Detail — reached from the Campaign Detail page's Ad Sets list.
 * Shows every targeting/delivery/budget field for this Ad Set plus its
 * lifetime performance, then the list of its Ads (basic fields only — a
 * given Ad's full copy/creative is a separate page, one level down).
 * "Create Ad" is the only way to add an Ad here — Ad Sets themselves are
 * always created empty (see the Campaign Detail page's "Add Ad Set").
 */
export function AdSetDetailPage() {
  const { campaignId, adSetId } = useParams<{ campaignId: string; adSetId: string }>();
  const router = useRouter();
  const { data: adSet, isLoading } = useAdSetDetail(adSetId);
  const [creatingAd, setCreatingAd] = useState(false);

  if (isLoading || !adSet) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-10">
        <div className="h-5 w-40 rounded-lg bg-surface animate-pulse" />
        <div className="h-10 w-72 rounded-lg bg-surface animate-pulse" />
        <div className="h-40 rounded-lg bg-surface animate-pulse" />
      </div>
    );
  }

  const isLeadGenAdSet = adSet.optimizationGoal === "LEAD_GENERATION";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={ROUTES.META_ADS.CAMPAIGNS} />}>Campaigns</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href={ROUTES.META_ADS.CAMPAIGN_DETAIL(campaignId)} />}>{adSet.campaignName}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{adSet.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <LevelChip level="adset" />
            <h2 className="text-2xl font-bold text-text truncate">{adSet.name}</h2>
            <StatusChip status={adSet.status} />
          </div>
        </div>
        <StatusActions level="adset" id={adSet.id} campaignId={campaignId} status={adSet.status} />
      </div>

      <Section title="Ad Set Info" description="Targeting, delivery, and budget for this ad set.">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoItem label="Optimization Goal" value={adSet.optimizationGoal?.replace(/_/g, " ") || "—"} />
          <InfoItem label="Bid Strategy" value={adSet.bidStrategy?.replace(/_/g, " ") || "—"} />
          <InfoItem
            label="Budget"
            value={adSet.dailyBudgetCents != null ? `$${(adSet.dailyBudgetCents / 100).toFixed(2)}/day` : adSet.lifetimeBudgetCents != null ? `$${(adSet.lifetimeBudgetCents / 100).toFixed(2)} total` : "Shared campaign budget"}
          />
          <InfoItem label="Locations" value={locationsSummary(adSet.targetingSummary)} />
          <InfoItem label="Age Range" value={`${adSet.targetingSummary.ageMin ?? 18}–${adSet.targetingSummary.ageMax ?? 65}`} />
          <InfoItem label="Gender" value={genderLabel(adSet.targetingSummary.genders)} />
          <InfoItem label="Advantage+ Audience" value={adSet.targetingSummary.advantageAudience ? "On" : "Off"} />
          <InfoItem label="Placements" value={placementsSummary(adSet.placementsSummary)} />
          <InfoItem label="Start" value={adSet.startAt ? formatDateTime(adSet.startAt) : "—"} />
          <InfoItem label="End" value={adSet.endAt ? formatDateTime(adSet.endAt) : "No end date"} />
          <InfoItem label="Created" value={formatDate(adSet.createdAt)} />
          <InfoItem label="Ads" value={String(adSet.ads.length)} />
        </div>
      </Section>

      <Section title="Performance" description="Lifetime totals, live from Meta — never a cached snapshot.">
        <MetricsRow metrics={adSet.metrics} showLeads={isLeadGenAdSet} />
      </Section>

      <div className="flex items-center justify-between pt-2">
        <h3 className="text-lg font-semibold text-text">Ads</h3>
        <Button size="sm" variant="outline" onClick={() => setCreatingAd(true)} icon={<Plus className="w-3.5 h-3.5" />}>
          Create Ad
        </Button>
      </div>

      {adSet.ads.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-default rounded-lg text-sm text-muted">
          No ads yet — create one to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {adSet.ads.map((ad) => (
            <button
              key={ad.id}
              onClick={() => router.push(ROUTES.META_ADS.AD_DETAIL(campaignId, adSetId, ad.id))}
              className="w-full text-left flex items-center gap-3 bg-background border border-border rounded-lg px-4 py-3 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              {ad.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ad.thumbnailUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-border shrink-0" />
              )}
              <p className="flex-1 min-w-0 text-sm font-bold text-text truncate">{ad.name}</p>
              <StatusChip status={ad.status} />
            </button>
          ))}
        </div>
      )}

      <AddCreativeModal
        adSetId={adSetId}
        campaignId={campaignId}
        isLeadGenAdSet={isLeadGenAdSet}
        open={creatingAd}
        onClose={() => setCreatingAd(false)}
      />
    </div>
  );
}
