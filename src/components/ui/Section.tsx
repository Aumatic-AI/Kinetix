import { ReactNode } from "react";

/** A grouped block of related fields — a bold title, one short line
 * explaining what the section is for, then its fields, on a subtly-shaded
 * surface so each group reads as its own panel. Originally built for the
 * Meta Ads Create Campaign wizard (still re-exported from
 * meta-ads/components/campaigns/shared.tsx for its existing consumers),
 * promoted here since the Settings page needed the identical pattern. */
export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-text">{title}</h3>
        {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}
