import React from "react";
import { Lightbulb } from "lucide-react";
import { priorityColor, priorityDot, FormatIcon, ACCENT, SectionTitle, Card } from "./shared";

interface Gap {
  gap: string;
  opportunity: string;
  ad_format?: string;
  priority: string;
}

export function GapOpportunities({ gaps = [] }: { gaps?: Gap[] }) {
  if (!gaps.length) return null;

  const sorted = [...gaps]
    .sort((a, b) => {
      const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (order[(a.priority || "").toLowerCase()] ?? 3) - (order[(b.priority || "").toLowerCase()] ?? 3);
    })
    .slice(0, 5);

  return (
    <Card>
      <SectionTitle icon={Lightbulb} accent={ACCENT.red} title="Gap Opportunities" trailing={<span className="text-xs text-muted">{sorted.length} found</span>} />
      <div className="divide-y divide-default/60">
        {sorted.map((g, i) => (
          <div key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${priorityDot(g.priority)}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text leading-snug">{g.gap}</p>
              <p className="text-xs text-muted leading-snug mt-0.5">{g.opportunity}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${priorityColor(g.priority)}`}>{g.priority}</span>
              {g.ad_format && (
                <span className="flex items-center gap-1 text-[10px] text-muted">
                  <FormatIcon format={g.ad_format} className="w-3 h-3" /> {g.ad_format}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
