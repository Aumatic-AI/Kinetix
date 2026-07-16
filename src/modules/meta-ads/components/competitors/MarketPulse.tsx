import React from "react";
import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList, Tooltip } from "recharts";
import { ACCENT, CHART_SERIES, SectionTitle, Card } from "./shared";

interface MarketPulseProps {
  topAngles?: { val: string; count: number }[];
}

export function MarketPulse({ topAngles = [] }: MarketPulseProps) {
  const angleData = [...topAngles].sort((a, b) => b.count - a.count).slice(0, 5);
  if (!angleData.length) return null;

  return (
    <Card className="h-full">
      <SectionTitle icon={BarChart3} accent={ACCENT.purple} title="Angles Competitors Lean On" />
      <div style={{ height: 190 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={angleData} layout="vertical" margin={{ left: 4, right: 32, top: 0, bottom: 0 }} barCategoryGap="30%">
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="val" width={112} tick={{ fontSize: 12, fill: "var(--color-text)", fontWeight: 500 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "var(--color-background)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }}
              cursor={{ fill: "var(--color-surface)" }}
            />
            <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={18}>
              {angleData.map((_, i) => <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />)}
              <LabelList dataKey="count" position="right" style={{ fill: "var(--color-text-muted)", fontSize: 12, fontWeight: 700 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
