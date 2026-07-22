"use client";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useOutreachCampaigns, useDeleteOutreachCampaign } from "../hooks/useOutreachCampaigns";
import { ROUTES } from "@/config/routes";

const STATUS_STYLE: Record<string, string> = {
  draft: "text-muted bg-surface",
  active: "text-success bg-success-bg",
  paused: "text-warning bg-warning-bg",
  completed: "text-info bg-info-bg",
  archived: "text-muted bg-surface",
};

export function CampaignsPage() {
  const router = useRouter();
  const { data: campaigns = [], isLoading } = useOutreachCampaigns();
  const deleteCampaign = useDeleteOutreachCampaign();

  const openCampaign = (id: string) => router.push(`${ROUTES.OUTREACH.CAMPAIGN_NEW}?id=${id}`);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-text">Campaigns</h2>
          <p className="text-sm text-muted mt-1">Draft, review, and send outreach emails.</p>
        </div>
        <Button onClick={() => router.push(ROUTES.OUTREACH.CAMPAIGN_NEW)} icon={<Plus className="w-4 h-4" />}>New Campaign</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-surface animate-pulse" />)}</div>
      ) : campaigns.length === 0 ? (
        <div className="py-16 text-center text-muted border border-default rounded-2xl border-dashed text-sm">No campaigns yet.</div>
      ) : (
        <div className="border border-default rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead className="w-10" /></TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => openCampaign(c.id)}>
                  <TableCell className="font-semibold text-text">{c.name}</TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLE[c.status]}`}>{c.status}</span></TableCell>
                  <TableCell>
                    <button onClick={(e) => { e.stopPropagation(); deleteCampaign.mutate(c.id); }} className="text-muted hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
