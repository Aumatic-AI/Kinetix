"use client";
import { useEffect, useMemo, useState } from "react";
import { Rocket, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { createClient } from "@/lib/supabase/client";
import { useLaunchCampaign, useCampaignsList } from "../../hooks/useCampaigns";
import { MetaAdCreative } from "../../types/meta-ads.types";

const OBJECTIVES = [
  { value: "OUTCOME_TRAFFIC", label: "Traffic — send people to your website" },
  { value: "OUTCOME_LEADS", label: "Leads — collect enquiries (website or Instant Form)" },
  { value: "OUTCOME_SALES", label: "Sales — drive purchases on your website" },
  { value: "OUTCOME_AWARENESS", label: "Awareness — reach as many people as possible" },
  { value: "OUTCOME_ENGAGEMENT", label: "Engagement — likes, comments, shares" },
];

const CTA_TYPES = [
  { value: "LEARN_MORE", label: "Learn More" },
  { value: "GET_QUOTE", label: "Get Quote" },
  { value: "BOOK_TRAVEL", label: "Book Travel" },
  { value: "CONTACT_US", label: "Contact Us" },
  { value: "SIGN_UP", label: "Sign Up" },
  { value: "WATCH_MORE", label: "Watch More" },
];

const COMMON_COUNTRIES = ["US", "CA", "GB", "AU", "AE", "SA", "NZ", "IE"];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-muted uppercase tracking-wide">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

export function LaunchCampaignModal({ creative, onClose, onLaunched }: { creative: MetaAdCreative | null; onClose: () => void; onLaunched?: (campaignId: string) => void }) {
  const supabase = createClient();
  const launchMutation = useLaunchCampaign();
  const { data: campaigns = [] } = useCampaignsList();

  const { data: business } = useQuery({
    queryKey: ["meta-ads", "business-profile"],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("name, website_url, target_countries").limit(1).single();
      return data;
    },
    enabled: !!creative,
  });

  const [target, setTarget] = useState<"new" | string>("new");
  const [campaignName, setCampaignName] = useState("");
  const [objective, setObjective] = useState("OUTCOME_TRAFFIC");
  const [headline, setHeadline] = useState("");
  const [primaryText, setPrimaryText] = useState("");
  const [ctaType, setCtaType] = useState("LEARN_MORE");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [dailyBudgetDollars, setDailyBudgetDollars] = useState("15");
  const [countries, setCountries] = useState<string[]>(["US"]);
  const [ageMin, setAgeMin] = useState(25);
  const [ageMax, setAgeMax] = useState(65);
  const [gender, setGender] = useState<0 | 1 | 2>(0);
  const [startAt, setStartAt] = useState<Date | undefined>(undefined);
  const [endAt, setEndAt] = useState<Date | undefined>(undefined);
  const [leadGenFormId, setLeadGenFormId] = useState<string>("");
  const [error, setError] = useState("");

  const activeCampaigns = useMemo(() => campaigns.filter((c) => c.status !== "ARCHIVED" && c.status !== "archived"), [campaigns]);
  const isVideo = creative?.type === "video";
  const isLeadsObjective = target === "new" ? objective === "OUTCOME_LEADS" : false;

  const { data: leadForms } = useQuery({
    queryKey: ["meta-ads", "lead-forms"],
    queryFn: async () => {
      const res = await fetch("/api/meta-ads/lead-forms");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data.forms as { id: string; name: string }[];
    },
    enabled: isLeadsObjective,
    retry: false,
  });

  useEffect(() => {
    if (!creative) return;
    setCampaignName(creative.idea_prompt ? creative.idea_prompt.slice(0, 60) : `${creative.service || "Kinetix"} campaign`);
    setHeadline(creative.ad_script?.headline || "");
    setPrimaryText(creative.ad_script?.primary_text || "");
    setTarget("new");
    setError("");
  }, [creative]);

  useEffect(() => {
    if (business) {
      setWebsiteUrl(business.website_url || "");
      const fromBusiness = Array.isArray(business.target_countries) ? (business.target_countries as string[]) : null;
      if (fromBusiness?.length) setCountries(fromBusiness);
    }
  }, [business]);

  if (!creative) return null;

  const toggleCountry = (code: string) => {
    setCountries((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  const handleLaunch = async () => {
    setError("");
    if (!headline.trim() || !primaryText.trim()) {
      setError("Headline and primary text are required.");
      return;
    }
    if (target === "new" && !campaignName.trim()) {
      setError("Campaign name is required.");
      return;
    }
    const dollars = parseFloat(dailyBudgetDollars);
    if (!dollars || dollars <= 0) {
      setError("Enter a daily budget greater than $0.");
      return;
    }
    try {
      const result = await launchMutation.mutateAsync({
        creativeId: creative.id,
        existingCampaignId: target === "new" ? undefined : target,
        campaignName: campaignName.trim(),
        objective: objective as any,
        headline: headline.trim(),
        primaryText: primaryText.trim(),
        dailyBudgetCents: Math.round(dollars * 100),
        countries,
        ageMin,
        ageMax,
        gender,
        startAt: startAt?.toISOString(),
        endAt: endAt?.toISOString(),
        ctaType,
        websiteUrl: websiteUrl.trim(),
        leadGenFormId: leadGenFormId || undefined,
      });
      onLaunched?.(result.campaignId);
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to launch campaign");
    }
  };

  return (
    <Dialog open={!!creative} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-2xl bg-background border-border text-text p-0 sm:rounded-xl gap-0 overflow-hidden outline-none flex flex-col h-[88vh] shadow-lg">
        <DialogHeader className="px-6 py-5 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary" /> Launch Campaign
          </DialogTitle>
          <p className="text-xs text-muted">Creates a real Campaign, Ad Set, and Ad on Meta — always paused. Nothing spends until you Resume or Smart Run it.</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="flex gap-4">
            <div className="w-24 h-24 rounded-lg bg-surface border border-border overflow-hidden shrink-0 flex items-center justify-center">
              {creative.media_urls?.[0] ? (
                isVideo ? (
                  <video src={creative.media_urls[0]} className="w-full h-full object-cover" muted preload="metadata" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={creative.media_urls[0]} alt="" className="w-full h-full object-cover" />
                )
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <Field label="Add to">
                <Select value={target} onValueChange={setTarget}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">A new campaign</SelectItem>
                    {activeCampaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} (existing)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {target === "new" && (
                <div className="mt-3">
                  <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Campaign name" />
                </div>
              )}
            </div>
          </div>

          {target === "new" && (
            <Field label="Objective" hint="What Meta optimizes delivery for.">
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OBJECTIVES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}

          {isLeadsObjective && (
            <Field label="Instant Form (optional)" hint="Leave unset to send clicks to your website instead of a native Meta form.">
              {leadForms === undefined ? (
                <p className="text-xs text-muted">Lead forms need Page setup first — see the Leads tab.</p>
              ) : (
                <Select value={leadGenFormId || "none"} onValueChange={(v) => setLeadGenFormId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Use website instead</SelectItem>
                    {leadForms.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </Field>
          )}

          <div className="space-y-4 rounded-xl border border-border p-4 bg-surface/40">
            <p className="text-xs font-bold text-text uppercase tracking-wide flex items-center gap-1.5">
              Ad Copy
              {isVideo && <span className="normal-case font-medium text-muted flex items-center gap-1"><Info className="w-3 h-3" /> not auto-generated for video — write it here</span>}
            </p>
            <Field label="Headline"><Input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={80} placeholder="Max 6 words, one specific benefit" /></Field>
            <Field label="Primary Text"><Textarea value={primaryText} onChange={(e) => setPrimaryText(e.target.value)} rows={3} placeholder="2-4 short sentences" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Button">
                <Select value={ctaType} onValueChange={setCtaType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CTA_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Destination URL"><Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://" /></Field>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-border p-4 bg-surface/40">
            <p className="text-xs font-bold text-text uppercase tracking-wide">Audience &amp; Budget</p>
            <Field label="Daily budget (USD)">
              <Input type="number" min="1" step="1" value={dailyBudgetDollars} onChange={(e) => setDailyBudgetDollars(e.target.value)} />
            </Field>
            <Field label="Countries">
              <div className="flex flex-wrap gap-2">
                {COMMON_COUNTRIES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleCountry(code)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${countries.includes(code) ? "bg-primary text-white border-primary" : "border-default text-muted hover:bg-surface"}`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Min age"><Input type="number" min="18" max="65" value={ageMin} onChange={(e) => setAgeMin(Number(e.target.value))} /></Field>
              <Field label="Max age"><Input type="number" min="18" max="65" value={ageMax} onChange={(e) => setAgeMax(Number(e.target.value))} /></Field>
              <Field label="Gender">
                <Select value={String(gender)} onValueChange={(v) => setGender(Number(v) as 0 | 1 | 2)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">All</SelectItem>
                    <SelectItem value="1">Male</SelectItem>
                    <SelectItem value="2">Female</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-border p-4 bg-surface/40">
            <p className="text-xs font-bold text-text uppercase tracking-wide">Schedule (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start"><DateTimePicker value={startAt} onChange={setStartAt} placeholder="Now" /></Field>
              <Field label="End"><DateTimePicker value={endAt} onChange={setEndAt} minDate={startAt} placeholder="No end date" /></Field>
            </div>
          </div>

          {error && <p className="text-sm text-danger font-medium">{error}</p>}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border shrink-0 sm:justify-between">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleLaunch} loading={launchMutation.isPending} icon={<Rocket className="w-4 h-4" />}>
            {launchMutation.isPending ? "Launching…" : "Launch (paused)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
