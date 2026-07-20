# Outreach Leads Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework Outreach's lead management (categories-as-lists, client-friendly copy, background-job UX) and campaign creation (legacy-parity fields, generate/preview/edit flow), replacing the "reset lead status" model with a per-campaign lifecycle that needs no reset at all.

**Architecture:** Additive schema changes only (4 new columns + 1 NOT NULL on `outreach_campaigns`); no new tables. UI changes are contained to the `outreach` and `contacts` modules per the existing module split. Background-job progress reuses the already-built (but previously unused) `useJobsStore` + Supabase Realtime broadcast + `BackgroundJobsWidget` — this plan is what first wires a real feature into it.

**Tech Stack:** Next.js App Router, Supabase (Postgres/RLS), TanStack Query, Inngest, `sonner` (installed, not yet mounted), Zustand (`useJobsStore`), Base UI (`Drawer`/`Select`/`Table` wrappers in `src/components/ui`).

## Global Constraints

- No automated test suite exists in this repo (confirmed in `CLAUDE.md`) — every task's verification step is `npx tsc --noEmit` (must show zero *new* errors; the pre-existing unrelated `CreateAdModal.tsx` Base UI callback-signature error is expected and not to be touched) plus, where noted, a manual DB/API check. Do not run `npm run dev` to click through the UI yourself — the user tests UI manually.
- Never invent new CSS color/spacing tokens — reuse the existing `--color-*` tokens in `src/styles/globals.css` exactly as named in this plan.
- No UI copy may use the words "scrape", "Apify", "verification status", or any raw DB enum value — see the plain-language tables in the design spec (`docs/superpowers/specs/2026-07-20-outreach-leads-overhaul-design.md`) §4.
- `outreach_campaigns.category_id` becomes NOT NULL — every code path that creates or queries a campaign must supply/expect a real category id, never `null`.
- Newsletter module is out of scope — do not touch any `src/modules/newsletter/**` or `src/app/(app)/newsletter/**` file.
- Follow existing conventions exactly: Supabase client via `createClient()` from `@/lib/supabase/server` in API routes, `MetaAdsService.getFirstBusinessId(supabase)` for the single-business lookup, TanStack Query for all client data fetching.

Full design rationale lives in `docs/superpowers/specs/2026-07-20-outreach-leads-overhaul-design.md` — read it if a task references a decision ("§2", "§7") without repeating the reasoning here.

---

### Task 1: Database migration — campaign fields + required category

**Files:**
- Create: `supabase/migrations/20260726000000_outreach_campaign_fields.sql`
- Modify: `src/types/supabase.ts` (regenerated, not hand-edited)

**Interfaces:**
- Produces: `outreach_campaigns.service_type`, `.target_region`, `.cta_text`, `.cta_link` (all nullable TEXT), and `.category_id` (now `NOT NULL`) — consumed by Tasks 3–5.

- [ ] **Step 1: Write the migration**

```sql
-- Outreach campaign form gains the fields the legacy app actually used
-- (Service Type, Target Region, CTA button) plus a hard requirement that
-- every campaign target a specific lead list — no more "everyone not yet
-- contacted" default audience. See design spec §2–3.

ALTER TABLE outreach_campaigns
    ADD COLUMN service_type TEXT,
    ADD COLUMN target_region TEXT,
    ADD COLUMN cta_text TEXT,
    ADD COLUMN cta_link TEXT;

-- No campaign has been sent to a real audience yet (this module just
-- finished its first build pass) — safe to drop any draft rows created
-- during typecheck/manual testing rather than backfill a category.
DELETE FROM outreach_campaigns WHERE category_id IS NULL;

ALTER TABLE outreach_campaigns
    ALTER COLUMN category_id SET NOT NULL;
```

- [ ] **Step 2: Push the migration**

Run: `npx supabase db push --linked`
Expected: `Applying migration 20260726000000_outreach_campaign_fields.sql...` then success, no errors.

- [ ] **Step 3: Regenerate types**

Run: `npx supabase gen types typescript --project-id nzsxuyjermciofffcama --schema public > src/types/supabase.ts`

Do NOT append `2>&1` — a CLI notice on stderr corrupts the generated file (see `CLAUDE.md`).

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: identical error output to before this task (only the pre-existing `CreateAdModal.tsx` error) — nothing in this repo reads the new columns yet, so nothing should change.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260726000000_outreach_campaign_fields.sql src/types/supabase.ts
git commit -m "feat(db): add outreach campaign fields, require category_id"
```

---

### Task 2: Contacts data layer — suppression filter + category status breakdown

**Files:**
- Modify: `src/modules/contacts/types/contacts.types.ts`
- Modify: `src/modules/contacts/services/contacts.service.ts`
- Modify: `src/app/api/contacts/route.ts`
- Modify: `src/app/api/contacts/categories/route.ts`
- Modify: `src/modules/contacts/hooks/useContacts.ts`

**Interfaces:**
- Produces: `ContactFilters.excludeOutreachStatuses?: OutreachStatus[]`; `OUTREACH_STATUS_BUCKET: Record<OutreachStatus, "muted"|"info"|"success"|"danger">`; `CategoryStatusBreakdown { total, muted, info, success, danger }`; `ContactsService.getCategoryStatusBreakdown(supabase, businessId): Promise<Record<string, CategoryStatusBreakdown>>`; `ContactCategoryWithCount.statusBreakdown: CategoryStatusBreakdown`. Consumed by Task 5 (campaign audience count) and Task 7 (category composition bar).
- Removes: `ContactsService.countByCategory` (superseded by `getCategoryStatusBreakdown`, which the only caller now uses instead).

- [ ] **Step 1: Add the bucket map and filter/breakdown types**

In `src/modules/contacts/types/contacts.types.ts`, add after the existing type unions (after the `SubscriberStatus` line):

```ts
export type OutreachStatusBucket = "muted" | "info" | "success" | "danger";

export const OUTREACH_STATUS_BUCKET: Record<OutreachStatus, OutreachStatusBucket> = {
  new: "muted",
  not_interested: "muted",
  contacted: "info",
  replied: "success",
  interested: "success",
  bounced: "danger",
  do_not_contact: "danger",
};

export interface CategoryStatusBreakdown {
  total: number;
  muted: number;
  info: number;
  success: number;
  danger: number;
}
```

Then change the `ContactFilters` interface to:

```ts
export interface ContactFilters {
  categoryId?: string;
  search?: string;
  subscriberStatus?: SubscriberStatus;
  outreachStatus?: OutreachStatus;
  excludeOutreachStatuses?: OutreachStatus[];
}
```

- [ ] **Step 2: Implement the filter and breakdown query**

In `src/modules/contacts/services/contacts.service.ts`, change the import line to:

```ts
import { Contact, ContactFilters, PaginationOptions, OutreachStatus, SubscriberStatus, CategoryStatusBreakdown, OUTREACH_STATUS_BUCKET } from "../types/contacts.types";
```

In `getContacts`, add the exclude-statuses branch right after the existing `outreachStatus` filter line:

```ts
    if (filters?.outreachStatus) query = query.eq("outreach_status", filters.outreachStatus);
    if (filters?.excludeOutreachStatuses?.length) {
      query = query.not("outreach_status", "in", `(${filters.excludeOutreachStatuses.join(",")})`);
    }
```

Replace the entire `countByCategory` method with:

```ts
  static async getCategoryStatusBreakdown(supabase: SupabaseClient, businessId: string): Promise<Record<string, CategoryStatusBreakdown>> {
    const { data, error } = await supabase.from("contacts").select("category_id, outreach_status").eq("business_id", businessId);
    if (error) throw new Error(`Error computing category breakdown: ${error.message}`);
    const breakdown: Record<string, CategoryStatusBreakdown> = {};
    for (const row of data || []) {
      const key = row.category_id || "uncategorized";
      if (!breakdown[key]) breakdown[key] = { total: 0, muted: 0, info: 0, success: 0, danger: 0 };
      breakdown[key].total += 1;
      breakdown[key][OUTREACH_STATUS_BUCKET[row.outreach_status as OutreachStatus]] += 1;
    }
    return breakdown;
  }
```

- [ ] **Step 3: Thread the filter through the contacts API route**

In `src/app/api/contacts/route.ts`, in the `GET` handler's filters object, add a line after `outreachStatus`:

```ts
        outreachStatus: (searchParams.get("outreachStatus") as any) || undefined,
        excludeOutreachStatuses: searchParams.get("excludeOutreachStatuses")?.split(",").filter(Boolean) as any,
```

- [ ] **Step 4: Switch the categories route to the breakdown**

In `src/app/api/contacts/categories/route.ts`, replace the `GET` handler body's data-fetching and response block with:

```ts
    const [categories, breakdown] = await Promise.all([
      ContactCategoriesService.getCategories(supabase, businessId),
      ContactsService.getCategoryStatusBreakdown(supabase, businessId),
    ]);

    return NextResponse.json({
      categories: categories.map((c) => ({
        ...c,
        contactCount: breakdown[c.id]?.total || 0,
        statusBreakdown: breakdown[c.id] || { total: 0, muted: 0, info: 0, success: 0, danger: 0 },
      })),
    });
```

- [ ] **Step 5: Update the client hook types and query serialization**

In `src/modules/contacts/hooks/useContacts.ts`, change the import line to:

```ts
import { Contact, ContactFilters, ContactCategory, CategoryStatusBreakdown } from "../types/contacts.types";
```

In `useContacts`, add after the existing `outreachStatus` line inside the `queryFn`:

```ts
      if (filters?.outreachStatus) params.set("outreachStatus", filters.outreachStatus);
      if (filters?.excludeOutreachStatuses?.length) params.set("excludeOutreachStatuses", filters.excludeOutreachStatuses.join(","));
```

Change `ContactCategoryWithCount` to:

```ts
export interface ContactCategoryWithCount extends ContactCategory {
  contactCount: number;
  statusBreakdown: CategoryStatusBreakdown;
}
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: no new errors (CategoryManager only reads `.contactCount`, unaffected by the added `.statusBreakdown` field).

- [ ] **Step 7: Commit**

```bash
git add src/modules/contacts/types/contacts.types.ts src/modules/contacts/services/contacts.service.ts src/app/api/contacts/route.ts src/app/api/contacts/categories/route.ts src/modules/contacts/hooks/useContacts.ts
git commit -m "feat(contacts): add suppression-status filter and per-category status breakdown"
```

---

### Task 3: Outreach types and AI prompt — service type, region, CTA

**Files:**
- Modify: `src/modules/outreach/types/outreach.types.ts`
- Modify: `src/prompts/outreach/index.ts`

**Interfaces:**
- Consumes: nothing new from earlier tasks.
- Produces: `OutreachCampaign.category_id: string` (no longer nullable), `.service_type`/`.target_region`/`.cta_text`/`.cta_link: string | null`; `CreateOutreachCampaignInput` gains required `categoryId`, `serviceType`, `targetRegion` and optional `ctaText`/`ctaLink`; `StartScrapeInput.categoryId` becomes required. `getOutreachDraftPrompt`/`getOutreachRevisionPrompt`'s `input` param gains `serviceType: string; targetRegion: string; ctaText?: string; ctaLink?: string`. Consumed by Task 4 (API routes) and Task 5 (Campaigns UI) and Task 6 (Find Leads UI).

- [ ] **Step 1: Update the outreach types**

In `src/modules/outreach/types/outreach.types.ts`, replace the `OutreachCampaign` interface with:

```ts
export interface OutreachCampaign {
  id: string;
  business_id: string;
  category_id: string;
  name: string;
  goal: string | null;
  tone: string | null;
  message_brief: string | null;
  service_type: string | null;
  target_region: string | null;
  cta_text: string | null;
  cta_link: string | null;
  status: OutreachCampaignStatus;
  generated_subject: string | null;
  generated_body: OutreachGeneratedBody | null;
  revision_history: { content: OutreachGeneratedBody; feedback?: string; created_at: string }[];
  external_campaign_id: string | null;
  daily_limit: number;
  created_at: string;
  updated_at: string;
}
```

Replace `CreateOutreachCampaignInput` with:

```ts
export interface CreateOutreachCampaignInput {
  name: string;
  categoryId: string;
  serviceType: string;
  targetRegion: string;
  goal: string;
  tone: string;
  messageBrief: string;
  ctaText?: string;
  ctaLink?: string;
}
```

Change `StartScrapeInput.categoryId?: string` to `categoryId: string`:

```ts
export interface StartScrapeInput {
  niches: string;
  location: string;
  maxResults: number;
  categoryId: string;
}
```

- [ ] **Step 2: Extend the prompt functions**

In `src/prompts/outreach/index.ts`, replace `getOutreachDraftPrompt` with:

```ts
export function getOutreachDraftPrompt(
  business: OutreachBusinessContext,
  input: { goal: string; tone: string; messageBrief: string; serviceType: string; targetRegion: string; ctaText?: string; ctaLink?: string }
): { system: string; user: string } {
  const ctaLine = input.ctaText
    ? `\n\nEnd the email with a clear call to action using this exact button text as a short closing line: "${input.ctaText}"${input.ctaLink ? ` (linking to ${input.ctaLink})` : ""}.`
    : "";
  return {
    system: `You are an expert cold-email copywriter for ${business.name}, a ${business.industry || "business"}.

What we offer: ${business.core_offerings || "Not specified"}
Target audience: ${business.target_audience || "Not specified"}
Service focus for this campaign: ${input.serviceType}
Target region: ${input.targetRegion}
Requested tone: ${input.tone}

Write a single cold outreach email. It must feel personally written, not templated or salesy. Never use spam-trigger words (free, guaranteed, act now, limited time, buy now). Never make claims not supported by the business context above.${ctaLine}

${STRUCTURE_RULES}`,
    user: `Goal: ${input.goal}\n\nWhat to say: ${input.messageBrief}`,
  };
}
```

`getOutreachRevisionPrompt`'s signature widens automatically since it takes the same `input` shape and forwards it to `getOutreachDraftPrompt` — update only its type annotation to match:

```ts
export function getOutreachRevisionPrompt(business: OutreachBusinessContext, input: { goal: string; tone: string; messageBrief: string; serviceType: string; targetRegion: string; ctaText?: string; ctaLink?: string }, previousContent: unknown, feedback: string): { system: string; user: string } {
```

(function body below the signature is unchanged).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: new errors will appear at every call site that constructs `CreateOutreachCampaignInput`, calls `getOutreachDraftPrompt`/`getOutreachRevisionPrompt`, or passes a `StartScrapeInput` — that's expected; Task 4 and Task 6 fix them. Confirm the errors are limited to `src/app/api/outreach/campaigns/route.ts`, `src/app/api/outreach/campaigns/[id]/route.ts`, `src/modules/outreach/pages/CampaignsPage.tsx`, and `src/modules/outreach/pages/FindLeadsPage.tsx` — if errors appear anywhere else, stop and investigate before continuing.

- [ ] **Step 4: Commit**

```bash
git add src/modules/outreach/types/outreach.types.ts src/prompts/outreach/index.ts
git commit -m "feat(outreach): add service type, target region, and CTA fields to campaign types and prompt"
```

---

### Task 4: Outreach campaign API routes — required category, new fields, manual edit

**Files:**
- Modify: `src/app/api/outreach/campaigns/route.ts`
- Modify: `src/app/api/outreach/campaigns/[id]/route.ts`

**Interfaces:**
- Consumes: `CreateOutreachCampaignInput`, `getOutreachDraftPrompt`/`getOutreachRevisionPrompt` (Task 3).
- Produces: `PATCH /api/outreach/campaigns/:id` now accepts `{ manualEdit: { subject: string; body: string } }` — consumed by Task 5's edit flow.

- [ ] **Step 1: Update campaign creation validation and payload**

In `src/app/api/outreach/campaigns/route.ts`, replace the `POST` handler's validation and campaign-creation block with:

```ts
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name?.trim() || !body.categoryId || !body.serviceType || !body.targetRegion || !body.goal?.trim() || !body.messageBrief?.trim()) {
      return NextResponse.json({ error: "Name, list, service type, target region, goal, and message brief are all required" }, { status: 400 });
    }

    const supabase = (await createClient()) as SupabaseClient<Database>;
    const businessId = await MetaAdsService.getFirstBusinessId(supabase);
    if (!businessId) return NextResponse.json({ error: "No business configured" }, { status: 400 });

    const business = await MetaAdsService.getBusinessById(supabase, businessId);
    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const input = {
      goal: body.goal.trim(),
      tone: body.tone || "Friendly and professional",
      messageBrief: body.messageBrief.trim(),
      serviceType: body.serviceType,
      targetRegion: body.targetRegion,
      ctaText: body.ctaText?.trim() || undefined,
      ctaLink: body.ctaLink?.trim() || undefined,
    };

    const campaign = await OutreachCampaignsService.createCampaign(supabase, {
      business_id: businessId,
      category_id: body.categoryId,
      name: body.name.trim(),
      goal: input.goal,
      tone: input.tone,
      message_brief: input.messageBrief,
      service_type: input.serviceType,
      target_region: input.targetRegion,
      cta_text: input.ctaText || null,
      cta_link: input.ctaLink || null,
      status: "draft",
      daily_limit: Number(body.dailyLimit) || 50,
    });

    const prompt = getOutreachDraftPrompt(business, input);
    const responseText = (await aiOrchestrator.executeTask("text", prompt.user, "openai", { systemPrompt: prompt.system })) as string;
    const generatedBody = JSON.parse(responseText.replace(/```json\n?|\n?```/g, "").trim());

    await OutreachCampaignsService.updateCampaign(supabase, campaign.id, {
      generated_subject: generatedBody.subject,
      generated_body: generatedBody,
    });

    return NextResponse.json({ success: true, campaign: { ...campaign, generated_subject: generatedBody.subject, generated_body: generatedBody } });
  } catch (error: any) {
    console.error("[OUTREACH_CAMPAIGNS_CREATE]", error);
    return NextResponse.json({ error: error.message || "Failed to generate campaign" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Add manual-edit support and update the revision prompt call**

In `src/app/api/outreach/campaigns/[id]/route.ts`, in the `PATCH` handler, insert this branch immediately after the `campaign` null-check and before the existing `if (body.feedback?.trim())` block:

```ts
    if (body.manualEdit) {
      const generatedBody = { subject: body.manualEdit.subject, body: body.manualEdit.body };
      await OutreachCampaignsService.updateCampaign(supabase, id, {
        generated_subject: generatedBody.subject,
        generated_body: generatedBody,
      });
      return NextResponse.json({ success: true, generatedBody });
    }

```

Then update the `getOutreachRevisionPrompt` call inside the existing `if (body.feedback?.trim())` block to pass the new fields:

```ts
      const prompt = getOutreachRevisionPrompt(
        business,
        { goal: campaign.goal || "", tone: campaign.tone || "", messageBrief: campaign.message_brief || "", serviceType: campaign.service_type || "", targetRegion: campaign.target_region || "", ctaText: campaign.cta_text || undefined, ctaLink: campaign.cta_link || undefined },
        campaign.generated_body,
        body.feedback.trim()
      );
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: the two API-route errors from Task 3 are gone; remaining errors limited to `CampaignsPage.tsx` and `FindLeadsPage.tsx` (fixed in Tasks 5/6).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/outreach/campaigns/route.ts "src/app/api/outreach/campaigns/[id]/route.ts"
git commit -m "feat(outreach): require category on campaign creation, support manual content edits"
```

---

### Task 5: Campaigns page — legacy-parity fields and generate/preview/edit flow

**Files:**
- Modify: `src/modules/outreach/hooks/useOutreachCampaigns.ts`
- Modify: `src/modules/outreach/pages/CampaignsPage.tsx`

**Interfaces:**
- Consumes: `CreateOutreachCampaignInput`, `OutreachCampaign` (Task 3); `PATCH .../:id` with `manualEdit` (Task 4); `useContacts({ excludeOutreachStatuses })`, `useContactCategories()` (Task 2).
- Produces: `useEditOutreachCampaignContent()` hook — no other task consumes it besides this page.

- [ ] **Step 1: Add the manual-edit hook**

In `src/modules/outreach/hooks/useOutreachCampaigns.ts`, add after `useRegenerateOutreachCampaign`:

```ts
export function useEditOutreachCampaignContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, subject, body }: { campaignId: string; subject: string; body: string }) =>
      fetchJson(`/api/outreach/campaigns/${campaignId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ manualEdit: { subject, body } }) }),
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: outreachKeys.campaign(variables.campaignId) }),
  });
}
```

- [ ] **Step 2: Rewrite the Campaigns page**

Replace the full contents of `src/modules/outreach/pages/CampaignsPage.tsx` with:

```tsx
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
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors from `CampaignsPage.tsx` or `useOutreachCampaigns.ts`; remaining errors limited to `FindLeadsPage.tsx` (fixed in Task 6).

- [ ] **Step 4: Commit**

```bash
git add src/modules/outreach/hooks/useOutreachCampaigns.ts src/modules/outreach/pages/CampaignsPage.tsx
git commit -m "feat(outreach): rework campaign form with legacy fields and generate/preview/edit flow"
```

---

### Task 6: Background job plumbing — progress broadcast, toast, Find Leads wiring

**Files:**
- Create: `src/services/inngest/outreach/broadcast-progress.ts`
- Modify: `src/services/inngest/outreach/scrape-contacts.ts`
- Modify: `src/components/global/GlobalJobTracker.tsx`
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/modules/outreach/pages/FindLeadsPage.tsx`

**Interfaces:**
- Produces: `broadcastJobProgress(jobId: string, progress: number, status: "queued"|"processing"|"completed"|"failed", message?: string): Promise<void>` — used only within `scrape-contacts.ts` in this plan, but written as a standalone module so any future Inngest job can reuse it.
- Consumes: `useJobsStore` (`@/store`), `StartScrapeInput` with required `categoryId` (Task 3), `useContactCategories`/`useCreateContactCategory` (existing).

- [ ] **Step 1: Add the broadcast helper**

Create `src/services/inngest/outreach/broadcast-progress.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type BroadcastJobStatus = "queued" | "processing" | "completed" | "failed";

/** Fire-and-forget progress updates for the bottom-right jobs widget —
 * subscribes just long enough to guarantee the broadcast actually sends,
 * then tears the channel down. Same channel/event contract
 * GlobalJobTracker already listens for. */
export async function broadcastJobProgress(jobId: string, progress: number, status: BroadcastJobStatus, message?: string): Promise<void> {
  const channel = supabase.channel("kinetix-jobs");
  await new Promise<void>((resolve) => {
    channel.subscribe((subStatus) => {
      if (subStatus === "SUBSCRIBED") {
        channel.send({ type: "broadcast", event: "job-progress", payload: { jobId, progress, status, message } }).finally(resolve);
      }
    });
  });
  await supabase.removeChannel(channel);
}
```

- [ ] **Step 2: Wire progress calls into the scrape job**

Replace the full contents of `src/services/inngest/outreach/scrape-contacts.ts` with:

```ts
import { inngest } from "../client";
import { createClient } from "@supabase/supabase-js";
import { ApifyService } from "@/services/apify";
import { MillionVerifierService } from "@/services/millionverifier";
import { broadcastJobProgress } from "./broadcast-progress";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Ported from the legacy Outreach n8n workflow — a job-title + city/country
// business-contact finder. Confirm this actor id and its input fields
// against Apify's current listing before relying on it in production.
const LEADS_FINDER_ACTOR = "code_crafter~leads-finder";
const MAX_POLL_ATTEMPTS = 20; // 20 x 15s = 5 minutes, replacing the legacy loop's uncapped retry

export const scrapeOutreachContacts = inngest.createFunction(
  { id: "outreach-scrape-contacts", triggers: [{ event: "outreach/scrape-contacts" }] },
  async ({ event, step }) => {
    const { jobId } = event.data;

    const job = await step.run("fetch-job", async () => {
      const { data } = await supabase.from("outreach_scrape_jobs").select("*").eq("id", jobId).single();
      return data;
    });
    if (!job) throw new Error("Scrape job not found");

    await step.run("mark-running", async () => {
      await supabase.from("outreach_scrape_jobs").update({ status: "running" }).eq("id", jobId);
    });
    await broadcastJobProgress(jobId, 5, "processing");

    try {
      const { runId, datasetId: initialDatasetId } = await step.run("start-apify", async () => {
        const result = await ApifyService.runActor(LEADS_FINDER_ACTOR, {
          contact_job_title: job.niches,
          contact_location: job.location,
          fetch_count: job.max_results,
        });
        return { runId: result.runId, datasetId: result.datasetId };
      });
      await broadcastJobProgress(jobId, 15, "processing");

      const datasetId = initialDatasetId;
      let succeeded = false;
      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        await step.sleep("wait-for-scrape", "15s");
        const status = await step.run(`check-status-${attempt}`, () => ApifyService.getRunStatus(runId));
        await broadcastJobProgress(jobId, Math.min(20 + Math.round((attempt / MAX_POLL_ATTEMPTS) * 50), 70), "processing");
        if (status === "SUCCEEDED") {
          succeeded = true;
          break;
        }
        if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
          throw new Error(`Apify run ended with status ${status}`);
        }
      }
      if (!succeeded) throw new Error("Scrape timed out waiting for results");

      const items = await step.run("fetch-results", () => ApifyService.getDatasetItems(datasetId));
      await broadcastJobProgress(jobId, 75, "processing");

      const stats = await step.run("verify-and-save", async () => {
        let validEmails = 0;
        let invalidEmails = 0;

        for (const item of items) {
          const email = item.email || item.contact_email;
          if (!email) continue;

          let verification: "verified" | "invalid" | "catch_all" | "unknown" = "unknown";
          try {
            verification = await MillionVerifierService.verify(email);
          } catch {
            continue; // verification service unavailable — skip rather than save an unverified contact
          }

          if (verification !== "verified") {
            invalidEmails++;
            continue;
          }
          validEmails++;

          await supabase.from("contacts").upsert(
            {
              business_id: job.business_id,
              category_id: job.category_id,
              email,
              first_name: item.first_name || null,
              last_name: item.last_name || null,
              phone: item.phone || item.mobile_number || null,
              linkedin_url: item.linkedin || null,
              company: item.company_name || item.company || null,
              city: item.city || null,
              country: item.country || null,
              source: "scraped",
              email_verification_status: "verified",
            },
            { onConflict: "business_id,email" }
          );
        }

        return { total: items.length, validEmails, invalidEmails };
      });
      await broadcastJobProgress(jobId, 95, "processing");

      await step.run("mark-succeeded", async () => {
        await supabase.from("outreach_scrape_jobs").update({
          status: "succeeded",
          apify_run_id: runId,
          total_scraped: stats.total,
          valid_emails: stats.validEmails,
          invalid_emails: stats.invalidEmails,
        }).eq("id", jobId);
      });
      await broadcastJobProgress(jobId, 100, "completed", `Found ${stats.total}, ${stats.validEmails} verified`);

      return stats;
    } catch (error: any) {
      await step.run("mark-failed", async () => {
        await supabase.from("outreach_scrape_jobs").update({ status: "failed", error_message: error.message }).eq("id", jobId);
      });
      await broadcastJobProgress(jobId, 100, "failed", error.message);
      throw error;
    }
  }
);
```

- [ ] **Step 3: Fire a toast from the global job tracker**

Replace the full contents of `src/components/global/GlobalJobTracker.tsx` with:

```tsx
"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useJobsStore } from "@/store";
import { createClient } from "@/lib/supabase/client";

export function GlobalJobTracker() {
  const { updateJob } = useJobsStore();
  const supabase = createClient();

  useEffect(() => {
    // -------------------------------------------------------------
    // SUPABASE REALTIME BROADCAST LISTENER
    // This listens for direct WebSocket messages from the Inngest backend
    // bypassing the database entirely for blazing fast UI updates.
    // -------------------------------------------------------------
    const channel = supabase.channel("kinetix-jobs");

    channel
      .on("broadcast", { event: "job-progress" }, (payload) => {
        // Expected payload: { jobId, progress?, status?, message? }
        const data = payload.payload as { jobId: string; progress?: number; status?: "processing" | "completed" | "failed" | "queued"; message?: string };

        if (!data.jobId) return;

        updateJob(data.jobId, {
          ...(data.progress !== undefined && { progress: data.progress }),
          ...(data.status && { status: data.status }),
        });

        if (data.status === "completed" || data.status === "failed") {
          const job = useJobsStore.getState().jobs.find((j) => j.id === data.jobId);
          const label = job?.title || "Task";
          if (data.status === "completed") toast.success(data.message || `${label} — done`);
          else toast.error(data.message || `${label} — failed`);
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Subscribed to kinetix-jobs realtime broadcasts");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [updateJob, supabase]);

  // Headless component, renders nothing
  return null;
}
```

- [ ] **Step 4: Mount the toaster**

In `src/app/(app)/layout.tsx`, add the import:

```ts
import { Toaster } from "sonner";
```

And add `<Toaster richColors position="bottom-left" />` right after `<GlobalJobTracker />` (before the closing `</div>` of the root container).

- [ ] **Step 5: Wire the Find Leads form to the job store and require a category**

Replace the full contents of `src/modules/outreach/pages/FindLeadsPage.tsx` with:

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useScrapeJobs, useStartScrape } from "../hooks/useScrapeJobs";
import { useContactCategories, useCreateContactCategory } from "@/modules/contacts/hooks/useContacts";
import { useJobsStore } from "@/store";
import { ROUTES } from "@/config/routes";

const STATUS_STYLE: Record<string, string> = {
  queued: "text-muted bg-surface",
  running: "text-info bg-info-bg",
  succeeded: "text-success bg-success-bg",
  failed: "text-danger bg-danger-bg",
  cancelled: "text-muted bg-surface",
};

export function FindLeadsPage() {
  const router = useRouter();
  const [niches, setNiches] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState("100");
  const [categoryId, setCategoryId] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [error, setError] = useState("");

  const { data: categories = [] } = useContactCategories();
  const { data: jobs = [], isLoading } = useScrapeJobs();
  const createCategory = useCreateContactCategory();
  const startScrape = useStartScrape();
  const addJob = useJobsStore((s) => s.addJob);

  const submitNewCategory = async () => {
    if (!newCategoryName.trim()) return;
    const result: any = await createCategory.mutateAsync(newCategoryName.trim());
    setCategoryId(result.category.id);
    setNewCategoryName("");
    setCreatingCategory(false);
  };

  const handleStart = async () => {
    setError("");
    if (!niches.trim() || !location.trim()) return setError("Enter what you're looking for and where.");
    if (!categoryId) return setError("Choose a list to save these leads into.");
    try {
      const result: any = await startScrape.mutateAsync({ niches: niches.trim(), location: location.trim(), maxResults: Number(maxResults), categoryId });
      addJob({ id: result.job.id, title: `Finding leads: ${niches.trim()} in ${location.trim()}`, type: "outreach-scrape", targetUrl: ROUTES.OUTREACH.CONTACTS });
      router.push(ROUTES.OUTREACH.CONTACTS);
    } catch (e: any) {
      setError(e.message || "Failed to start the search");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-text">Find Leads</h2>
        <p className="text-sm text-muted mt-1">Search for potential contacts by industry and location — results land straight in your leads list once verified.</p>
      </div>

      <div className="bg-background border border-default rounded-xl p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted uppercase tracking-wide">What kind of business are you looking for?</label>
            <Input value={niches} onChange={(e) => setNiches(e.target.value)} placeholder="e.g. Dentist, Clinic Owner" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted uppercase tracking-wide">Where should we look?</label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Toronto, Canada" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted uppercase tracking-wide">How many leads?</label>
            <Select value={maxResults} onValueChange={setMaxResults}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["50", "100", "200", "300", "500"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted uppercase tracking-wide">Save to</label>
            {creatingCategory ? (
              <div className="flex gap-2">
                <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="e.g. Dental Clinics" autoFocus />
                <Button size="sm" onClick={submitNewCategory} loading={createCategory.isPending} icon={<Check className="w-3.5 h-3.5" />} />
                <Button size="sm" variant="outline" onClick={() => setCreatingCategory(false)} icon={<X className="w-3.5 h-3.5" />} />
              </div>
            ) : categories.length === 0 ? (
              <Button size="sm" variant="outline" onClick={() => setCreatingCategory(true)}>+ Create a new list</Button>
            ) : (
              <Select value={categoryId} onValueChange={(v) => (v === "__new" ? setCreatingCategory(true) : setCategoryId(v))}>
                <SelectTrigger><SelectValue placeholder="Choose a list" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  <SelectItem value="__new">+ Create a new list</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        {error && <p className="text-sm text-danger font-medium">{error}</p>}
        <Button onClick={handleStart} loading={startScrape.isPending} disabled={!categoryId && !creatingCategory} icon={<Search className="w-4 h-4" />}>
          {startScrape.isPending ? "Starting…" : "Find Leads"}
        </Button>
      </div>

      <div>
        <h3 className="text-sm font-bold text-text uppercase tracking-wide mb-3">Past Searches</h3>
        {isLoading ? (
          <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-surface animate-pulse" />)}</div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center text-muted border border-default rounded-2xl border-dashed text-sm">No searches yet.</div>
        ) : (
          <div className="border border-default rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Search</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Found</TableHead>
                  <TableHead className="text-right">Verified</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-semibold text-text">{j.niches} <span className="text-muted font-normal">in {j.location}</span></TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide inline-flex items-center gap-1 ${STATUS_STYLE[j.status]}`}>
                        {j.status === "running" && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                        {j.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{j.total_scraped}</TableCell>
                    <TableCell className="text-right tabular-nums">{j.valid_emails}</TableCell>
                    <TableCell className="text-muted whitespace-nowrap">{new Date(j.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: no new errors anywhere; this was the last file with a `StartScrapeInput`/`categoryId` mismatch from Task 3.

- [ ] **Step 7: Commit**

```bash
git add src/services/inngest/outreach/broadcast-progress.ts src/services/inngest/outreach/scrape-contacts.ts src/components/global/GlobalJobTracker.tsx "src/app/(app)/layout.tsx" src/modules/outreach/pages/FindLeadsPage.tsx
git commit -m "feat(outreach): broadcast scrape progress to the jobs widget, toast on completion, require a list before searching"
```

---

### Task 7: Leads page — category list, composition bar, drawer, nav update

**Files:**
- Modify: `src/modules/contacts/components/ContactsTable.tsx`
- Create: `src/modules/contacts/components/CategoryCompositionBar.tsx`
- Create: `src/modules/outreach/components/ScrapeProgressBanner.tsx`
- Create: `src/modules/outreach/components/LeadsDrawer.tsx`
- Create: `src/modules/outreach/pages/LeadsPage.tsx`
- Modify: `src/app/(app)/outreach/contacts/page.tsx`
- Delete: `src/modules/outreach/pages/ContactsPage.tsx`
- Modify: `src/config/navigation.ts`

**Interfaces:**
- Consumes: `ContactCategoryWithCount` with `.statusBreakdown` (Task 2), `useJobsStore` job `type: "outreach-scrape"` (Task 6), `CategoryManager` (existing, unmodified), `Drawer`/`DrawerContent`/`DrawerHeader`/`DrawerTitle`/`DrawerDescription`/`DrawerFooter` (existing `src/components/ui/drawer.tsx`, unmodified).
- Produces: `ContactsTable` gains a `showCategory?: boolean` prop (default `true`, so Newsletter's `SubscribersPage.tsx` — out of scope, not touched — keeps its current Category column) and now renders Company/Phone/Location columns plus plain-language status labels instead of raw enum text.

- [ ] **Step 1: Expand ContactsTable with real columns and plain-language status labels**

`ContactsTable` is also used by `src/modules/newsletter/pages/SubscribersPage.tsx` (statusMode `"subscriber"`) — Newsletter is out of scope for this plan, so this change must stay backward compatible: default `showCategory` to `true` so that page's behavior is unchanged.

Replace the full contents of `src/modules/contacts/components/ContactsTable.tsx` with:

```tsx
"use client";
import { Trash2 } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Contact } from "../types/contacts.types";
import { useDeleteContact } from "../hooks/useContacts";

const SUBSCRIBER_STYLE: Record<string, string> = {
  active: "text-success bg-success-bg",
  unsubscribed: "text-muted bg-surface",
  bounced: "text-danger bg-danger-bg",
  complained: "text-danger bg-danger-bg",
};
const SUBSCRIBER_LABEL: Record<string, string> = {
  active: "Subscribed",
  unsubscribed: "Unsubscribed",
  bounced: "Bounced",
  complained: "Complained",
};

const OUTREACH_STYLE: Record<string, string> = {
  new: "text-muted bg-surface",
  contacted: "text-info bg-info-bg",
  replied: "text-success bg-success-bg",
  interested: "text-success bg-success-bg",
  not_interested: "text-muted bg-surface",
  bounced: "text-danger bg-danger-bg",
  do_not_contact: "text-danger bg-danger-bg",
};
const OUTREACH_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  replied: "Replied",
  interested: "Interested",
  not_interested: "Not a fit",
  bounced: "Bounced",
  do_not_contact: "Opted out",
};

function StatusPill({ value, styles, labels }: { value: string; styles: Record<string, string>; labels: Record<string, string> }) {
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${styles[value] || "text-muted bg-surface"}`}>{labels[value] || value}</span>;
}

export function ContactsTable({
  contacts,
  statusMode,
  categoryName,
  showCategory = true,
}: {
  contacts: Contact[];
  statusMode: "subscriber" | "outreach";
  categoryName?: (id: string | null) => string;
  showCategory?: boolean;
}) {
  const deleteContact = useDeleteContact();

  if (contacts.length === 0) {
    return <div className="py-16 text-center text-muted border border-default rounded-2xl border-dashed text-sm">No contacts yet.</div>;
  }

  return (
    <div className="border border-default rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Location</TableHead>
            {showCategory && <TableHead>Category</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-semibold text-text">{[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}</TableCell>
              <TableCell className="text-muted">{c.company || "—"}</TableCell>
              <TableCell className="text-muted">{c.email}</TableCell>
              <TableCell className="text-muted">{c.phone || "—"}</TableCell>
              <TableCell className="text-muted">{[c.city, c.country].filter(Boolean).join(", ") || "—"}</TableCell>
              {showCategory && <TableCell className="text-muted">{categoryName?.(c.category_id) ?? "—"}</TableCell>}
              <TableCell>
                {statusMode === "subscriber" ? (
                  <StatusPill value={c.subscriber_status} styles={SUBSCRIBER_STYLE} labels={SUBSCRIBER_LABEL} />
                ) : (
                  <StatusPill value={c.outreach_status} styles={OUTREACH_STYLE} labels={OUTREACH_LABEL} />
                )}
              </TableCell>
              <TableCell>
                <button onClick={() => deleteContact.mutate(c.id)} className="text-muted hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 2: Build the composition bar**

Create `src/modules/contacts/components/CategoryCompositionBar.tsx`:

```tsx
import { CategoryStatusBreakdown } from "../types/contacts.types";

const BUCKET_COLOR: Record<"muted" | "info" | "success" | "danger", string> = {
  muted: "var(--color-text-secondary)",
  info: "var(--color-info)",
  success: "var(--color-success)",
  danger: "var(--color-danger)",
};

/** One glance at whether a list is untouched, warming up, or stalling out —
 * without a separate chart. Same four status colors as the lead status
 * badges (see ContactsTable), so the visual language stays closed. */
export function CategoryCompositionBar({ breakdown }: { breakdown: CategoryStatusBreakdown }) {
  if (breakdown.total === 0) {
    return <div className="h-1 w-full rounded-full bg-surface" />;
  }
  const segments: { key: "muted" | "info" | "success" | "danger"; value: number }[] = [
    { key: "muted", value: breakdown.muted },
    { key: "info", value: breakdown.info },
    { key: "success", value: breakdown.success },
    { key: "danger", value: breakdown.danger },
  ];
  return (
    <div className="flex h-1 w-full overflow-hidden rounded-full bg-surface">
      {segments.filter((s) => s.value > 0).map((s) => (
        <div key={s.key} style={{ width: `${(s.value / breakdown.total) * 100}%`, backgroundColor: BUCKET_COLOR[s.key] }} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Build the progress banner**

Create `src/modules/outreach/components/ScrapeProgressBanner.tsx`:

```tsx
"use client";
import { Loader2 } from "lucide-react";
import { useJobsStore } from "@/store";

export function ScrapeProgressBanner() {
  const jobs = useJobsStore((s) => s.jobs);
  const active = jobs.filter((j) => j.type === "outreach-scrape" && (j.status === "queued" || j.status === "processing"));
  if (active.length === 0) return null;

  return (
    <div className="space-y-2">
      {active.map((job) => (
        <div key={job.id} className="bg-primary-subtle border border-primary/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text truncate">{job.title}</p>
            <p className="text-xs text-muted">Runs in the background — you can keep working.</p>
          </div>
          <div className="w-28 h-1.5 rounded-full bg-surface overflow-hidden shrink-0">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${job.progress}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Build the leads drawer**

Create `src/modules/outreach/components/LeadsDrawer.tsx`:

```tsx
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
```

- [ ] **Step 5: Build the Leads page**

Create `src/modules/outreach/pages/LeadsPage.tsx`:

```tsx
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
```

- [ ] **Step 6: Repoint the route and delete the old page**

Replace `src/app/(app)/outreach/contacts/page.tsx` with:

```tsx
import { LeadsPage } from "@/modules/outreach/pages/LeadsPage";

export default function Page() {
  return <LeadsPage />;
}
```

Delete `src/modules/outreach/pages/ContactsPage.tsx`:

Run: `rm "src/modules/outreach/pages/ContactsPage.tsx"`

- [ ] **Step 7: Update the sidebar nav**

In `src/config/navigation.ts`, in `SECONDARY_NAV_ITEMS.outreach`, remove the `or-find-leads` entry entirely and change the `or-contacts` entry's `label` from `"Contacts"` to `"Leads"`:

```ts
  outreach: [
    {
      id: "or-dashboard",
      label: "Dashboard",
      href: ROUTES.OUTREACH.DASHBOARD,
      icon: LayoutDashboard,
    },
    {
      id: "or-contacts",
      label: "Leads",
      href: ROUTES.OUTREACH.CONTACTS,
      icon: Users,
    },
    {
      id: "or-campaigns",
      label: "Campaigns",
      href: ROUTES.OUTREACH.CAMPAIGNS,
      icon: Megaphone,
    },
  ],
```

Check whether `Search` (the icon used only by the removed `or-find-leads` entry) is still imported/used elsewhere in the file after this edit — if the `Search` import becomes unused, remove it from the top `lucide-react` import list to keep ESLint clean.

- [ ] **Step 8: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint src/modules/outreach src/modules/contacts src/config/navigation.ts src/components/global/GlobalJobTracker.tsx --max-warnings=9999`
Expected: no new errors (pre-existing `@typescript-eslint/no-explicit-any` warnings are fine, per established convention). Confirm `src/modules/newsletter/pages/SubscribersPage.tsx` still compiles clean — it calls `ContactsTable` without `showCategory`, which must still default to showing the Category column.

- [ ] **Step 9: Commit**

```bash
git add src/modules/contacts/components/ContactsTable.tsx src/modules/contacts/components/CategoryCompositionBar.tsx src/modules/outreach/components/ScrapeProgressBanner.tsx src/modules/outreach/components/LeadsDrawer.tsx src/modules/outreach/pages/LeadsPage.tsx "src/app/(app)/outreach/contacts/page.tsx" src/config/navigation.ts
git rm src/modules/outreach/pages/ContactsPage.tsx
git commit -m "feat(outreach): replace Contacts tab with a category-first Leads page and drawer"
```

---

### Task 8: Final verification pass

**Files:** none (verification only).

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit`
Expected: only the single pre-existing, unrelated `CreateAdModal.tsx` error remains — zero errors anywhere touched by this plan.

- [ ] **Step 2: Full lint**

Run: `npx eslint . --max-warnings=9999`
Expected: no new errors introduced by this plan's files (existing `no-explicit-any` warnings elsewhere are expected and untouched).

- [ ] **Step 3: Confirm no stray references to removed code**

Run: `grep -rn "ContactsPage\|countByCategory\|outreachStatus: \"new\"" src/ --include="*.ts" --include="*.tsx"`
Expected: no matches (confirms the deleted page, the removed service method, and the old hardcoded audience filter are fully gone).

- [ ] **Step 4: Manual testing checklist (for the user, not run by the agent)**

Report the following as the manual test plan — do not start the dev server yourself:

1. Leads page with zero categories shows the "Create your first list" empty state; creating one switches to the category table.
2. Find Leads: submit button stays disabled with no list chosen; choosing "+ Create a new list" lets you name one inline and continue.
3. Starting a search redirects immediately to the Leads page; a progress banner appears at the top and the bottom-right widget shows the same job; a toast fires on completion with a found/verified count.
4. Clicking a category row opens a right-side drawer listing its leads with plain-language status badges; "Add Lead" saves a manual contact into that category.
5. New Campaign: Generate Draft is disabled/blocked without a name, list, service type, target region, goal, and message; after generating, the preview shows Regenerate, Edit, Create Campaign, and Cancel; Edit lets you hand-edit the subject/body and Save; Cancel deletes the draft.
6. The audience count shown while composing reflects leads in the chosen list minus bounced/opted-out/replied — not a "new only" count.

- [ ] **Step 5: Commit (only if any fixes were needed in Steps 1–3)**

```bash
git add -A
git commit -m "chore: fix lint/typecheck findings from outreach leads overhaul verification pass"
```
