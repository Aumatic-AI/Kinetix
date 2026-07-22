"use client";
import { useState } from "react";
import { Plus, Archive, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState, Card } from "../competitors/shared";
import { useLeadForms, useCreateLeadForm, useArchiveLeadForm } from "../../hooks/useLeads";

const PRESETS = [
  { id: "FULL_NAME", label: "Full name" },
  { id: "EMAIL", label: "Email" },
  { id: "PHONE", label: "Phone" },
];

function CreateFormPanel({ onClose }: { onClose: () => void }) {
  const createForm = useCreateLeadForm();
  const [name, setName] = useState("");
  const [presets, setPresets] = useState<string[]>(["FULL_NAME", "EMAIL", "PHONE"]);
  const [customQuestions, setCustomQuestions] = useState<string[]>([""]);
  const [thankYouUrl, setThankYouUrl] = useState("");
  const [error, setError] = useState("");

  const togglePreset = (id: string) => setPresets((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const submit = async () => {
    setError("");
    if (!name.trim()) return setError("Form name is required.");
    try {
      await createForm.mutateAsync({
        name: name.trim(),
        presetQuestions: presets,
        customQuestions: customQuestions.filter((q) => q.trim()),
        thankYouUrl: thankYouUrl.trim() || undefined,
      });
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to create form");
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-text">New Instant Form</p>
        <button onClick={onClose} className="text-muted hover:text-text"><X className="w-4 h-4" /></button>
      </div>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Form name" />
      <div>
        <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Questions</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => togglePreset(p.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${presets.includes(p.id) ? "bg-primary text-white border-primary" : "border-default text-muted hover:bg-surface"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {customQuestions.map((q, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={q}
              onChange={(e) => setCustomQuestions((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
              placeholder="Custom question (optional)"
            />
            {customQuestions.length > 1 && (
              <button onClick={() => setCustomQuestions((prev) => prev.filter((_, idx) => idx !== i))} className="text-muted hover:text-danger px-2"><X className="w-4 h-4" /></button>
            )}
          </div>
        ))}
        <button onClick={() => setCustomQuestions((prev) => [...prev, ""])} className="text-xs font-semibold text-primary hover:underline">+ Add another question</button>
      </div>
      <Input value={thankYouUrl} onChange={(e) => setThankYouUrl(e.target.value)} placeholder="Thank-you redirect URL (optional)" />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={createForm.isPending} onClick={submit}>Create Form</Button>
      </div>
    </Card>
  );
}

export function LeadFormsPanel() {
  const { data: forms, isLoading, error } = useLeadForms();
  const archiveForm = useArchiveLeadForm();
  const [creating, setCreating] = useState(false);

  if (error) {
    return (
      <div className="text-sm text-muted bg-surface border border-default rounded-xl px-4 py-3">
        Lead forms need Page setup first — set <code>META_PAGE_ID</code> and <code>META_PAGE_TOKEN</code>. See the build guide&apos;s Leads section for the exact steps.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!creating && <Button size="sm" onClick={() => setCreating(true)} icon={<Plus className="w-3.5 h-3.5" />}>New Form</Button>}
      </div>
      {creating && <CreateFormPanel onClose={() => setCreating(false)} />}
      {isLoading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 rounded-lg bg-surface animate-pulse" />)}</div>
      ) : !forms?.length ? (
        <EmptyState message="No Instant Forms yet." />
      ) : (
        <div className="space-y-2">
          {forms.map((f) => (
            <div key={f.id} className="flex items-center justify-between bg-background border border-default/60 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-muted" />
                <p className="text-sm font-semibold text-text">{f.name}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => archiveForm.mutate(f.id)} icon={<Archive className="w-3.5 h-3.5" />}>Archive</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
