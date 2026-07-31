"use client";
import { useEffect, useState } from "react";
import { TabSwitch } from "@/components/global/TabSwitch";
import { Section } from "@/components/ui/Section";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { UnsavedChangesBar } from "@/components/ui/UnsavedChangesBar";
import { Switch } from "@/components/ui/Switch";
import { useSettings, useUpdateSettings } from "../hooks/useSettings";
import { BusinessSettings } from "../types/settings.types";
import { Field, TagInput, ServicesEditor, AdScriptTopicsEditor, WeekdayToggle, TimezoneSelect, VideoReferenceUploader, ScheduleEditor } from "../components/shared";

const SETTINGS_TABS = [
  { value: "general", label: "General" },
  { value: "voice", label: "Brand & Voice" },
  { value: "services", label: "Services" },
  { value: "intelligence", label: "Competitor Intelligence" },
  { value: "automation", label: "Automation Defaults" },
];

/**
 * The one Settings page, reached at /settings — no secondary sidebar and
 * no further route-level sub-pages, just this one page backed by the
 * businesses table. Every field here maps to a column that's actually read
 * somewhere else in the app (AI prompt context, the competitor scraper,
 * Outreach defaults, Meta Ads defaults). Columns with no real consumer yet
 * (keywords, business_colors, guidelines) are deliberately left out rather
 * than guessed at. The "so many settings" problem is solved with in-page
 * Tabs instead, not a secondary sidebar or more routes.
 *
 * One shared dirty-check drives the floating save bar: local `form` vs the
 * last-fetched `data` are compared, so the bar (and therefore the only Save
 * affordance on the page) only appears once something has actually changed
 * — switching tabs never loses edits, since all fields live in this one
 * `form` object regardless of which tab is currently visible.
 */
export function SettingsPage() {
  const { data, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState<BusinessSettings | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    if (data && !form) setForm(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (isLoading || !form) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-10">
        <div>
          <h1 className="text-2xl font-bold text-text">Settings</h1>
          <p className="text-sm text-muted mt-1">Business context used across AI generation, competitor intelligence, and outreach.</p>
        </div>

        <TabSwitch value="general" onValueChange={() => {}} items={SETTINGS_TABS} />

        <Section title="Business Identity" description="Core facts about the business — not shown publicly, just context for the rest of the app.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Business Name"><Skeleton className="w-full rounded-lg" style={{ height: 46 }} /></Field>
            <Field label="Industry"><Skeleton className="w-full rounded-lg" style={{ height: 46 }} /></Field>
            <div className="sm:col-span-2">
              <Field label="Website URL"><Skeleton className="w-full rounded-lg" style={{ height: 46 }} /></Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Description"><Skeleton className="w-full rounded-lg" style={{ height: 120 }} /></Field>
            </div>
          </div>
        </Section>
      </div>
    );
  }

  const isDirty = JSON.stringify(form) !== JSON.stringify(data);
  const patch = (p: Partial<BusinessSettings>) => setForm((prev) => (prev ? { ...prev, ...p } : prev));
  const patchOutreach = (p: Partial<BusinessSettings["outreachSettings"]>) => patch({ outreachSettings: { ...form.outreachSettings, ...p } });

  const handleSave = async () => {
    setError("");
    try {
      await updateSettings.mutateAsync(form);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    }
  };

  const handleDiscard = () => {
    setError("");
    if (data) setForm(data);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-text">Settings</h1>
        <p className="text-sm text-muted mt-1">Business context used across AI generation, competitor intelligence, and outreach.</p>
      </div>

      {error && <p className="text-sm text-danger font-medium">{error}</p>}

      <TabSwitch value={activeTab} onValueChange={setActiveTab} items={SETTINGS_TABS} />

      {activeTab === "general" && (
          <Section title="Business Identity" description="Core facts about the business — not shown publicly, just context for the rest of the app.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Business Name"><Input value={form.name} onChange={(e) => patch({ name: e.target.value })} /></Field>
              <Field label="Industry"><Input value={form.industry} onChange={(e) => patch({ industry: e.target.value })} placeholder="e.g. Medical Tourism" /></Field>
              <div className="sm:col-span-2">
                <Field label="Website URL"><Input value={form.websiteUrl} onChange={(e) => patch({ websiteUrl: e.target.value })} placeholder="https://" /></Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Description"><Textarea value={form.description} onChange={(e) => patch({ description: e.target.value })} rows={3} /></Field>
              </div>
            </div>
          </Section>
      )}

      {activeTab === "voice" && (
          <Section title="Brand & Voice" description="Injected into every AI-generated ad script, so it sounds like this business, not a generic template.">
            <div className="space-y-4">
              <Field label="Tone of Voice" hint="A few words describing how this business should sound.">
                <Input value={form.toneOfVoice} onChange={(e) => patch({ toneOfVoice: e.target.value })} placeholder="e.g. Warm, professional, trustworthy" />
              </Field>
              <Field label="Business Voice Guidelines"><Textarea value={form.businessVoice} onChange={(e) => patch({ businessVoice: e.target.value })} rows={3} /></Field>
              <Field label="Core Offerings"><Textarea value={form.coreOfferings} onChange={(e) => patch({ coreOfferings: e.target.value })} rows={2} /></Field>
              <Field label="Pain Points" hint="What problems this business solves for its customers.">
                <Textarea value={form.painPoints} onChange={(e) => patch({ painPoints: e.target.value })} rows={2} />
              </Field>
              <Field label="Target Audience"><Textarea value={form.targetAudience} onChange={(e) => patch({ targetAudience: e.target.value })} rows={2} /></Field>
            </div>
          </Section>
      )}

      {activeTab === "services" && (
          <Section title="Services" description="What this business actually offers — used so AI-facing features (e.g. Outreach drafts) know what each service means.">
            <ServicesEditor services={form.services} onChange={(services) => patch({ services })} />
          </Section>
      )}

      {activeTab === "intelligence" && (
          <div className="space-y-4">
            <Section title="Target Markets" description="Countries the competitor-ad scraper searches, and the keywords it uses to find competitor ads.">
              <div className="space-y-4">
                <Field label="Target Countries"><TagInput values={form.targetCountries} onChange={(targetCountries) => patch({ targetCountries })} placeholder="Add a country code, e.g. US" /></Field>
                <Field label="Competitor Search Keywords"><TagInput values={form.competitorKeywords} onChange={(competitorKeywords) => patch({ competitorKeywords })} placeholder="Add a keyword" /></Field>
              </div>
            </Section>

            <Section title="Ad Script Topics" description="The topic/format pairs the weekly competitor analysis looks for.">
              <AdScriptTopicsEditor topics={form.adScriptTopics} onChange={(adScriptTopics) => patch({ adScriptTopics })} />
            </Section>
          </div>
      )}

      {activeTab === "automation" && (
          <div className="space-y-4">
            <Section title="Outreach Defaults" description="Default sending pace and schedule for new outreach campaigns.">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Daily Send Limit">
                    <Input type="number" min="1" value={form.outreachSettings.dailyLimit} onChange={(e) => patchOutreach({ dailyLimit: Number(e.target.value) })} />
                  </Field>
                  <Field label="Timezone">
                    <TimezoneSelect value={form.outreachSettings.timezone} onChange={(timezone) => patchOutreach({ timezone })} />
                  </Field>
                </div>

                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex-1 min-w-60">
                    <Field label="Sending Days">
                      <WeekdayToggle
                        selected={form.outreachSettings.days}
                        onToggle={(day) =>
                          patchOutreach({ days: form.outreachSettings.days.includes(day) ? form.outreachSettings.days.filter((d) => d !== day) : [...form.outreachSettings.days, day] })
                        }
                      />
                    </Field>
                  </div>
                  <div className="w-36 shrink-0">
                    <Field label="Window Start">
                      <Input type="time" value={form.outreachSettings.sendWindow.from} onChange={(e) => patchOutreach({ sendWindow: { ...form.outreachSettings.sendWindow, from: e.target.value } })} />
                    </Field>
                  </div>
                  <div className="w-36 shrink-0">
                    <Field label="Window End">
                      <Input type="time" value={form.outreachSettings.sendWindow.to} onChange={(e) => patchOutreach({ sendWindow: { ...form.outreachSettings.sendWindow, to: e.target.value } })} />
                    </Field>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Meta Ads Defaults" description="Applied automatically when launching a new campaign or ad set.">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.metaAdsAdvantageAudienceDefault}
                  onChange={(e) => patch({ metaAdsAdvantageAudienceDefault: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded border-border accent-primary"
                />
                <span className="text-xs text-text">
                  <span className="font-semibold">Advantage+ Audience by default</span>
                  <span className="block text-muted">New ad sets start with Meta&apos;s automatic audience expansion turned on.</span>
                </span>
              </label>
            </Section>

            <Section title="Video Character Reference" description="Optional — locks every AI-generated video (Meta Ads + Social Media) to one real person's photo per gender, so the character stays visually consistent scene to scene. Image generation is never affected.">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-3 shrink-0">
                  <Switch checked={form.videoReferenceEnabled} onCheckedChange={(checked) => patch({ videoReferenceEnabled: checked })} />
                  <span className="text-xs font-semibold text-text">Use reference photo for video generation</span>
                </div>
                {form.videoReferenceEnabled && (
                  <div className="flex items-center gap-4 flex-wrap">
                    <VideoReferenceUploader gender="male" label="Male Reference Photo" url={data?.videoReferenceMaleUrl ?? null} />
                    <VideoReferenceUploader gender="female" label="Female Reference Photo" url={data?.videoReferenceFemaleUrl ?? null} />
                  </div>
                )}
              </div>
              {form.videoReferenceEnabled && (!data?.videoReferenceMaleUrl || !data?.videoReferenceFemaleUrl) && (
                <p className="text-xs text-warning mt-2">Upload both photos above — Save is blocked until both are set.</p>
              )}
            </Section>

            <Section title="Analysis Schedule" description="When the weekly Competitor Analysis and Self Ad Analysis reports run — pick any day and time, nothing is fixed in code.">
              <div className="space-y-6">
                <ScheduleEditor
                  label="Competitor Analysis"
                  description="Scrapes competitor ads and refreshes the Competitor Intelligence report."
                  day={form.competitorAnalysisScheduleDay}
                  hour={form.competitorAnalysisScheduleHour}
                  lastRunAt={data?.competitorAnalysisLastRunAt ?? null}
                  timezone={form.outreachSettings.timezone}
                  onChange={(p) => patch({ competitorAnalysisScheduleDay: p.day ?? form.competitorAnalysisScheduleDay, competitorAnalysisScheduleHour: p.hour ?? form.competitorAnalysisScheduleHour })}
                />
                <div className="border-t border-border" />
                <ScheduleEditor
                  label="Self Ad Analysis"
                  description="Analyzes this business's own live ad performance for next week's creative directives."
                  day={form.selfAdAnalysisScheduleDay}
                  hour={form.selfAdAnalysisScheduleHour}
                  lastRunAt={data?.selfAdAnalysisLastRunAt ?? null}
                  timezone={form.outreachSettings.timezone}
                  onChange={(p) => patch({ selfAdAnalysisScheduleDay: p.day ?? form.selfAdAnalysisScheduleDay, selfAdAnalysisScheduleHour: p.hour ?? form.selfAdAnalysisScheduleHour })}
                />
              </div>
            </Section>
          </div>
      )}

      <UnsavedChangesBar open={isDirty} onSave={handleSave} onDiscard={handleDiscard} saving={updateSettings.isPending} />
    </div>
  );
}
