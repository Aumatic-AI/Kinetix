"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, MoreVertical, Pencil, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useLeadLists, useDeleteLeadList, LeadListWithCount } from "@/modules/outreach/hooks/useLeads";
import { ListCompositionBar } from "../components/leads/ListCompositionBar";
import { ListModal } from "../components/leads/ListModal";
import { ScrapeProgressBanner } from "../components/leads/ScrapeProgressBanner";
import { LeadsDrawer } from "../components/leads/LeadsDrawer";
import { ROUTES } from "@/config/routes";

export function LeadsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<LeadListWithCount | null>(null);
  const [editingList, setEditingList] = useState<LeadListWithCount | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);

  const { data: lists = [], isLoading } = useLeadLists();
  const deleteList = useDeleteLeadList();

  const openCreateModal = () => {
    setEditingList(null);
    setModalOpen(true);
    setModalKey((k) => k + 1);
  };

  const openEditModal = (list: LeadListWithCount) => {
    setEditingList(list);
    setModalOpen(true);
    setModalKey((k) => k + 1);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-text">Leads</h2>
          <p className="text-sm text-muted mt-1">Every list of potential clients, and how each one is coming along.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openCreateModal} icon={<Plus className="w-4 h-4" />}>New List</Button>
          <Button onClick={() => router.push(ROUTES.OUTREACH.FIND_LEADS)} icon={<Search className="w-4 h-4" />}>Find Leads</Button>
        </div>
      </div>

      <ScrapeProgressBanner />

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-surface animate-pulse" />)}</div>
      ) : lists.length === 0 ? (
        <div className="py-16 text-center border border-default rounded-2xl border-dashed space-y-3">
          <p className="text-sm text-muted">Create your first list to start finding leads.</p>
          <Button size="sm" onClick={openCreateModal} icon={<Plus className="w-3.5 h-3.5" />}>Create a list</Button>
        </div>
      ) : (
        <div className="border border-default rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_160px_80px_44px] gap-4 px-4 py-2.5 bg-surface/60 border-b border-default text-[11px] font-bold text-muted uppercase tracking-wide">
            <span>List</span>
            <span className="text-right">Leads</span>
            <span>Progress</span>
            <span />
            <span />
          </div>
          <div className="divide-y divide-border">
            {lists.map((l) => (
              <div
                key={l.id}
                className="grid grid-cols-[1fr_100px_160px_80px_44px] gap-4 items-center px-4 py-3 hover:bg-surface/40 transition-colors"
              >
                <span className="font-semibold text-text truncate">{l.name}</span>
                <span className="text-muted tabular-nums text-right">{l.leadCount}</span>
                <ListCompositionBar breakdown={l.statusBreakdown} />
                <Button size="sm" variant="outline" onClick={() => setSelected(l)} icon={<Eye className="w-3.5 h-3.5" />}>View</Button>
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="p-1.5 rounded-md text-muted hover:bg-surface hover:text-text">
                      <MoreVertical className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditModal(l)}>
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => deleteList.mutate(l.id)}>
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <LeadsDrawer list={selected} onClose={() => setSelected(null)} />
      <ListModal key={modalKey} list={editingList} open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
