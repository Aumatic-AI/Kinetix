"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateOutreachCampaign } from "../hooks/useOutreachCampaigns";
import { useLeadLists, useLeads } from "@/modules/leads/hooks/useLeads";
import { ROUTES } from "@/config/routes";

const SERVICE_TYPES = ["Hair Transplant", "Dental Treatment", "Cosmetic Surgery", "Eye Treatment", "IVF Fertility", "Thermal Wellness", "All Services"];
const TARGET_REGIONS = ["Europe", "Middle East", "Asia", "North America", "Global"];
const SUPPRESSED_STATUSES = ["bounced", "do_not_contact", "replied"] as const;

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-background border border-default rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-bold text-text uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

export function NewCampaignPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [listId, setListId] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [targetRegion, setTargetRegion] = useState("");
  const [goal, setGoal] = useState("");
  const [tone, setTone] = useState("Friendly and professional");
  const [messageBrief, setMessageBrief] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  const [error, setError] = useState("");

  const { data: lists = [] } = useLeadLists();
  const { data: audience } = useLeads({ excludeStatuses: [...SUPPRESSED_STATUSES], listId: listId || undefined }, 1, 1);
  const createCampaign = useCreateOutreachCampaign();

  const handleGenerate = async () => {
    setError("");
    if (!name.trim() || !listId || !serviceType || !targetRegion || !goal.trim() || !messageBrief.trim()) {
      return setError("Fill in a name, list, service type, target region, goal, and message.");
    }
    try {
      await createCampaign.mutateAsync({
        name: name.trim(),
        listId,
        serviceType,
        targetRegion,
        goal: goal.trim(),
        tone,
        messageBrief: messageBrief.trim(),
        ctaText: ctaText.trim() || undefined,
        ctaLink: ctaLink.trim() || undefined,
      });
      router.push(ROUTES.OUTREACH.CAMPAIGNS);
    } catch (e: any) {
      setError(e.message || "Failed to generate the draft");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <Link href={ROUTES.OUTREACH.CAMPAIGNS} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-text">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </Link>

      <div>
        <h2 className="text-2xl font-bold text-text">New Campaign</h2>
        <p className="text-sm text-muted mt-1">Fill this in and we&apos;ll write the first draft — you&apos;ll review it before anything sends.</p>
      </div>

      <FormSection title="Campaign Details">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted uppercase tracking-wide">Campaign name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q3 Dental Clinics" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted uppercase tracking-wide">List</label>
            {lists.length === 0 ? (
              <p className="text-xs text-muted pt-2">Create a list on the Leads page first.</p>
            ) : (
              <Select value={listId} onValueChange={setListId}>
                <SelectTrigger><SelectValue placeholder="Choose a list" /></SelectTrigger>
                <SelectContent>
                  {lists.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {listId && <p className="text-xs text-muted">{audience?.count ?? "…"} lead{audience?.count === 1 ? "" : "s"} will be eligible.</p>}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted uppercase tracking-wide">Service type</label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger><SelectValue placeholder="Choose a service" /></SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
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
      </FormSection>

      <FormSection title="Your Message">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted uppercase tracking-wide">Goal</label>
            <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Book a free consultation call" />
          </div>
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
      </FormSection>

      <FormSection title="Call to Action">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted uppercase tracking-wide">Button text</label>
            <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="e.g. Book Free Consultation" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted uppercase tracking-wide">Button link (optional)</label>
            <Input value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} placeholder="https://…" />
          </div>
        </div>
      </FormSection>

      {error && <p className="text-sm text-danger font-medium">{error}</p>}

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.push(ROUTES.OUTREACH.CAMPAIGNS)}>Cancel</Button>
        <Button onClick={handleGenerate} loading={createCampaign.isPending} icon={<Sparkles className="w-4 h-4" />}>
          {createCampaign.isPending ? "Writing…" : "Generate Draft"}
        </Button>
      </div>
    </div>
  );
}
