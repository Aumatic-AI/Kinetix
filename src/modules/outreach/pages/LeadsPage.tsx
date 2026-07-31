"use client";
import { useState } from "react";
import { Search, Plus, Pencil, Trash2, Eye, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/Pagination";
import { PAGE_SIZE_COMPACT } from "@/lib/pagination";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { usePaginatedLeadLists, useDeleteLeadList, LeadListWithCount } from "@/modules/outreach/hooks/useLeads";
import { ListModal } from "../components/leads/ListModal";
import { ScrapeProgressBanner } from "../components/leads/ScrapeProgressBanner";
import { LeadsDrawer } from "../components/leads/LeadsDrawer";
import { FindLeadsModal } from "../components/leads/FindLeadsModal";

// Table rows — compact page size.
const PAGE_SIZE = PAGE_SIZE_COMPACT;

/** Mirrors the lead-lists table's real columns exactly — only the body
 * shimmers, the header renders immediately since its labels are already
 * known. The Avatar slot uses a plain Skeleton (not the real Avatar with an
 * empty label, which would render a literal "?" glyph). */
function LeadListsTableSkeleton() {
  return (
    <div className="border border-default rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>List</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3].map((i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                  <Skeleton className="h-3.5 w-32 rounded" />
                </div>
              </TableCell>
              <TableCell className="text-right"><Skeleton className="h-3.5 w-8 rounded ml-auto" /></TableCell>
              <TableCell>
                <div className="flex items-center gap-2 justify-end">
                  <Skeleton className="h-8 w-16 rounded-lg" />
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function LeadsPage() {
  const [selected, setSelected] = useState<LeadListWithCount | null>(null);
  const [editingList, setEditingList] = useState<LeadListWithCount | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [findLeadsOpen, setFindLeadsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LeadListWithCount | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = usePaginatedLeadLists(page, PAGE_SIZE);
  const lists = data?.lists || [];
  const deleteList = useDeleteLeadList();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError("");
    try {
      await deleteList.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete list");
    }
  };

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
          <Button onClick={() => setFindLeadsOpen(true)} icon={<Search className="w-4 h-4" />}>Find Leads</Button>
        </div>
      </div>

      <ScrapeProgressBanner />

      {isLoading ? (
        <LeadListsTableSkeleton />
      ) : lists.length === 0 ? (
        <div className="py-16 text-center border border-default rounded-2xl border-dashed space-y-3">
          <p className="text-sm text-muted">Create your first list to start finding leads.</p>
          <Button size="sm" onClick={openCreateModal} icon={<Plus className="w-3.5 h-3.5" />}>Create a list</Button>
        </div>
      ) : (
        <>
          <div className="border border-default rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>List</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lists.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-semibold text-text">
                      <div className="flex items-center gap-3">
                        <Avatar icon={Users} />
                        <span>{l.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted">{l.leadCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => setSelected(l)} icon={<Eye className="w-3.5 h-3.5" />}>View</Button>
                        <button onClick={() => openEditModal(l)} className="text-muted hover:text-text" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setDeleteError(""); setDeleteTarget(l); }} className="text-muted hover:text-danger" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination page={page} totalPages={data?.totalPages || 1} onPageChange={setPage} />
        </>
      )}

      <LeadsDrawer list={selected} onClose={() => setSelected(null)} />
      <ListModal key={modalKey} list={editingList} open={modalOpen} onClose={() => setModalOpen(false)} />
      <FindLeadsModal open={findLeadsOpen} onClose={() => setFindLeadsOpen(false)} />

      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open && !deleteList.isPending) { setDeleteTarget(null); setDeleteError(""); } }}
        title="Delete this list?"
        description={deleteTarget ? `"${deleteTarget.name}" will be permanently deleted. Its ${deleteTarget.leadCount} lead${deleteTarget.leadCount === 1 ? "" : "s"} won't be deleted — they'll just become unassigned. This can't be undone.` : ""}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteList.isPending}
        error={deleteError}
        onConfirm={handleDelete}
      />
    </div>
  );
}
