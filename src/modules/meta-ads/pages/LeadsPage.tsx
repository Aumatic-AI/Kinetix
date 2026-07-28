"use client";
import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TabSwitch } from "@/components/global/TabSwitch";
import { useLeadsList, useSyncLeads, useLeadForms, Lead } from "../hooks/useLeads";
import { LeadsTable } from "../components/leads/LeadsTable";
import { LeadDetailsModal } from "../components/leads/LeadDetailsModal";
import { LeadFormsPanel } from "../components/leads/LeadFormsPanel";
import { CreateLeadFormModal } from "../components/leads/CreateLeadFormModal";

export function LeadsPage() {
  const { data: leads = [], isLoading } = useLeadsList();
  const { data: forms = [] } = useLeadForms();
  const syncMutation = useSyncLeads();
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [tab, setTab] = useState("leads");
  const [creatingForm, setCreatingForm] = useState(false);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-text">Lead Responses</h2>
          <p className="text-sm text-muted mt-1">Arrive here the moment someone submits a form — no need to refresh.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => syncMutation.mutate()}
          loading={syncMutation.isPending}
          icon={<RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />}
        >
          {syncMutation.isPending ? "Syncing…" : "Sync now"}
        </Button>
      </div>

      {syncMutation.data && (
        <p className="text-xs text-muted">Checked {syncMutation.data.formsChecked} form(s), imported {syncMutation.data.leadsImported} lead(s).</p>
      )}
      {syncMutation.error && <p className="text-sm text-danger">{(syncMutation.error as Error).message}</p>}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <TabSwitch
          value={tab}
          onValueChange={setTab}
          items={[
            { value: "leads", label: "Leads", count: leads.length },
            { value: "forms", label: "Instant Forms", count: forms.length },
          ]}
        />
        {tab === "forms" && (
          <Button size="sm" onClick={() => setCreatingForm(true)} icon={<Plus className="w-3.5 h-3.5" />}>
            New Instant Form
          </Button>
        )}
      </div>
      <div>
        {tab === "leads" ? (
          isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-surface animate-pulse" />)}</div>
          ) : (
            <LeadsTable leads={leads} onView={setViewingLead} />
          )
        ) : (
          <LeadFormsPanel />
        )}
      </div>

      <LeadDetailsModal lead={viewingLead} onClose={() => setViewingLead(null)} />
      <CreateLeadFormModal open={creatingForm} onClose={() => setCreatingForm(false)} />
    </div>
  );
}
