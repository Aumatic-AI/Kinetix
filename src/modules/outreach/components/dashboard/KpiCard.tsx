import { LucideIcon } from "lucide-react";

export function KpiCard({ icon: Icon, label, value, tint, color }: { icon: LucideIcon; label: string; value: number; tint: string; color: string }) {
  return (
    <div className="bg-background border border-default/60 rounded-2xl shadow-sm p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: tint, color }}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">{label}</p>
        <p className="text-lg font-bold text-text tabular-nums">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}
