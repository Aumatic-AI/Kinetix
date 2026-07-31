# Meta Ads Automation Module

**Status: built and active.**

## 1. What It Is

Meta Ads automates the whole lifecycle of a Meta (Facebook/Instagram) advertising campaign: an AI generates the video or image creative, a wizard launches it as a real (paused) Campaign → Ad Set → Ad on the Meta Graph API, and two weekly intelligence jobs keep feeding the AI real competitor and self-performance data so each new creative is better informed than the last.

## 2. Features

| Feature | What it does |
|---|---|
| **Ad Creative Generation** | One prompt in (e.g. "Summer sale for dental implants") → AI writes the copy/visual prompts and generates the final video or image, via a background Inngest job (script → visual prompting → voiceover → image/video generation → final FFmpeg assembly). |
| **Campaign Launch** | A 3-step wizard always creates a brand-new Campaign → Ad Set → Ad hierarchy, **paused**, directly on the Meta Graph API — never a mock. |
| **Add Ad Set** | Adds another audience under an *existing* campaign, inheriting its objective and CBO status. |
| **Add Creative (Ad)** | Adds another Ad under an *existing* Ad Set, inheriting its targeting/budget/optimization goal. |
| **Quick Edit / Undo** | Ad copy can be edited after generation; every prior version is kept (`meta_ad_creatives.revision_history`) so a bad edit isn't a dead end. |
| **Performance Polling** | Daily sync of every ad's live spend/impressions/clicks into `ad_performance_daily` — the input to self-ad analysis. |
| **Competitor Analysis** | Scrapes the Facebook Ads Library for a business's own target countries/keywords, scores relevance in memory, and writes an executive-summary report — no persisted ad gallery. |
| **Self-Ad Analysis** | Scores "seasoned" (7+ day) ads on a CTR-curve formula and writes next-cycle creative directives. |
| **Lead Capture** | No webhook — opening the Leads page syncs straight from the Meta Graph API and upserts into our own `leads` table (Meta itself purges leads after 90 days, so this is the permanent copy). A manual "Sync now" button forces the same check without leaving the page. |
| **Instant Forms management** | Create/view/archive Meta Lead Gen forms directly from Kinetix. |

## 3. Pages

| Page | Route | What you can do there |
|---|---|---|
| Dashboard | `/meta-ads` | KPIs (spend, CTR, ads tracked, competitors found, ad lifespan, gap opportunities), spend trend, self-ad score distribution, competitor angle/format breakdown, gap opportunities — date-range selector (7d/14d/30d/90d/All). |
| Campaigns | `/meta-ads/campaigns` | Every campaign as a card (ad set/ad counts, age), paginated; "New Campaign" launches the wizard. |
| Campaign Detail | `/meta-ads/campaigns/:campaignId` | Every Meta field for the campaign, lifetime performance, its Ad Sets, and "+ Add Ad Set". |
| Ad Set Detail | `/meta-ads/campaigns/:campaignId/:adSetId` | Targeting/placements/budget/optimization detail, lifetime performance, its Ads, and "+ Add Creative". |
| Ad Detail | `/meta-ads/campaigns/:campaignId/:adSetId/:adId` | Creative preview, full ad copy, lifetime performance, "Preview on Meta," and inline copy editing. |
| Reports | `/meta-ads/reports` | Live ad-level performance table (spend/CTR/CPM/score) for a selected range, paginated. |
| Ad Library | `/meta-ads/ad-library` | Every generated/uploaded creative as a dense thumbnail grid, paginated; approve, retry, delete, or launch/relaunch a campaign from one. |
| Leads | `/meta-ads/leads` | Browse captured leads (paginated table, synced fresh from Meta on open) or manage Instant Forms, on two tabs; "Sync now" forces a re-check without leaving the page. |
| Create Campaign | `/meta-ads/campaigns/create` | The 3-step Launch wizard (reached from Campaigns or Ad Library, not in the sidebar). |

### 3.1 Campaign Launch & Management Flow, in more detail

Three distinct entry points, each with exactly one job — deliberately not one omnibus "Launch" flow that also handles appending to something that already exists:

1. **The Launch wizard** (Campaigns page "New Campaign," or Ad Library's per-creative "Launch"/"Relaunch") — always creates a brand-new Campaign + its first Ad Set + first Ad. 3 steps: **Campaign** (name, objective, optional CBO toggle — when on, the daily/lifetime budget is asked here instead of step 2), **Ad Set** (Optimization Goal filtered by objective, countries/age/gender, Advantage+ Audience toggle, Placements — Advantage+ automatic or manual Facebook/Instagram platform+position picker — budget if not CBO, optional schedule), **Creative** (pick an approved creative, ad copy, Instant Form picker if objective is Leads). `POST /api/meta-ads/campaigns/launch`.
2. **"+ Add Ad Set"** (Campaign Detail page) — adds another audience under that campaign, inheriting its objective and CBO status from our own `campaigns` row (never re-derived from Meta). Can use a Daily or Lifetime budget. `POST /api/meta-ads/campaigns/[campaignId]/ad-sets`.
3. **"+ Add Creative"** (Ad Set Detail page) — adds another Ad under that Ad Set, inheriting its targeting/budget/optimization goal untouched. If the Ad Set's `optimization_goal` is `LEAD_GENERATION`, a Lead Gen Form is required instead of a destination URL (Meta doesn't allow mixing lead-form ads and website-link ads in the same ad set). `POST /api/meta-ads/campaigns/ad-sets/[adSetId]/ads`.

All three follow the same underlying sequence (shared helpers in `launch.service.ts`): upload the creative's media (`meta_ad_creatives.media_urls`, not `media_assets`/`media_asset_id`) + resolve the Facebook Page in parallel → resolve delivery settings (optimization goal, and a Pixel auto-discovered/created if the goal needs one) → create the Ad Set on Meta → create the Ad Creative → create the Ad → persist our own pointer row(s) with the Meta-assigned `external_*_id`s. **Every object created this way is `status: "PAUSED"` — going live is always a separate, explicit action** (Smart Run, or the generic pause/resume/archive endpoint), never automatic.

Manual placement choices are genuinely sent to Meta (`publisher_platforms`/`facebook_positions`/`instagram_positions`) when "Manual" is chosen — unlike the legacy project, whose equivalent UI collected these but never actually forwarded them.

### Credentials — env vars, not `platform_connections`

Both Launch and the nightly sync job read `META_ACCESS_TOKEN`/`META_AD_ACCOUNT_ID` directly via `requireMetaAdAccountEnv()` in `src/services/meta/graph-client.ts` — this module does not read from `platform_connections`/Vault at all today. Lead Capture uses a *separate* pair of credentials (`META_PAGE_ID`/`META_PAGE_TOKEN`) — Page scope, not ad-account scope. See `CLAUDE.md`'s Meta Ads section.

### Lead Capture — sync-on-open, not a webhook

`GET /api/meta-ads/leads` syncs straight from the Graph API (`LeadsService.syncFromMeta` — every Instant Form's leads, upserted on `meta_lead_id`) whenever page 1 is requested, i.e. every time the Leads page is opened, then reads the now-current `leads` table. A "Sync now" button (`POST /api/meta-ads/leads/sync`, same underlying service) forces a fresh check without leaving the page. There's deliberately no real-time webhook here — that would need a stable public URL, HMAC signature verification, and a one-time dashboard subscription, none of which is worth the complexity for a single-tenant app where "fresh as of the last page-open" is good enough. Upserting on `meta_lead_id` means syncing twice in a row (or the manual button firing right after an automatic sync) never creates duplicates.

## 4. Pagination

Campaigns, Reports, Ad Library, and Leads all paginate server-side through the shared system described in `../architecture/system_design.md` §6 — Campaigns/Reports/Leads at `PAGE_SIZE_COMPACT` (10), Ad Library at `PAGE_SIZE_DENSE` (20, denser thumbnail grid). Reports has no DB table backing its list (see §5 below) — its pagination is a post-fetch slice of the already-fully-fetched, already-sorted in-memory array, with the summary/KPI row always computed over the full range regardless of which page is showing.

## 5. Database Relationships

- `meta_ad_creatives`: the AI-generated copy (`ad_script`) and a link to the final video/image via `media_asset_id` (`media_assets`), plus `revision_history` for Quick-Edit/undo.
- `ad_analysis_reports`: competitor and self-performance intelligence, read back in at generation time. There's no separate competitor-ad gallery table — see `../architecture/database_schema.md` §5.
- `ad_performance_daily`: real Meta ad performance, synced daily.
- `campaigns`, `ad_sets`, `ads`: mirror Meta's own object structure, each a pointer (`external_*_id`) to the real Meta object — see §3.1 above. **Fully built**, not schema-only.
- `leads`: permanent lead storage, synced from Meta on Leads-page open.

See `../architecture/database_schema.md` for the full table list — this doc only covers what's specific to Meta Ads. Reports' ad-level list has **no backing DB table at all** — it's entirely live Meta Graph Insights data, by design (see §6 below), so don't go looking for a "reports" table.

## 6. Why It's Built This Way

- **Reports never touches `ad_performance_daily`.** That table exists purely for the nightly sync job / Dashboard trend charts. Reports needs "today" to never be stale, so it always calls the Graph API live for whatever range is selected — trading a slightly slower request for a guarantee that the numbers are never a snapshot.
- **Everything Launch creates starts `PAUSED`.** Going live is always a separate, explicit action (Smart Run / Resume) — never a side effect of creating something, so a half-configured campaign can never accidentally start spending.
- **Competitor/self-ad analysis run on an hourly cron, not weekly.** Each business now picks its own day/hour via Settings' Analysis Schedule; since Inngest cron triggers can't read a per-business DB value at schedule-definition time, the job runs hourly and checks per business whether *this* is the hour it's actually due — see `../architecture/system_design.md` §2.D.

## 7. Known Limitations

- Ad Creative Generation has no caption/subtitle-burning step in the pipeline yet (Social Media's video pipeline has this via AssemblyAI; Meta Ads' doesn't).
- No settings screen field ties directly to Meta Ads beyond the "Advantage+ Audience by default" toggle and the shared video character reference — most targeting/budget defaults are chosen fresh in the Launch wizard each time, not stored as a reusable template.
- Reports' pagination is a slice of an already-fully-fetched account-wide list (see §4) — very large accounts (\>500 ads/insights rows, the `graphGetAllPages` cap) would see a truncated set rather than true deep pagination.

<details>
<summary>Key implementation files (for developers going deeper)</summary>

| Concept | File |
|---|---|
| Pages | `src/modules/meta-ads/pages/*.tsx` |
| Detail pages + shared building blocks | `src/modules/meta-ads/components/campaigns/*.tsx` |
| Campaign/Ad Set/Ad launch logic | `src/modules/meta-ads/services/launch.service.ts` |
| Meta Graph API client | `src/services/meta/graph-client.ts` |
| Ad creative generation jobs | `src/services/inngest/meta-ads/*.ts` |
| Competitor/self-ad analysis jobs | `src/jobs/competitor-ad-scraper.job.ts`, `src/jobs/business-ad-analysis.job.ts` |
| API routes | `src/app/api/meta-ads/**` |
| Lead sync logic | `src/modules/meta-ads/services/leads.service.ts` |

</details>
