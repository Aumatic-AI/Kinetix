"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/Button";
import { LeadsTable } from "./LeadsTable";
import { useLeads, LeadListWithCount } from "@/modules/outreach/hooks/useLeads";
import { AddLeadModal } from "./AddLeadModal";

export function LeadsDrawer({ list, onClose }: { list: LeadListWithCount | null; onClose: () => void }) {
  const [adding, setAdding] = useState(false);
  const [addModalKey, setAddModalKey] = useState(0);

  const { data, isLoading } = useLeads({ listId: list?.id }, 1, 200);

  const openAddModal = () => {
    setAdding(true);
    setAddModalKey((k) => k + 1);
  };

  return (
    <>
      <Drawer open={!!list} onOpenChange={(open) => !open && onClose()} swipeDirection="right">
        <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:500px]">
          <DrawerHeader>
            <DrawerTitle>{list?.name}</DrawerTitle>
            <DrawerDescription>{list?.leadCount ?? 0} lead{list?.leadCount === 1 ? "" : "s"} in this list.</DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-6 space-y-4">
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-surface animate-pulse" />)}</div>
            ) : (
              <LeadsTable leads={data?.leads || []} />
            )}
          </div>

          <DrawerFooter>
            <Button variant="outline" onClick={openAddModal} icon={<Plus className="w-4 h-4" />}>Add Lead</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AddLeadModal key={addModalKey} listId={list?.id} open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
