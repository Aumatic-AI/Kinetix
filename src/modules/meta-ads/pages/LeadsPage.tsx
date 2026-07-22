"use client";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLeadsList, useSyncLeads } from "../hooks/useLeads";
import { LeadsTable } from "../components/leads/LeadsTable";
import { LeadFormsPanel } from "../components/leads/LeadFormsPanel";

export function LeadsPage() {
  const { data: leads = [], isLoading } = useLeadsList();
  const syncMutation = useSyncLeads();

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

      <Tabs defaultValue="leads">
        <TabsList>
          <TabsTrigger value="leads">Leads {leads.length > 0 && `(${leads.length})`}</TabsTrigger>
          <TabsTrigger value="forms">Instant Forms</TabsTrigger>
        </TabsList>
        <TabsContent value="leads">
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-surface animate-pulse" />)}</div>
          ) : (
            <LeadsTable leads={leads} />
          )}
        </TabsContent>
        <TabsContent value="forms">
          <LeadFormsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
