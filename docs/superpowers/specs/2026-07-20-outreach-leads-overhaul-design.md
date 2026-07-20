# Outreach Leads Overhaul — Design Spec

Status: approved by user, proceeding to implementation.

## 1. Problem

Newsletter and Outreach were built end-to-end in the previous pass, but Outreach's
lead-management side was a thin port of the legacy app's mental model: a flat
Contacts list, a "Find Leads" tab that reads as "scrape," a campaign form missing
several fields the legacy actually used, and no real answer to "how do we let the
same lead be reused across campaigns" (legacy solved it with a manual "Reset Lead
Status" button because Instantly marked leads sent globally).

This pass reworks Outreach's Leads/Campaigns UX and the underlying lead-lifecycle
model, without touching Newsletter.

## 2. Lead lifecycle policy

A contact's global `outreach_status` (`new` / `contacted` / `replied` /
`interested` / `not_interested` / `bounced` / `do_not_contact`) only changes for
real outcomes — a reply, a bounce, an explicit opt-out. It is never used as a
"used up" flag.

A campaign's audience is computed live at send time as: every contact in the
campaign's category, **except** `bounced` and `do_not_contact` (the suppression
list). `replied` contacts are excluded by default too — don't re-pitch someone
mid-conversation — but this is a query filter, not a lock. Being sent an email
under Campaign A never blocks a contact from Campaign B. There is no reset
action anywhere, because nothing needs resetting — this mirrors how sequence
membership works in Apollo/Outreach.io/Smartlead (a person's global suppression
status is separate from their per-sequence enrollment).

Per-campaign send status continues to live in `outreach_campaign_contacts`
(queued/sent/failed), unchanged — it already models this correctly today.

## 3. Data model changes

`outreach_campaigns` gains four columns and one constraint tightening:

```sql
ALTER TABLE outreach_campaigns
  ADD COLUMN service_type TEXT,
  ADD COLUMN target_region TEXT,
  ADD COLUMN cta_text TEXT,
  ADD COLUMN cta_link TEXT;

ALTER TABLE outreach_campaigns
  ALTER COLUMN category_id SET NOT NULL;
```

`service_type` and `target_region` are free TEXT (not DB enums) but the UI
constrains them to fixed dropdowns ported from the legacy form:

- Service Type: Hair Transplant, Dental Treatment, Cosmetic Surgery, Eye
  Treatment, IVF Fertility, Thermal Wellness, All Services
- Target Region: Europe, Middle East, Asia, North America, Global

No other tables change shape. `contacts`, `contact_categories`,
`outreach_campaign_contacts`, `outreach_scrape_jobs` are structurally correct
already — only their UI labels change.

## 4. Leads page (replaces the Contacts tab)

Route: `/outreach/contacts` (URL unchanged, nav label becomes "Leads" — no
value in a breaking route rename for an internal tool).

Main view: one row per **category** — name, total leads, and a composition
bar (see §7 signature element) instead of raw counts. No technical columns
(no source, no verification status, no IDs). Row click opens the leads
drawer for that category.

Empty state (no categories yet): a single centered message — "Create your
first list to start finding leads" — with one button that opens category
creation, no secondary clutter.

Top-right: "Find Leads" button, always visible (not gated on having a
category yet — creating a category is part of the Find Leads form itself).

Category management (rename/delete) stays available from this page via the
existing `CategoryManager`, surfaced as a small "Manage lists" affordance
near the table header rather than its own section — it's an occasional
action, not a primary one.

### Leads drawer

Opens from the right (`Drawer` with `swipeDirection="right"`, the existing
24rem desktop width). Header: category name + lead count. Body: a table of
every lead in that category — Name, Company, Email, Phone, Location, Status
badge. Status badges use plain language, never the raw enum:

| `outreach_status` | Badge label | Token |
|---|---|---|
| `new` | New | `text-muted bg-surface` |
| `contacted` | Contacted | `text-info bg-info-bg` |
| `replied` | Replied | `text-success bg-success-bg` |
| `interested` | Interested | `text-success bg-success-bg` |
| `not_interested` | Not a fit | `text-muted bg-surface` |
| `bounced` | Bounced | `text-danger bg-danger-bg` |
| `do_not_contact` | Opted out | `text-danger bg-danger-bg` |

Footer: "+ Add Lead" opens an inline form (name, email, phone, company,
city/country, LinkedIn — email required, rest optional) that posts straight
into this category. No separate "manual add" page.

## 5. Find Leads flow

Route: `/outreach/find-leads`, reached only via the button on the Leads page
— removed from the secondary sidebar (3 tabs total: Dashboard, Leads,
Campaigns).

Form copy, all client-facing, zero mention of scraping/Apify/verification:

- "What kind of business are you looking for?" (free text — niches)
- "Where should we look?" (free text — location)
- "How many leads?" (50/100/200/300/500 — unchanged)
- "Save to" — a category picker with **no "Uncategorized" option**. If no
  category is selected and none exist, the picker's only action is "+ Create
  a new list" inline; the Find Leads button stays disabled until a category
  is chosen.

On submit: the job is registered in `useJobsStore` (title = the query, e.g.
"Finding leads: Dentist in Toronto"), and the user is immediately routed back
to `/outreach/contacts`. No blocking full-page loader ever appears.

### Progress banner (Leads page)

While an active `outreach-scrape` job exists in the store, the Leads page
renders a banner above the category table: title ("Finding leads for
'<query>' in <location>…"), a horizontal progress bar, and a "Runs in the
background — you can keep working" subtext. It disappears the moment the job
leaves the active set (completed/failed/dismissed).

### Progress plumbing

`scrapeOutreachContacts` (Inngest) broadcasts on the existing
`kinetix-jobs` Supabase Realtime channel (`job-progress` event, same
contract `GlobalJobTracker` already listens for) at each real step:

| Step | Progress |
|---|---|
| Job picked up | 5% |
| Search started | 15% |
| Waiting for results (ramps across the poll loop) | 20% → 70% |
| Results fetched | 75% |
| Verifying + saving (ramps as leads are processed) | 75% → 95% |
| Done | 100%, status `completed` |
| Any failure | status `failed`, last progress value kept |

On completion, a `sonner` toast fires: "Found {total}, {valid} verified" (or
an error toast on failure). `sonner`'s `<Toaster />` is not yet mounted
anywhere in the app — added once, in `src/app/(app)/layout.tsx`, next to the
existing `BackgroundJobsWidget`/`GlobalJobTracker`.

## 6. Campaign creation flow

Fields, in order: Campaign name, Category (**required**, no "everyone"
default), Service Type, Target Region, Goal, Tone, Message brief, CTA button
text, CTA link (optional). The generate button reads "Generate Draft."

Preview screen after generation offers all four actions, none hidden behind
the others:

- Edit the subject/body directly (inline, switches the read-only preview
  into editable fields)
- Give feedback for the AI to rewrite (existing regenerate-with-feedback,
  kept alongside manual edit rather than replaced by it)
- **Create Campaign** — commits the draft (manual edits included) and moves
  the campaign to `active`
- **Cancel** — discards the draft entirely

The audience count shown under the form (already present) switches from
"contacts with status = new" to "contacts in this category, minus bounced /
do-not-contact / replied" — consistent with §2.

## 7. Visual & interaction craft

No new color or type tokens — this stays inside Kinetix's existing system
(`--color-primary` #7132f5, the existing success/danger/warning/info scale,
existing `Table`/`Drawer`/`Select`/`Textarea`/`Button` primitives). The
craft budget goes into a few deliberate details rather than a new look:

- **Signature element — the category composition bar.** Each category row
  gets a thin (4px) segmented bar instead of bare counts: a muted segment
  for `new`, info-blue for `contacted`, success-green for
  `replied`/`interested`, danger-red for `bounced`/`do_not_contact`, widths
  proportional to share of the category. It's the one place a number becomes
  a shape — at a glance you see whether a list is untouched, warming up, or
  stalling out, without a separate chart. Same four tokens as the status
  badges, so the visual language stays closed and legible.
- **Motion, used sparingly.** The progress banner slides down/fades in on
  appearance and out on completion (200ms, matches existing transition
  durations in the codebase) rather than popping. The drawer uses its
  existing slide-from-right transition, unmodified. No motion is added
  anywhere else — an internal ops tool doesn't need ambient animation, and
  the existing widget's spinner/checkmark already covers job-in-flight
  feedback.
- **Copy consistency.** "Find Leads" is the verb everywhere it appears — the
  button, the banner heading, the toast — never "search" in one place and
  "find" in another. Errors state what happened and what to do ("Couldn't
  verify enough leads — try a broader search" rather than a raw error
  string). Status badges use the plain-language table in §4, applied
  identically in the drawer and anywhere else a lead's status shows.
- **Empty and loading states get the same care as populated ones** — the
  Leads page empty state (§4) and the "no searches yet" state on Find Leads
  (already implemented, kept as-is) both name the next action rather than
  just stating absence.

## 8. Navigation changes

`SECONDARY_NAV_ITEMS.outreach`: remove the `or-find-leads` entry; rename
`or-contacts` label from "Contacts" to "Leads" (route/id unchanged). Dashboard
and Campaigns entries unchanged.

## 9. Out of scope for this pass

- Newsletter is untouched.
- Instantly reply/bounce webhook payload shape stays flagged
  unverified-against-real-docs, as it already was — not re-litigated here.
- No multi-category-per-lead (tags) model — one category per lead, matching
  the existing schema and the user's explicit "one table" direction from the
  prior build.
