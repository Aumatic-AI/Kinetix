import { CategoryStatusBreakdown } from "../types/contacts.types";

const BUCKET_COLOR: Record<"muted" | "info" | "success" | "danger", string> = {
  muted: "var(--color-text-secondary)",
  info: "var(--color-info)",
  success: "var(--color-success)",
  danger: "var(--color-danger)",
};

/** One glance at whether a list is untouched, warming up, or stalling out —
 * without a separate chart. Same four status colors as the lead status
 * badges (see ContactsTable), so the visual language stays closed. */
export function CategoryCompositionBar({ breakdown }: { breakdown: CategoryStatusBreakdown }) {
  if (breakdown.total === 0) {
    return <div className="h-1 w-full rounded-full bg-surface" />;
  }
  const segments: { key: "muted" | "info" | "success" | "danger"; value: number }[] = [
    { key: "muted", value: breakdown.muted },
    { key: "info", value: breakdown.info },
    { key: "success", value: breakdown.success },
    { key: "danger", value: breakdown.danger },
  ];
  return (
    <div className="flex h-1 w-full overflow-hidden rounded-full bg-surface">
      {segments.filter((s) => s.value > 0).map((s) => (
        <div key={s.key} style={{ width: `${(s.value / breakdown.total) * 100}%`, backgroundColor: BUCKET_COLOR[s.key] }} />
      ))}
    </div>
  );
}
