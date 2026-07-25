"use client";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Avatar } from "@/components/ui/Avatar";
import { formatDateTime } from "@/utils/datetime";
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
  if (leads.length === 0) return <EmptyState message="No leads yet — they'll appear here the moment someone submits a form." />;

  return (
    <div className="border border-default rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Campaign</TableHead>
            <TableHead>Ad</TableHead>
            <TableHead>Received</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const name = pick(lead.field_data, NAME_KEYS);
            return (
              <TableRow key={lead.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar label={name} />
                    <span className="font-semibold text-text">{name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted">{pick(lead.field_data, EMAIL_KEYS)}</TableCell>
                <TableCell className="text-muted">{pick(lead.field_data, PHONE_KEYS)}</TableCell>
                <TableCell className="text-muted truncate max-w-40">{lead.campaign_name || "—"}</TableCell>
                <TableCell className="text-muted truncate max-w-40">{lead.ad_name || "—"}</TableCell>
                <TableCell className="text-muted whitespace-nowrap">{formatDateTime(lead.created_at)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
