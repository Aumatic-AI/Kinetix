"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCreateLeadList, useRenameLeadList } from "../hooks/useLeads";
import { LeadList } from "../types/leads.types";

/** Shared create/edit modal for lead lists. The parent remounts this (via a
 * `key` that changes) every time it opens, so `name` initializes fresh from
 * `list` with no effect needed to resync it on reopen. */
export function ListModal({ list, open, onClose }: { list?: LeadList | null; open: boolean; onClose: () => void }) {
  const [name, setName] = useState(list?.name || "");
  const isEdit = !!list;

  const createList = useCreateLeadList();
  const renameList = useRenameLeadList();
  const isPending = createList.isPending || renameList.isPending;

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (isEdit && list) {
      await renameList.mutateAsync({ id: list.id, name: name.trim() });
    } else {
      await createList.mutateAsync(name.trim());
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit list" : "New list"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted uppercase tracking-wide">List name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dental Clinics" autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={isPending} disabled={!name.trim()}>{isEdit ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
