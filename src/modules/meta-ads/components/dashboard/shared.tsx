import React from "react";
import { Video, Image as ImageIcon, Layers, FileText } from "lucide-react";

export { ACCENT, CHART_SERIES, CHART_TOOLTIP_STYLE, Card, SectionTitle, EmptyState, chartTickInterval } from "@/components/global/DashboardKit";

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
