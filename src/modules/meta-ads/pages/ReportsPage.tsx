"use client";
import { useState } from "react";
import { Sparkles, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "../components/competitors/shared";
import { ReportKpiRow } from "../components/reports/ReportKpiRow";
import { ReportAnalysisPanel } from "../components/reports/ReportAnalysisPanel";
import { useReportsData, useAnalyzeReports, ReportRange } from "../hooks/useReports";

const RANGES: { value: ReportRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "14d", label: "14 days" },
  { value: "30d", label: "30 days" },
];

const SCORE_STYLE = (score: number) =>
  score >= 80 ? "text-success bg-success-bg" : score >= 60 ? "text-primary bg-primary-subtle" : score >= 40 ? "text-warning bg-warning-bg" : "text-danger bg-danger-bg";

export function ReportsPage() {
  const [range, setRange] = useState<ReportRange>("7d");
  const { data, isLoading, error } = useReportsData(range);
  const analyzeMutation = useAnalyzeReports();

  const ads = data?.ads || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-text">Reports</h2>
          <p className="text-sm text-muted mt-1">Live from Meta for the selected range — never a cached snapshot.</p>
        </div>
        <div className="flex items-center gap-1 bg-surface rounded-lg p-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${range === r.value ? "bg-background text-text shadow-sm" : "text-muted hover:text-text"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="text-sm text-danger bg-danger-bg border border-danger-border rounded-xl px-4 py-3">{(error as Error).message}</div>}

      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-2xl bg-surface animate-pulse" />)}</div>
          <div className="h-64 rounded-lg bg-surface animate-pulse" />
        </div>
      ) : ads.length === 0 ? (
        <EmptyState message="No ads with delivery in this range yet." />
      ) : (
        <>
          {data && <ReportKpiRow summary={data.summary} />}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">{data?.summary.scoreMethodology}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => data && analyzeMutation.mutate({ ads: data.ads, summary: data.summary })}
              loading={analyzeMutation.isPending}
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              {analyzeMutation.isPending ? "Analyzing…" : "Analyze with AI"}
            </Button>
          </div>

          {analyzeMutation.data && <ReportAnalysisPanel analysis={analyzeMutation.data} ads={ads} />}
          {analyzeMutation.error && <p className="text-sm text-danger">{(analyzeMutation.error as Error).message}</p>}

          <div className="border border-default rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">CPM</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ads.map((ad) => (
                  <TableRow key={ad.adId}>
                    <TableCell>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-surface overflow-hidden shrink-0 flex items-center justify-center">
                          {ad.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={ad.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-3.5 h-3.5 text-muted" />
                          )}
                        </div>
                        <span className="font-semibold text-text truncate max-w-[180px]">{ad.adName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted">{ad.campaignName}</TableCell>
                    <TableCell><span className="text-[10px] font-bold uppercase text-muted">{ad.status.replace(/_/g, " ")}</span></TableCell>
                    <TableCell className="text-right tabular-nums">${ad.spend.toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{ad.ctr.toFixed(2)}%</TableCell>
                    <TableCell className="text-right tabular-nums">${ad.cpm.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums ${SCORE_STYLE(ad.score)}`}>{ad.score}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
