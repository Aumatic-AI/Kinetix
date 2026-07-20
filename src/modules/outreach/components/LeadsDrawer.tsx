"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ContactsTable } from "@/modules/contacts/components/ContactsTable";
import { useContacts, useCreateContact, ContactCategoryWithCount } from "@/modules/contacts/hooks/useContacts";

export function LeadsDrawer({ category, onClose }: { category: ContactCategoryWithCount | null; onClose: () => void }) {
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");

  const { data, isLoading } = useContacts({ categoryId: category?.id }, 1, 200);
  const createContact = useCreateContact();

  const handleAdd = async () => {
    if (!email.trim() || !category) return;
    await createContact.mutateAsync({ email: email.trim(), firstName: firstName.trim() || undefined, categoryId: category.id });
    setEmail("");
    setFirstName("");
    setAdding(false);
  };

  return (
    <Drawer open={!!category} onOpenChange={(open) => !open && onClose()} swipeDirection="right">
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{category?.name}</DrawerTitle>
          <DrawerDescription>{category?.contactCount ?? 0} lead{category?.contactCount === 1 ? "" : "s"} in this list.</DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-6 space-y-4">
          {adding && (
            <div className="bg-surface/60 rounded-lg p-3 flex flex-wrap items-end gap-2">
              <div className="space-y-1"><label className="text-xs font-bold text-muted uppercase">Email</label><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="h-8" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-muted uppercase">First name</label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Optional" className="h-8" /></div>
              <Button size="sm" onClick={handleAdd} loading={createContact.isPending}>Add</Button>
              <Button size="sm" variant="outline" onClick={() => setAdding(false)} icon={<X className="w-3.5 h-3.5" />} />
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-surface animate-pulse" />)}</div>
          ) : (
            <ContactsTable contacts={data?.contacts || []} statusMode="outreach" showCategory={false} />
          )}
        </div>

        <DrawerFooter>
          {!adding && <Button variant="outline" onClick={() => setAdding(true)} icon={<Plus className="w-4 h-4" />}>Add Lead</Button>}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
