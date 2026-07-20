"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Settings2, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useContactCategories, useCreateContactCategory, ContactCategoryWithCount } from "@/modules/contacts/hooks/useContacts";
import { CategoryManager } from "@/modules/contacts/components/CategoryManager";
import { CategoryCompositionBar } from "@/modules/contacts/components/CategoryCompositionBar";
import { ScrapeProgressBanner } from "../components/ScrapeProgressBanner";
import { LeadsDrawer } from "../components/LeadsDrawer";
import { ROUTES } from "@/config/routes";

export function LeadsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<ContactCategoryWithCount | null>(null);
  const [managing, setManaging] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: categories = [], isLoading } = useContactCategories();
  const createCategory = useCreateContactCategory();

  const submitNew = async () => {
    if (!newName.trim()) return;
    await createCategory.mutateAsync(newName.trim());
    setNewName("");
    setCreating(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-text">Leads</h2>
          <p className="text-sm text-muted mt-1">Every list of potential clients, and how each one is coming along.</p>
        </div>
        <Button onClick={() => router.push(ROUTES.OUTREACH.FIND_LEADS)} icon={<Search className="w-4 h-4" />}>Find Leads</Button>
      </div>

      <ScrapeProgressBanner />

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-surface animate-pulse" />)}</div>
      ) : categories.length === 0 ? (
        <div className="py-16 text-center border border-default rounded-2xl border-dashed space-y-3">
          <p className="text-sm text-muted">Create your first list to start finding leads.</p>
          {creating ? (
            <div className="flex justify-center gap-2">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Dental Clinics" className="max-w-[220px]" autoFocus />
              <Button size="sm" onClick={submitNew} loading={createCategory.isPending} icon={<Check className="w-3.5 h-3.5" />} />
              <Button size="sm" variant="outline" onClick={() => setCreating(false)} icon={<X className="w-3.5 h-3.5" />} />
            </div>
          ) : (
            <Button size="sm" onClick={() => setCreating(true)} icon={<Plus className="w-3.5 h-3.5" />}>Create a list</Button>
          )}
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <Button size="sm" variant="ghost" onClick={() => setManaging(!managing)} icon={<Settings2 className="w-3.5 h-3.5" />}>Manage lists</Button>
          </div>

          {managing && <CategoryManager />}

          <div className="border border-default rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow><TableHead>List</TableHead><TableHead>Leads</TableHead><TableHead className="w-40">Progress</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => setSelected(c)}>
                    <TableCell className="font-semibold text-text">{c.name}</TableCell>
                    <TableCell className="text-muted tabular-nums">{c.contactCount}</TableCell>
                    <TableCell><CategoryCompositionBar breakdown={c.statusBreakdown} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <LeadsDrawer category={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
