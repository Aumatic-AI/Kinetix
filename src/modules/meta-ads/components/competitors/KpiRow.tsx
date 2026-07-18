import React from "react";
import { Users, TrendingUp, Clock, Lightbulb } from "lucide-react";
import { ACCENT } from "./shared";

interface KpiRowProps {
  totalCompetitors?: number;
  dominantFormat?: { name: string; pct: number } | null;
  longevity?: { avg_days_running: number | null; longest_running_days: number | null };
  gapCount?: number;
}

function KpiCard({ icon: Icon, accent, value, label, sublabel }: { icon: any; accent: { solid: string; tint: string }; value: React.ReactNode; label: string; sublabel?: string }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3 bg-background border border-default/60 shadow-sm">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: accent.tint, color: accent.solid }}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-2xl font-bold text-text tabular-nums leading-none">{value}</p>
        <p className="text-xs font-medium text-muted mt-1.5">{label}</p>
        {sublabel && <p className="text-[11px] text-muted/70 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

export function KpiRow({ totalCompetitors, dominantFormat, longevity, gapCount }: KpiRowProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {typeof totalCompetitors === "number" && (
        <KpiCard icon={Users} accent={ACCENT.purple} value={totalCompetitors} label="Competitors found" sublabel="this week" />
      )}
      {dominantFormat && (
        <KpiCard icon={TrendingUp} accent={ACCENT.amber} value={`${dominantFormat.pct}%`} label={`${dominantFormat.name} ads`} sublabel="dominant format" />
      )}
      {longevity?.avg_days_running != null && (
        <KpiCard icon={Clock} accent={ACCENT.emerald} value={`${longevity.avg_days_running}d`} label="Avg ad lifespan" sublabel={`longest running: ${longevity.longest_running_days}d`} />
      )}
      {typeof gapCount === "number" && (
        <KpiCard icon={Lightbulb} accent={ACCENT.rose} value={gapCount} label="Gap opportunities" sublabel="ready to exploit" />
      )}
    </div>
  );
}
