"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Loader2, Check, X, ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useScrapeJobs, useStartScrape } from "../hooks/useScrapeJobs";
import { useLeadLists, useCreateLeadList, LeadListWithCount } from "@/modules/outreach/hooks/useLeads";
import { LeadsDrawer } from "../components/leads/LeadsDrawer";
import { useJobsStore } from "@/store";
import { ROUTES } from "@/config/routes";

const STATUS_STYLE: Record<string, string> = {
  queued: "text-muted bg-surface",
  running: "text-info bg-info-bg",
  succeeded: "text-success bg-success-bg",
  failed: "text-danger bg-danger-bg",
  cancelled: "text-muted bg-surface",
};

export function FindLeadsPage() {
  const router = useRouter();
  const [niches, setNiches] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState("100");
  const [listId, setListId] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [error, setError] = useState("");
  const [selectedList, setSelectedList] = useState<LeadListWithCount | null>(null);

  const { data: lists = [] } = useLeadLists();
  const { data: jobs = [], isLoading } = useScrapeJobs();
  const createList = useCreateLeadList();
  const startScrape = useStartScrape();
  const addJob = useJobsStore((s) => s.addJob);

  const submitNewList = async () => {
    if (!newListName.trim()) return;
    const result: any = await createList.mutateAsync(newListName.trim());
    setListId(result.list.id);
    setNewListName("");
    setCreatingList(false);
  };

  const handleStart = async () => {
    setError("");
    if (!niches.trim() || !location.trim()) return setError("Enter what you're looking for and where.");
    if (!listId) return setError("Choose a list to save these leads into.");
    try {
      const result: any = await startScrape.mutateAsync({ niches: niches.trim(), location: location.trim(), maxResults: Number(maxResults), listId });
      addJob({ id: result.job.id, title: `Finding leads: ${niches.trim()} in ${location.trim()}`, type: "outreach-scrape", targetUrl: ROUTES.OUTREACH.LEADS });
      router.push(ROUTES.OUTREACH.LEADS);
    } catch (e: any) {
      setError(e.message || "Failed to start the search");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <Link href={ROUTES.OUTREACH.LEADS} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-text">
        <ArrowLeft className="w-4 h-4" /> Back to Leads
      </Link>

      <div>
        <h2 className="text-2xl font-bold text-text">Find Leads</h2>
        <p className="text-sm text-muted mt-1">Search for potential leads by industry and location — results land straight in your leads list once verified.</p>
      </div>

      <div className="bg-background border border-default rounded-xl p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted uppercase tracking-wide">What kind of business are you looking for?</label>
            <Input value={niches} onChange={(e) => setNiches(e.target.value)} placeholder="e.g. Dentist, Clinic Owner" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted uppercase tracking-wide">Where should we look?</label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Toronto, Canada" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted uppercase tracking-wide">How many leads?</label>
            <Select value={maxResults} onValueChange={setMaxResults}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["50", "100", "200", "300", "500"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted uppercase tracking-wide">Save to</label>
            {creatingList ? (
              <div className="flex gap-2">
                <Input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="e.g. Dental Clinics" autoFocus />
                <Button size="sm" onClick={submitNewList} loading={createList.isPending} icon={<Check className="w-3.5 h-3.5" />} />
                <Button size="sm" variant="outline" onClick={() => setCreatingList(false)} icon={<X className="w-3.5 h-3.5" />} />
              </div>
            ) : lists.length === 0 ? (
              <Button size="sm" variant="outline" onClick={() => setCreatingList(true)}>+ Create a new list</Button>
            ) : (
              <Select value={listId} onValueChange={(v) => (v === "__new" ? setCreatingList(true) : setListId(v))}>
                <SelectTrigger><SelectValue placeholder="Choose a list" /></SelectTrigger>
                <SelectContent>
                  {lists.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  <SelectItem value="__new">+ Create a new list</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        {error && <p className="text-sm text-danger font-medium">{error}</p>}
        <Button onClick={handleStart} loading={startScrape.isPending} disabled={!listId && !creatingList} icon={<Search className="w-4 h-4" />}>
          {startScrape.isPending ? "Starting…" : "Find Leads"}
        </Button>
      </div>

      <div>
        <h3 className="text-sm font-bold text-text uppercase tracking-wide mb-3">Past Searches</h3>
        {isLoading ? (
          <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-surface animate-pulse" />)}</div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center text-muted border border-default rounded-2xl border-dashed text-sm">No searches yet.</div>
        ) : (
          <div className="border border-default rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Search</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Found</TableHead>
                  <TableHead className="text-right">Verified</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => {
                  const list = lists.find((l) => l.id === j.list_id) || null;
                  return (
                    <TableRow key={j.id}>
                      <TableCell className="font-semibold text-text">{j.niches} <span className="text-muted font-normal">in {j.location}</span></TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide inline-flex items-center gap-1 ${STATUS_STYLE[j.status]}`}>
                          {j.status === "running" && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                          {j.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{j.total_scraped}</TableCell>
                      <TableCell className="text-right tabular-nums">{j.valid_emails}</TableCell>
                      <TableCell className="text-muted whitespace-nowrap">{new Date(j.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" disabled={!list} onClick={() => setSelectedList(list)} icon={<Eye className="w-3.5 h-3.5" />}>View</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <LeadsDrawer list={selectedList} onClose={() => setSelectedList(null)} />
    </div>
  );
}
