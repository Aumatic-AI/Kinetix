"use client";
import { useState } from "react";
import { Plus, Sparkles, RotateCcw, Check, Send, Trash2, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  useOutreachCampaigns,
  useOutreachCampaign,
  useCreateOutreachCampaign,
  useRegenerateOutreachCampaign,
  useEditOutreachCampaignContent,
  useApproveOutreachCampaign,
  useSendOutreachCampaign,
  useDeleteOutreachCampaign,
} from "../hooks/useOutreachCampaigns";
import { useContactCategories, useContacts } from "@/modules/contacts/hooks/useContacts";

const STATUS_STYLE: Record<string, string> = {
  draft: "text-muted bg-surface",
  active: "text-success bg-success-bg",
  paused: "text-warning bg-warning-bg",
  completed: "text-info bg-info-bg",
  archived: "text-muted bg-surface",
};

const SERVICE_TYPES = ["Hair Transplant", "Dental Treatment", "Cosmetic Surgery", "Eye Treatment", "IVF Fertility", "Thermal Wellness", "All Services"];
const TARGET_REGIONS = ["Europe", "Middle East", "Asia", "North America", "Global"];
const SUPPRESSED_STATUSES = ["bounced", "do_not_contact", "replied"] as const;

export function CampaignsPage() {
  const [composing, setComposing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [targetRegion, setTargetRegion] = useState("");
  const [goal, setGoal] = useState("");
  const [tone, setTone] = useState("Friendly and professional");
  const [messageBrief, setMessageBrief] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const { data: campaigns = [], isLoading } = useOutreachCampaigns();
  const { data: categories = [] } = useContactCategories();
  const { data: openCampaign } = useOutreachCampaign(openId);
  const { data: audience } = useContacts({ excludeOutreachStatuses: [...SUPPRESSED_STATUSES], categoryId: categoryId || undefined }, 1, 1);

  const createCampaign = useCreateOutreachCampaign();
  const regenerate = useRegenerateOutreachCampaign();
  const saveEdit = useEditOutreachCampaignContent();
  const approve = useApproveOutreachCampaign();
  const sendCampaign = useSendOutreachCampaign();
  const deleteCampaign = useDeleteOutreachCampaign();

  const resetCompose = () => {
    setComposing(false);
    setName(""); setCategoryId(""); setServiceType(""); setTargetRegion(""); setGoal(""); setMessageBrief(""); setCtaText(""); setCtaLink(""); setFeedback(""); setError("");
  };

  const handleGenerate = async () => {
    setError("");
    if (!name.trim() || !categoryId || !serviceType || !targetRegion || !goal.trim() || !messageBrief.trim()) {
      return setError("Fill in a name, list, service type, target region, goal, and message.");
    }
    try {
      const result = await createCampaign.mutateAsync({
        name: name.trim(),
        categoryId,
        serviceType,
        targetRegion,
        goal: goal.trim(),
        tone,
        messageBrief: messageBrief.trim(),
        ctaText: ctaText.trim() || undefined,
        ctaLink: ctaLink.trim() || undefined,
      });
      resetCompose();
      setOpenId(result.campaign.id);
    } catch (e: any) {
      setError(e.message || "Failed to generate the draft");
    }
  };

  const handleRegenerate = async () => {
    if (!openId || !feedback.trim()) return;
    await regenerate.mutateAsync({ campaignId: openId, feedback: feedback.trim() });
    setFeedback("");
  };

  const startEditing = () => {
    if (!openCampaign?.generated_body) return;
    setEditSubject(openCampaign.generated_body.subject);
    setEditBody(openCampaign.generated_body.body);
    setEditing(true);
  };

  const saveEdits = async () => {
    if (!openId) return;
    await saveEdit.mutateAsync({ campaignId: openId, subject: editSubject, body: editBody });
    setEditing(false);
  };

  const cancelDraft = async () => {
    if (!openId) return;
    await deleteCampaign.mutateAsync(openId);
    setOpenId(null);
    setEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-text">Campaigns</h2>
          <p className="text-sm text-muted mt-1">Draft, review, and send outreach emails.</p>
        </div>
        {!composing && <Button onClick={() => setComposing(true)} icon={<Plus className="w-4 h-4" />}>New Campaign</Button>}
      </div>

      {composing && (
        <div className="bg-background border border-default rounded-xl p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-xs font-bold text-muted uppercase tracking-wide">Campaign name</label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q3 Dental Clinics" /></div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted uppercase tracking-wide">List</label>
              {categories.length === 0 ? (
                <p className="text-xs text-muted pt-2">Create a list on the Leads page first.</p>
              ) : (
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Choose a list" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted uppercase tracking-wide">Service type</label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger><SelectValue placeholder="Choose a service" /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted uppercase tracking-wide">Target region</label>
              <Select value={targetRegion} onValueChange={setTargetRegion}>
                <SelectTrigger><SelectValue placeholder="Choose a region" /></SelectTrigger>
                <SelectContent>
                  {TARGET_REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-xs font-bold text-muted uppercase tracking-wide">Goal</label><Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Book a free consultation call" /></div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted uppercase tracking-wide">Tone</label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Friendly and professional", "Direct and concise", "Warm and consultative"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted uppercase tracking-wide">What should the email say?</label>
            <Textarea value={messageBrief} onChange={(e) => setMessageBrief(e.target.value)} rows={3} placeholder="Describe the message — what you're offering and why they'd care" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><label className="text-xs font-bold text-muted uppercase tracking-wide">Button text</label><Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="e.g. Book Free Consultation" /></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-muted uppercase tracking-wide">Button link (optional)</label><Input value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} placeholder="https://…" /></div>
          </div>
          {categoryId && <p className="text-xs text-muted">{audience?.count ?? "…"} lead{audience?.count === 1 ? "" : "s"} will be eligible for this campaign.</p>}
          {error && <p className="text-sm text-danger font-medium">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetCompose}>Cancel</Button>
            <Button onClick={handleGenerate} loading={createCampaign.isPending} icon={<Sparkles className="w-4 h-4" />}>{createCampaign.isPending ? "Writing…" : "Generate Draft"}</Button>
          </div>
        </div>
      )}

      {openId && openCampaign && (
        <div className="bg-background border border-primary/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-text">{openCampaign.name}</p>
            <button onClick={() => { setOpenId(null); setEditing(false); }} className="text-muted hover:text-text"><X className="w-4 h-4" /></button>
          </div>

          {editing ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase tracking-wide">Subject</label>
              <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
              <label className="text-xs font-bold text-muted uppercase tracking-wide">Body</label>
              <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={8} />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Discard changes</Button>
                <Button size="sm" onClick={saveEdits} loading={saveEdit.isPending} icon={<Check className="w-3.5 h-3.5" />}>Save edits</Button>
              </div>
            </div>
          ) : (
            openCampaign.generated_body && (
              <div className="bg-surface/60 rounded-lg p-4 space-y-2">
                <p className="text-xs font-bold text-muted uppercase tracking-wide">Subject</p>
                <p className="text-sm font-semibold text-text">{openCampaign.generated_body.subject}</p>
                <p className="text-xs font-bold text-muted uppercase tracking-wide mt-3">Body</p>
                <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">{openCampaign.generated_body.body}</p>
              </div>
            )
          )}

          {openCampaign.status === "draft" && !editing && (
            <div className="space-y-2">
              <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} placeholder="Ask the AI for changes (optional)" />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={handleRegenerate} loading={regenerate.isPending} disabled={!feedback.trim()} icon={<RotateCcw className="w-3.5 h-3.5" />}>Regenerate</Button>
                <Button size="sm" variant="outline" onClick={startEditing} icon={<Pencil className="w-3.5 h-3.5" />}>Edit</Button>
                <Button size="sm" onClick={() => approve.mutate(openId)} loading={approve.isPending} icon={<Check className="w-3.5 h-3.5" />}>Create Campaign</Button>
                <Button size="sm" variant="outline" onClick={cancelDraft} loading={deleteCampaign.isPending} icon={<Trash2 className="w-3.5 h-3.5" />}>Cancel</Button>
              </div>
            </div>
          )}

          {openCampaign.status === "active" && !openCampaign.external_campaign_id && (
            <Button onClick={() => sendCampaign.mutate({ id: openId })} loading={sendCampaign.isPending} icon={<Send className="w-4 h-4" />}>
              {sendCampaign.isPending ? "Sending…" : "Send"}
            </Button>
          )}
          {openCampaign.external_campaign_id && <p className="text-sm font-semibold text-success">Sent</p>}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-surface animate-pulse" />)}</div>
      ) : campaigns.length === 0 ? (
        <div className="py-16 text-center text-muted border border-default rounded-2xl border-dashed text-sm">No campaigns yet.</div>
      ) : (
        <div className="border border-default rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead className="w-10" /></TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => setOpenId(c.id)}>
                  <TableCell className="font-semibold text-text">{c.name}</TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLE[c.status]}`}>{c.status}</span></TableCell>
                  <TableCell>
                    <button onClick={(e) => { e.stopPropagation(); deleteCampaign.mutate(c.id); }} className="text-muted hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
