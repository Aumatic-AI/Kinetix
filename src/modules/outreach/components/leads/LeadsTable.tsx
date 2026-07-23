"use client";
import { useState } from "react";
import { Trash2, History } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Avatar } from "@/components/ui/Avatar";
import { Lead } from "../../types/leads.types";
import { useDeleteLead } from "../../hooks/useLeads";
import { LeadHistoryModal } from "./LeadHistoryModal";

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const deleteLead = useDeleteLead();
  const [historyTarget, setHistoryTarget] = useState<Lead | null>(null);

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
                      <button onClick={() => setHistoryTarget(l)} className="text-muted hover:text-text" title="Campaign history">
                        <History className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteLead.mutate(l.id)} className="text-muted hover:text-danger" title="Delete">
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

      <LeadHistoryModal
        leadId={historyTarget?.id ?? null}
        leadName={historyTarget ? [historyTarget.first_name, historyTarget.last_name].filter(Boolean).join(" ") || historyTarget.email : ""}
        onClose={() => setHistoryTarget(null)}
      />
    </>
  );
}
