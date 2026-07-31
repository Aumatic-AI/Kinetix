"use client";
import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/Button";
import { LeadsTable } from "./LeadsTable";
import { useInfiniteLeads, LeadListWithCount } from "@/modules/outreach/hooks/useLeads";
import { AddLeadModal } from "./AddLeadModal";

const PAGE_LIMIT = 30;
// Start fetching the next page this many pixels before the scroll container
// actually bottoms out, so new rows are ready before the user hits the end.
const SCROLL_THRESHOLD_PX = 150;

export function LeadsDrawer({ list, onClose }: { list: LeadListWithCount | null; onClose: () => void }) {
  const [adding, setAdding] = useState(false);
  const [addModalKey, setAddModalKey] = useState(0);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteLeads({ listId: list?.id }, PAGE_LIMIT);
  const leads = data?.pages.flatMap((page) => page.leads) || [];

  const openAddModal = () => {
    setAdding(true);
    setAddModalKey((k) => k + 1);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD_PX;
    if (nearBottom && hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  return (
    <>
      <Drawer open={!!list} onOpenChange={(open) => !open && onClose()} swipeDirection="right">
        <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:800px]">
          <DrawerHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <DrawerTitle>{list?.name}</DrawerTitle>
              <DrawerDescription>{list?.leadCount ?? 0} lead{list?.leadCount === 1 ? "" : "s"} in this list.</DrawerDescription>
            </div>
            <Button size="sm" onClick={openAddModal} icon={<Plus className="w-4 h-4" />}>Add Lead</Button>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-6 space-y-4" onScroll={handleScroll}>
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-surface animate-pulse" />)}</div>
            ) : (
              <>
                <LeadsTable leads={leads} />
                {isFetchingNextPage && (
                  <div className="flex justify-center py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted" />
                  </div>
                )}
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <AddLeadModal key={addModalKey} listId={list?.id} open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
