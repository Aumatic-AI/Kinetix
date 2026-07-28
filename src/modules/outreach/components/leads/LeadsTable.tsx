"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { LeadSummary } from "../../types/leads.types";
import { useDeleteLead } from "../../hooks/useLeads";
// import { LeadHistoryModal } from "./LeadHistoryModal"; // history icon hidden for now

export function LeadsTable({ leads }: { leads: LeadSummary[] }) {
  const deleteLead = useDeleteLead();
  // const [historyTarget, setHistoryTarget] = useState<LeadSummary | null>(null); // history icon hidden for now
  const [deleteTarget, setDeleteTarget] = useState<LeadSummary | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError("");
    try {
      await deleteLead.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete lead");
    }
  };

  if (leads.length === 0) {
    return <div className="py-16 text-center text-muted border border-default rounded-2xl border-dashed text-sm">No leads yet.</div>;
  }

  return (
    <>
      <div className="border border-default rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Location</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((l) => {
              const name = [l.first_name, l.last_name].filter(Boolean).join(" ");
              return (
                <TableRow key={l.id}>
                  <TableCell className="font-semibold text-text">
                    <div className="flex items-center gap-3">
                      <Avatar label={name || l.email} />
                      <span>{name || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted">{l.email}</TableCell>
                  <TableCell className="text-muted">{[l.city, l.country].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 justify-end">
                      {/* History icon hidden for now
                      <button onClick={() => setHistoryTarget(l)} className="text-muted hover:text-text" title="Campaign history">
                        <History className="w-3.5 h-3.5" />
                      </button>
                      */}
                      <button onClick={() => { setDeleteError(""); setDeleteTarget(l); }} className="text-muted hover:text-danger" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* LeadHistoryModal hidden for now, alongside the history icon above
      <LeadHistoryModal
        leadId={historyTarget?.id ?? null}
        leadName={historyTarget ? [historyTarget.first_name, historyTarget.last_name].filter(Boolean).join(" ") || historyTarget.email : ""}
        onClose={() => setHistoryTarget(null)}
      />
      */}

      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open && !deleteLead.isPending) { setDeleteTarget(null); setDeleteError(""); } }}
        title="Delete this lead?"
        description={deleteTarget ? `"${[deleteTarget.first_name, deleteTarget.last_name].filter(Boolean).join(" ") || deleteTarget.email}" will be permanently deleted. This can't be undone.` : ""}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteLead.isPending}
        error={deleteError}
        onConfirm={handleDelete}
      />
    </>
  );
}
