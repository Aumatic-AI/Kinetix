"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCreateContactCategory, useRenameContactCategory } from "../hooks/useContacts";
import { ContactCategory } from "../types/contacts.types";

/** Shared create/edit modal for lead lists — replaces the old inline
 * add/rename forms in CategoryManager. Newsletter's SubscribersPage still
 * uses CategoryManager directly, so that component stays untouched.
 *
 * The parent remounts this component (via a `key` that changes) every time
 * it opens, so `name` initializes fresh from `category` with no effect
 * needed to resync it on reopen. */
export function CategoryModal({ category, open, onClose }: { category?: ContactCategory | null; open: boolean; onClose: () => void }) {
  const [name, setName] = useState(category?.name || "");
  const isEdit = !!category;

  const createCategory = useCreateContactCategory();
  const renameCategory = useRenameContactCategory();
  const isPending = createCategory.isPending || renameCategory.isPending;

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (isEdit && category) {
      await renameCategory.mutateAsync({ id: category.id, name: name.trim() });
    } else {
      await createCategory.mutateAsync(name.trim());
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
