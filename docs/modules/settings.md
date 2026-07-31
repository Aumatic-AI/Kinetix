# Settings Module

**Status: built and active.**

## 1. What It Is

Settings is the one place every module reads its business-level context and automation defaults from — the business's identity, brand voice, service list, competitor-intelligence targeting, and every module's tunable defaults (Outreach pacing, Meta Ads defaults, the shared video character reference, and the weekly analysis-job schedule). One page (`/settings`), no sub-routes — organized entirely with in-page tabs, since a secondary sidebar for this few fields would be more navigation than the content warrants.

One shared dirty-check drives the whole page: local edits are compared against the last-fetched record, and a single floating save bar appears the moment anything's actually changed, regardless of which tab it's on — switching tabs never loses an edit, since every field lives in one in-memory form object.

## 2. Tabs

| Tab | What it holds |
|---|---|
| **General** | Business Identity — Business Name, Industry, Website URL, Description. |
| **Brand & Voice** | Tone of Voice, Business Voice Guidelines, Core Offerings, Pain Points, Target Audience — injected into every AI-generated ad script/email/caption so it sounds like this business, not a generic template. |
| **Services** | The list of services this business actually offers (name + description pairs) — read by Outreach's AI drafting and the Create Ad modal's service picker. |
| **Competitor Intelligence** | Target Countries and Competitor Search Keywords (what the weekly competitor scraper searches for), plus Ad Script Topics (the topic/format pairs the weekly self-ad analysis looks for). |
| **Automation Defaults** | Four sections — see §2.1. |

### 2.1 Automation Defaults, in more detail

| Section | What it controls |
|---|---|
| **Outreach Defaults** | Daily Send Limit, Timezone, Sending Days (weekday toggle), and the send Window Start/End — every new Outreach campaign inherits these. |
| **Meta Ads Defaults** | One toggle: whether new Ad Sets start with Advantage+ Audience (Meta's automatic audience expansion) turned on. |
| **Video Character Reference** | Optional — locks every AI-generated video (Meta Ads *and* Social Media) to one real person's photo per gender, so the character stays visually consistent scene to scene. A toggle plus male/female reference-photo uploaders; Save is blocked until both photos are set once enabled. Image generation is never affected, video only. |
| **Analysis Schedule** | Pick any day + hour (in the Outreach timezone above) for the weekly Competitor Analysis and Self Ad Analysis reports to run — each shows its own last-run timestamp. Nothing here is fixed in code; see `../architecture/system_design.md` §2.D for how an hourly cron checks these per business. |

## 3. Data Model

Single row, `businesses` (single-tenant — read via `.limit(1).single()`, never scoped by a session). Columns this page reads/writes:

| Column(s) | Tab |
|---|---|
| `name`, `industry`, `description`, `website_url` | General |
| `tone_of_voice`, `business_voice`, `core_offerings`, `pain_points`, `target_audience` | Brand & Voice |
| `services` (jsonb array of `{name, description}`) | Services |
| `target_countries`, `competitor_keywords`, `ad_script_topics` (jsonb) | Competitor Intelligence |
| `outreach_settings` (jsonb: `daily_limit`, `timezone`, `days`, `send_window: {from, to}`) | Automation Defaults → Outreach |
| `settings` (jsonb — specifically `settings.meta_ads.advantage_audience_default`) | Automation Defaults → Meta Ads |
| `video_reference_enabled`, `video_reference_male_url`, `video_reference_female_url` | Automation Defaults → Video Character Reference |
| `competitor_analysis_schedule_day/hour/last_run_at`, `self_ad_analysis_schedule_day/hour/last_run_at` | Automation Defaults → Analysis Schedule |

Deliberately **not** exposed here: `businesses.keywords`, `business_colors`, `guidelines` — these columns exist in the schema but have no real consumer anywhere in the app today, so they're left out rather than guessed at with a UI that doesn't do anything yet.

## 4. Why It's Built This Way

- **One page, tabs instead of routes.** The alternative — a secondary sidebar with one tab per section — would add more chrome than the content justifies; a page this size doesn't need its own navigation layer.
- **One save bar, not one per section.** Editing across tabs is common (e.g. adjusting a service description, then the Outreach send window) — a per-section save would force committing one change before making the next, or losing it on tab switch.
- **The Analysis Schedule exists because a fixed weekly cron doesn't scale to "one business, someday many."** Even single-tenant today, hardcoding a schedule in code instead of a business-owned field would mean a code deploy to change *when* a report runs — this way it's data, not a constant.

<details>
<summary>Key implementation files (for developers going deeper)</summary>

| Concept | File |
|---|---|
| Page | `src/modules/settings/pages/SettingsPage.tsx` |
| Shared field/section components | `src/modules/settings/components/shared.tsx` |
| API route | `src/app/api/settings/route.ts` |
| Schedule-checking helper (read by the analysis jobs) | `src/services/scheduling/business-schedule.ts` |

</details>
