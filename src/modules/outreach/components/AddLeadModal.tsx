"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCreateContact } from "@/modules/contacts/hooks/useContacts";

/** Parent remounts this (via a `key` that changes on open) each time it's
 * opened, same pattern as CategoryModal — keeps the form fresh with no
 * effect needed to reset it between uses. */
export function AddLeadModal({ categoryId, open, onClose }: { categoryId?: string; open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const createContact = useCreateContact();

  const handleSubmit = async () => {
    if (!email.trim() || !categoryId) return;
    await createContact.mutateAsync({ email: email.trim(), firstName: firstName.trim() || undefined, categoryId });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted uppercase tracking-wide">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted uppercase tracking-wide">First name (optional)</label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Sarah" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={createContact.isPending} disabled={!email.trim()}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
