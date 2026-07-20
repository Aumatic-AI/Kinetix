"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/Button";
import { ContactsTable } from "@/modules/contacts/components/ContactsTable";
import { useContacts, ContactCategoryWithCount } from "@/modules/contacts/hooks/useContacts";
import { AddLeadModal } from "./AddLeadModal";

export function LeadsDrawer({ category, onClose }: { category: ContactCategoryWithCount | null; onClose: () => void }) {
  const [adding, setAdding] = useState(false);
  const [addModalKey, setAddModalKey] = useState(0);

  const { data, isLoading } = useContacts({ categoryId: category?.id }, 1, 200);

  const openAddModal = () => {
    setAdding(true);
    setAddModalKey((k) => k + 1);
  };

  return (
    <>
      <Drawer open={!!category} onOpenChange={(open) => !open && onClose()} swipeDirection="right">
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{category?.name}</DrawerTitle>
            <DrawerDescription>{category?.contactCount ?? 0} lead{category?.contactCount === 1 ? "" : "s"} in this list.</DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-6 space-y-4">
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-surface animate-pulse" />)}</div>
            ) : (
              <ContactsTable contacts={data?.contacts || []} statusMode="outreach" showCategory={false} />
            )}
          </div>

          <DrawerFooter>
            <Button variant="outline" onClick={openAddModal} icon={<Plus className="w-4 h-4" />}>Add Lead</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AddLeadModal key={addModalKey} categoryId={category?.id} open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
