import React from "react";
import { PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ACCENT, CHART_SERIES, SectionTitle, Card } from "./shared";

interface FormatBreakdownProps {
  formats?: { video: number; image: number; carousel: number; text: number };
}

export function FormatBreakdown({ formats }: FormatBreakdownProps) {
  if (!formats) return null;

  const total = formats.video + formats.image + formats.carousel + formats.text;
  if (!total) return null;

  const data = [
    { name: "Video", value: formats.video },
    { name: "Image", value: formats.image },
    { name: "Carousel", value: formats.carousel },
    { name: "Text", value: formats.text },
  ].filter((d) => d.value > 0);

  return (
    <Card className="h-full">
      <SectionTitle icon={PieChartIcon} accent={ACCENT.amber} title="Competitor Ad Formats" />
      <div className="flex items-center gap-6">
        <div className="w-32 h-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={38} outerRadius={60} paddingAngle={3} strokeWidth={0}>
                {data.map((_, i) => <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: "var(--color-background)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }}
                formatter={(value: any, name: any) => [`${value} ads (${Math.round((value / total) * 100)}%)`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2.5 flex-1 min-w-0">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_SERIES[i % CHART_SERIES.length] }} />
                <span className="text-sm text-text truncate">{d.name}</span>
              </span>
              <span className="text-sm font-bold text-text tabular-nums shrink-0">{Math.round((d.value / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
