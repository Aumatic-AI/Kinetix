"use client";
import { useState } from "react";
import { Search, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStartScrape } from "../../hooks/useScrapeJobs";
import { useLeadLists, useCreateLeadList } from "@/modules/outreach/hooks/useLeads";
import { useJobsStore } from "@/store";
import { ROUTES } from "@/config/routes";

/** The scrape job this kicks off still gets recorded in outreach_scrape_jobs
 * as before — only the "Past Searches" list UI was removed, not the data or
 * the ability to query it later (useScrapeJobs is still there, unused for now). */
export function FindLeadsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [niches, setNiches] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState("100");
  const [listId, setListId] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [error, setError] = useState("");

  const { data: lists = [] } = useLeadLists();
  const createList = useCreateLeadList();
  const startScrape = useStartScrape();
  const addJob = useJobsStore((s) => s.addJob);

  const reset = () => {
    setNiches("");
    setLocation("");
    setMaxResults("100");
    setListId("");
    setCreatingList(false);
    setNewListName("");
    setError("");
  };

  const submitNewList = async () => {
    if (!newListName.trim()) return;
    const result = await createList.mutateAsync(newListName.trim());
    setListId(result.list.id);
    setNewListName("");
    setCreatingList(false);
  };

  const handleStart = async () => {
    setError("");
    if (!niches.trim() || !location.trim()) return setError("Enter what you're looking for and where.");
    if (!listId) return setError("Choose a list to save these leads into.");
    const parsedMax = Number(maxResults);
    if (!parsedMax || parsedMax < 1) return setError("Enter how many leads to find.");
    try {
      const result = await startScrape.mutateAsync({ niches: niches.trim(), location: location.trim(), maxResults: parsedMax, listId });
      addJob({ id: result.job.id, title: `Finding leads: ${niches.trim()} in ${location.trim()}`, type: "outreach-scrape", targetUrl: ROUTES.OUTREACH.LEADS });
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start the search");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Find Leads</DialogTitle>
          <DialogDescription>Search for potential leads by industry and location — results land straight in your leads list once verified.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
              <Input type="number" min={1} value={maxResults} onChange={(e) => setMaxResults(e.target.value)} placeholder="e.g. 100" />
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
      </DialogContent>
    </Dialog>
  );
}
