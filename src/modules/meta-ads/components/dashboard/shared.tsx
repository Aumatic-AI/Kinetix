import React from "react";
import { Video, Image as ImageIcon, Layers, FileText } from "lucide-react";

// A small, curated accent palette for this page — four hues, each paired
// with a light tint for KPI card backgrounds and a solid version for icon
// badges/chart series. Kept deliberately small (not a 7-color rainbow) so
// color carries meaning (which metric) rather than just decorating charts.
export const ACCENT = {
  purple: { solid: "#7132f5", tint: "#F3EEFF" },
  amber: { solid: "#F59E0B", tint: "#FFF6E5" },
  emerald: { solid: "#10B981", tint: "#E9FBF3" },
  rose: { solid: "#EC4899", tint: "#FDEEF6" },
  slate: { solid: "#64748B", tint: "#F1F4F8" },
};

export const CHART_SERIES = [ACCENT.purple.solid, ACCENT.amber.solid, ACCENT.emerald.solid, ACCENT.rose.solid, ACCENT.slate.solid];

export function priorityColor(priority: string) {
  const p = (priority || "").toLowerCase();
  if (p === "high") return "text-danger bg-danger/10";
  if (p === "medium") return "text-primary bg-primary-subtle";
  return "text-muted bg-surface";
}

export function priorityDot(priority: string) {
  const p = (priority || "").toLowerCase();
  if (p === "high") return "bg-danger";
  if (p === "medium") return "bg-primary";
  return "bg-text-secondary";
}

export function scoreColor(score: string) {
  const s = (score || "").toLowerCase();
  if (s === "strong") return "text-success bg-success-bg";
  if (s === "moderate") return "text-primary bg-primary-subtle";
  return "text-muted bg-surface";
}

export function FormatIcon({ format, className = "w-4 h-4" }: { format?: string; className?: string }) {
  const f = (format || "").toLowerCase();
  if (f.includes("video")) return <Video className={className} />;
  if (f.includes("carousel")) return <Layers className={className} />;
  if (f.includes("image")) return <ImageIcon className={className} />;
  return <FileText className={className} />;
}

/** Section title with a colored icon badge — used consistently across every
 * card on this page instead of ad-hoc uppercase eyebrow labels. */
export function SectionTitle({ icon: Icon, title, accent = ACCENT.purple, trailing }: { icon: any; title: string; accent?: { solid: string; tint: string }; trailing?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: accent.tint, color: accent.solid }}>
          <Icon className="w-4 h-4" />
        </div>
        <h3 className="text-[15px] font-bold text-text">{title}</h3>
      </div>
      {trailing}
    </div>
  );
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`bg-background border border-default/60 rounded-2xl shadow-sm p-5 ${className}`}>
      {children}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 text-muted border border-default rounded-2xl border-dashed text-sm">
      {message}
    </div>
  );
}
