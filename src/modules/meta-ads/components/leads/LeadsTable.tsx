"use client";
import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "../competitors/shared";
import { Lead } from "../../hooks/useLeads";

const NAME_KEYS = ["full_name", "first_name"];
const EMAIL_KEYS = ["email"];
const PHONE_KEYS = ["phone_number", "phone"];

function pick(fieldData: Record<string, string>, keys: string[]): string {
  for (const key of keys) if (fieldData[key]) return fieldData[key];
  return "—";
}

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (leads.length === 0) return <EmptyState message="No leads yet — they'll appear here the moment someone submits a form." />;

  return (
    <div className="border border-default rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Campaign</TableHead>
            <TableHead>Received</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const isOpen = expanded.has(lead.id);
            const extraFields = Object.entries(lead.field_data).filter(
              ([key]) => ![...NAME_KEYS, ...EMAIL_KEYS, ...PHONE_KEYS].includes(key)
            );
            return (
              <Fragment key={lead.id}>
                <TableRow className="cursor-pointer" onClick={() => toggle(lead.id)}>
                  <TableCell>{isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-muted" />}</TableCell>
                  <TableCell className="font-semibold text-text">{pick(lead.field_data, NAME_KEYS)}</TableCell>
                  <TableCell className="text-muted">{pick(lead.field_data, EMAIL_KEYS)}</TableCell>
                  <TableCell className="text-muted">{pick(lead.field_data, PHONE_KEYS)}</TableCell>
                  <TableCell className="text-muted truncate max-w-[160px]">{lead.campaign_name || "—"}</TableCell>
                  <TableCell className="text-muted whitespace-nowrap">{new Date(lead.created_at).toLocaleString()}</TableCell>
                </TableRow>
                {isOpen && (
                  <TableRow className="bg-surface/50 hover:bg-surface/50">
                    <TableCell />
                    <TableCell colSpan={5}>
                      <div className="py-2 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                        {extraFields.length === 0 ? (
                          <span className="text-muted">No additional fields.</span>
                        ) : (
                          extraFields.map(([key, value]) => (
                            <p key={key}><span className="font-semibold text-text capitalize">{key.replace(/_/g, " ")}: </span><span className="text-muted">{value}</span></p>
                          ))
                        )}
                        {lead.ad_name && <p><span className="font-semibold text-text">Ad: </span><span className="text-muted">{lead.ad_name}</span></p>}
                        {lead.adset_name && <p><span className="font-semibold text-text">Ad set: </span><span className="text-muted">{lead.adset_name}</span></p>}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
