"use client";
import { Trash2 } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Contact } from "../types/contacts.types";
import { useDeleteContact } from "../hooks/useContacts";

const SUBSCRIBER_STYLE: Record<string, string> = {
  active: "text-success bg-success-bg",
  unsubscribed: "text-muted bg-surface",
  bounced: "text-danger bg-danger-bg",
  complained: "text-danger bg-danger-bg",
};
const SUBSCRIBER_LABEL: Record<string, string> = {
  active: "Subscribed",
  unsubscribed: "Unsubscribed",
  bounced: "Bounced",
  complained: "Complained",
};

const OUTREACH_STYLE: Record<string, string> = {
  new: "text-muted bg-surface",
  contacted: "text-info bg-info-bg",
  replied: "text-success bg-success-bg",
  interested: "text-success bg-success-bg",
  not_interested: "text-muted bg-surface",
  bounced: "text-danger bg-danger-bg",
  do_not_contact: "text-danger bg-danger-bg",
};
const OUTREACH_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  replied: "Replied",
  interested: "Interested",
  not_interested: "Not a fit",
  bounced: "Bounced",
  do_not_contact: "Opted out",
};

function StatusPill({ value, styles, labels }: { value: string; styles: Record<string, string>; labels: Record<string, string> }) {
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${styles[value] || "text-muted bg-surface"}`}>{labels[value] || value}</span>;
}

export function ContactsTable({
  contacts,
  statusMode,
  categoryName,
  showCategory = true,
}: {
  contacts: Contact[];
  statusMode: "subscriber" | "outreach";
  categoryName?: (id: string | null) => string;
  showCategory?: boolean;
}) {
  const deleteContact = useDeleteContact();

  if (contacts.length === 0) {
    return <div className="py-16 text-center text-muted border border-default rounded-2xl border-dashed text-sm">No contacts yet.</div>;
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
            {showCategory && <TableHead>Category</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-semibold text-text">{[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
              <TableCell className="text-muted">{c.company || "—"}</TableCell>
              <TableCell className="text-muted">{c.email}</TableCell>
              <TableCell className="text-muted">{c.phone || "—"}</TableCell>
              <TableCell className="text-muted">{[c.city, c.country].filter(Boolean).join(", ") || "—"}</TableCell>
              {showCategory && <TableCell className="text-muted">{categoryName?.(c.category_id) ?? "—"}</TableCell>}
              <TableCell>
                {statusMode === "subscriber" ? (
                  <StatusPill value={c.subscriber_status} styles={SUBSCRIBER_STYLE} labels={SUBSCRIBER_LABEL} />
                ) : (
                  <StatusPill value={c.outreach_status} styles={OUTREACH_STYLE} labels={OUTREACH_LABEL} />
                )}
              </TableCell>
              <TableCell>
                <button onClick={() => deleteContact.mutate(c.id)} className="text-muted hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
