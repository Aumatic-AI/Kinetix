"use client";
import { Trash2 } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Lead } from "../../types/leads.types";
import { useDeleteLead } from "../../hooks/useLeads";

const STATUS_STYLE: Record<string, string> = {
  new: "text-muted bg-surface",
  contacted: "text-info bg-info-bg",
  replied: "text-success bg-success-bg",
  interested: "text-success bg-success-bg",
  not_interested: "text-muted bg-surface",
  bounced: "text-danger bg-danger-bg",
  do_not_contact: "text-danger bg-danger-bg",
};
const STATUS_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  replied: "Replied",
  interested: "Interested",
  not_interested: "Not a fit",
  bounced: "Bounced",
  do_not_contact: "Opted out",
};

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const deleteLead = useDeleteLead();

  if (leads.length === 0) {
    return <div className="py-16 text-center text-muted border border-default rounded-2xl border-dashed text-sm">No leads yet.</div>;
  }

  return (
    <div className="border border-default rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="font-semibold text-text">{[l.first_name, l.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
              <TableCell className="text-muted">{l.company || "—"}</TableCell>
              <TableCell className="text-muted">{l.email}</TableCell>
              <TableCell className="text-muted">{l.phone || "—"}</TableCell>
              <TableCell className="text-muted">{[l.city, l.country].filter(Boolean).join(", ") || "—"}</TableCell>
              <TableCell>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLE[l.status] || "text-muted bg-surface"}`}>{STATUS_LABEL[l.status] || l.status}</span>
              </TableCell>
              <TableCell>
                <button onClick={() => deleteLead.mutate(l.id)} className="text-muted hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
