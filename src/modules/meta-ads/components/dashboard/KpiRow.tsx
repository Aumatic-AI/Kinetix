import React from "react";
import { Wallet, MousePointerClick, Radar, Users, Clock, Lightbulb } from "lucide-react";
import { KpiTile, ACCENT } from "@/components/global/DashboardKit";
import { MetaAdsDashboardData } from "../../hooks/useDashboard";

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function KpiRow({ kpis }: { kpis: MetaAdsDashboardData["kpis"] }) {
  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
      <KpiTile compact icon={Wallet} accent={ACCENT.purple} value={formatCents(kpis.spendCents)} label="Ad spend" />
      <KpiTile compact icon={MousePointerClick} accent={ACCENT.blue} value={`${kpis.avgCtr.toFixed(2)}%`} label="Avg CTR" />
      <KpiTile compact icon={Radar} accent={ACCENT.green} value={kpis.adsTracked} label="Ads tracked" />
      {typeof kpis.competitorsFound === "number" && (
        <KpiTile compact icon={Users} accent={ACCENT.amber} value={kpis.competitorsFound} label="Competitors found" />
      )}
      {kpis.avgLifespanDays != null && (
        <KpiTile compact icon={Clock} accent={ACCENT.red} value={`${kpis.avgLifespanDays}d`} label="Avg ad lifespan" />
      )}
      {typeof kpis.gapCount === "number" && (
        <KpiTile compact icon={Lightbulb} accent={ACCENT.purple} value={kpis.gapCount} label="Gap opportunities" />
      )}
    </div>
  );
}
