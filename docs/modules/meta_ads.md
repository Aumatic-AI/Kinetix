# Meta Ads Automation Module

**Status: built and active.**

## 1. What It Is

Meta Ads automates the whole lifecycle of a Meta (Facebook/Instagram) advertising campaign: an AI generates the video or image creative, and a wizard launches it as a real (paused) Campaign → Ad Set → Ad on the Meta Graph API. (A weekly self-ad-analysis job and an earlier competitor-analysis job both used to feed AI-generated "market intelligence" into ad-generation prompts — the self-ad-analysis job scored live ad performance into next-cycle creative directives, and the competitor-analysis job scraped the Facebook Ads Library — but both jobs, their Dashboard/Settings surfaces, and every prompt section that read their output were removed as an unused feature. Ad generation today is grounded purely in the business's own Settings context and the user's own idea/brief, nothing else.)

## 2. Features

| Feature | What it does |
|---|---|
| **Ad Creative Generation** | One prompt in (e.g. "Summer sale for dental implants") → AI generates the final video or image via a background Inngest job. Videos are made **in one go by Seedance 2.5** (see §3.2); images by the image job. |
| **Campaign Launch** | A 3-step wizard always creates a brand-new Campaign → Ad Set → Ad hierarchy, **paused**, directly on the Meta Graph API — never a mock. |
| **Add Ad Set** | Adds another audience under an *existing* campaign, inheriting its objective and CBO status. |
| **Add Creative (Ad)** | Adds another Ad under an *existing* Ad Set, inheriting its targeting/budget/optimization goal. |
| **Quick Edit / Undo** | Ad copy can be edited after generation; every prior version is kept (`meta_ad_creatives.revision_history`) so a bad edit isn't a dead end. |
| **Performance Polling** | Daily sync of every ad's live spend/impressions/clicks into `ad_performance_daily` — the input to the Dashboard's spend trend and self-ad score chart. |
| **Lead Capture** | No webhook, and no background cron either — every page load calls Meta live and upserts into our own `leads` table (Meta itself purges leads after 90 days, so this is the permanent copy). A manual "Sync now" button forces another sync without reloading. Each lead has a **status** (New/Contacted/Qualified/Converted/Not Interested), changeable from the Leads table or its detail modal — best-effort reported to Meta's Conversions API for CRM so it's on record for a future "Conversion Leads"-optimized campaign. |
| **Instant Forms management** | Create/view/archive Meta Lead Gen forms directly from Kinetix. |

## 3. Pages

| Page | Route | What you can do there |
|---|---|---|
| Dashboard | `/meta-ads` | KPIs (spend, CTR, ads tracked), spend trend, self-ad score distribution — date-range selector (7d/14d/30d/90d/All). |
| Campaigns | `/meta-ads/campaigns` | Every campaign as a card (ad set/ad counts, age), paginated; "New Campaign" launches the wizard. |
| Campaign Detail | `/meta-ads/campaigns/:campaignId` | Every Meta field for the campaign, lifetime performance, its Ad Sets, and "+ Add Ad Set". |
| Ad Set Detail | `/meta-ads/campaigns/:campaignId/:adSetId` | Targeting/placements/budget/optimization detail, lifetime performance, its Ads, and "+ Add Creative". |
| Ad Detail | `/meta-ads/campaigns/:campaignId/:adSetId/:adId` | Creative preview, full ad copy, lifetime performance, "Preview on Meta," and inline copy editing. |
| Reports | `/meta-ads/reports` | Live ad-level performance table (spend/CTR/CPM/score) for a selected range, paginated. |
| Ad Library | `/meta-ads/ad-library` | Every generated/uploaded creative as a dense thumbnail grid, paginated; approve, retry, delete, or launch/relaunch a campaign from one. |
| Leads | `/meta-ads/leads` | Browse captured leads (paginated table, synced live from Meta on every load) or manage Instant Forms, on two tabs; "Sync now" forces another sync; each lead's status can be changed inline. |
| Create Campaign | `/meta-ads/campaigns/create` | The 3-step Launch wizard (reached from Campaigns or Ad Library, not in the sidebar). |

### 3.1 Campaign Launch & Management Flow, in more detail

Three distinct entry points, each with exactly one job — deliberately not one omnibus "Launch" flow that also handles appending to something that already exists:

1. **The Launch wizard** (Campaigns page "New Campaign," or Ad Library's per-creative "Launch"/"Relaunch") — always creates a brand-new Campaign + its first Ad Set + first Ad. 3 steps: **Campaign** (name, objective, optional CBO toggle — when on, the daily/lifetime budget is asked here instead of step 2), **Ad Set** (Optimization Goal filtered by objective, countries/age/gender, Advantage+ Audience toggle, Placements — Advantage+ automatic or manual Facebook/Instagram platform+position picker — budget if not CBO, optional schedule), **Creative** (pick an approved creative, ad copy, Instant Form picker if objective is Leads). `POST /api/meta-ads/campaigns/launch`.
2. **"+ Add Ad Set"** (Campaign Detail page) — adds another audience under that campaign, inheriting its objective and CBO status from our own `campaigns` row (never re-derived from Meta). Can use a Daily or Lifetime budget. `POST /api/meta-ads/campaigns/[campaignId]/ad-sets`.
3. **"+ Add Creative"** (Ad Set Detail page) — adds another Ad under that Ad Set, inheriting its targeting/budget/optimization goal untouched. If the Ad Set's `optimization_goal` is `LEAD_GENERATION`, a Lead Gen Form is required instead of a destination URL (Meta doesn't allow mixing lead-form ads and website-link ads in the same ad set). `POST /api/meta-ads/campaigns/ad-sets/[adSetId]/ads`.

All three follow the same underlying sequence (shared helpers in `launch.service.ts`): upload the creative's media (`meta_ad_creatives.media_urls`, not `media_assets`/`media_asset_id`) + resolve the Facebook Page in parallel → resolve delivery settings (optimization goal, and a Pixel auto-discovered/created if the goal needs one) → create the Ad Set on Meta → create the Ad Creative → create the Ad → persist our own pointer row(s) with the Meta-assigned `external_*_id`s. **Every object created this way is `status: "PAUSED"` — going live is always a separate, explicit action** (Smart Run, or the generic pause/resume/archive endpoint), never automatic.

Manual placement choices are genuinely sent to Meta (`publisher_platforms`/`facebook_positions`/`instagram_positions`) when "Manual" is chosen — unlike the legacy project, whose equivalent UI collected these but never actually forwarded them.

### 3.2 Video creatives: one shot with Seedance 2.5

Create New Ad → Video Ad makes the whole video in one go, with **no fixed story template**: the AI picks whatever concept and structure makes the strongest ad for the idea and the service. Only facts, safety and the owner's choices are fixed. Social Media's Create Post uses the same system and prompts (`src/prompts/one-shot-video`, `src/services/ai/one-shot-video.ts`), as an organic post instead of a paid ad, and with one default story (see `docs/modules/social_media.md` §7.0).

Rules for what the video model can't do well, in the shared prompts:
- **No writing in the picture.** It misspells every word it draws ("Toka Health"), so there are no captions, titles or text cards, every screen shows a soft unreadable interface, and every surface (signs, clothes, packaging) is plain and unbranded — **even when the owner's idea or the approved concept asks for written words** (a title, a name on a ticket or sign): the moment stays, the object is plain (or shows the brand image, see below), and the words are spoken instead. Things that usually carry writing (tickets, badges, warning tape, signs, menus) are left out or plain, and the business's name appears only in the prompt's BUSINESS, SPOKEN WORDS and SOUND sections, never in what we see. **Our code checks this** (`findWritingProblems` in `src/services/ai/one-shot-video.ts`: words like "text"/"caption" anywhere, or the name in any other section): a prompt that fails gets one rewrite with the problems named (`rewrite-video-prompt` step), and a second failure stops the job before Kie is paid. The one exception is the brand image, wherever a shot needs the brand instead of written words: a screen showing the business's own website, an object the moment needs branded (a ticket, a card, a badge), or the final shot (the logo is offered to the prompt writer as the last reference image and sent to Seedance only when it sets `useBrandImage`; the prompt calls it "the brand mark from reference image N", never by the business's name).
- **Saying the name and the website.** The business name is only spoken, at most twice, and the website only where the video needs it (usually the call to action), as one smooth phrase. The writer gives a respelling of each (e.g. a hard G, never a K) in SOUND and on its own line straight after the spoken line that says it.
- **Only the script is spoken.** It otherwise fills quiet moments with words of its own (it once read part of a scene description aloud), so the writer is told the script's lines are the only words anyone says.
- **Positive words only.** It draws whatever it's told about, even after "no", so the prompt it gets never names logos, watermarks or text; it just keeps the top-right corner of every shot calm, where our code adds the logo.
- **One reference face.** Only the main character has the reference photo's face; everyone else is clearly a different person.
- **The problem first, at its worst (the default).** When the service changes something visible on a person, the video shows the problem first at its most severe stage (hair loss: mostly bald on top; teeth: missing teeth and gaps; likewise for any service), in concrete physical words repeated in every shot before the change, with a close-up, and the same person with the result after. The reference photo gives only who the person is, never the state of what the service treats. When the owner's idea asks for a different kind of video (an offer or promotion, an introduction to the business, an announcement…), the idea wins and the problem is shown only where it calls for it.

1. **Form**: idea, service, duration (20, 25 or 30 s; 30 by default — Seedance 2.5's maximum), character (male or female: the main person and the voice), visual style, video type (real-life or animated design), language, aspect ratio, and "Use my reference photo" (on by default). No voice picker or audio style: Seedance makes the voice.
2. **Plan** (`POST /api/meta-ads/generate/one-shot-video/script`, prompts in `src/prompts/one-shot-video`): the AI imagines three concepts, keeps the best, and returns its concept and every spoken line (sized to the length, about 2.5 words a second). The user reviews and edits both.
3. **Start** (`POST /api/meta-ads/generate/one-shot-video`): sends `meta-ads/generate-one-shot-video`, then makes the `meta_ad_creatives` row (the approved plan is kept on `ad_script`, so Retry makes the same video).
4. **Job** (`src/services/inngest/meta-ads/generate-one-shot-video-ad.ts`): the reference photo for the chosen character (Settings → Video Character Reference) and the logo as an optional brand image, fitted to Seedance's size rules (`src/services/ai/seedance-references.ts`) → one OpenAI call (JSON mode) writes the full Seedance prompt — business facts in full, the approved plan word for word, timeline, voices, original music, ending, the visible before/after when the service changes something visible, and the safety rules (no surgery, needles or blood on screen, bodies clothed, no invented facts or promised results) — plus the Meta ad headline and primary text and whether a shot uses the brand image; our code checks it for written words (one rewrite if it fails) → one Seedance 2.5 task (`bytedance/seedance-2-5`, 480p, sound on; first check after 90 s, then every 30 s, up to 20 min; a fail or an almost-empty file is retried once) → **our code puts the exact logo top-right** (FFmpeg overlay, about 8% of the height, 70% opacity, `src/services/ffmpeg/logo-watermark.ts`; if that step fails the video is kept without it and the reason is saved) → stored in `business_media` → the creative goes to `review` with `media_urls` and `ad_script` (`headline`, `primary_text` for the Launch wizard, plus the concept, script and video prompt).

Retry (`POST /api/meta-ads/retry`) sends videos through this pipeline. Cost: about $0.14 per second at 480p on Kie (about $4.20 for 30 s), plus two small OpenAI calls. The per-scene pipeline (`generate-video-ad.ts`: fixed narrative modes, ElevenLabs lines, scene images, Seedance 2.0 clips, FFmpeg stitch) stays in the code but is no longer started from the app.

### Credentials — env vars, not `platform_connections`

Both Launch and the nightly sync job read `META_ACCESS_TOKEN`/`META_AD_ACCOUNT_ID` directly via `requireMetaAdAccountEnv()` in `src/services/meta/graph-client.ts` — this module does not read from `platform_connections`/Vault at all today. Lead Capture uses a *separate* pair of credentials (`META_PAGE_ID`/`META_PAGE_TOKEN`) — Page scope, not ad-account scope. See `CLAUDE.md`'s Meta Ads section.

### Lead Capture — live on every page load, not a webhook and not a background sync

`GET /api/meta-ads/leads` calls `LeadsService.syncFromMeta()` (walks every Instant Form's leads via the Graph API, upserts them on `meta_lead_id`) before reading the `leads` table on every request — a real, measured 7-8 second round trip on each page load, accepted by deliberate choice so the page never shows data older than "right now." This used to go through a 5-minute background cron (`jobs/meta-ads-leads-sync.job.ts`) instead, with the route only ever reading the table; that job was removed in favor of always-live data — see `../architecture/system_design.md`'s note on Leads/dashboards calling their APIs live. Because `syncFromMeta()` only upserts and never deletes, a lead from an earlier sync stays in `leads` even if a later Graph API response happens to omit it, so reading the table right after syncing already reflects everything ever seen, not just this one call's response. If the live sync itself fails, the route falls back to whatever's already in `leads` instead of failing the whole page. A "Sync now" button (`POST /api/meta-ads/leads/sync`, same underlying service) still exists for forcing another sync without leaving/reloading the page. There's deliberately no real-time webhook either — that would need a stable public URL, HMAC signature verification, and a one-time dashboard subscription, none of which is worth the complexity for a single-tenant app.

### Lead Status — local tracking + a best-effort push to Meta

`leads.status` (`new` default, or `contacted`/`qualified`/`converted`/`not_interested`) is changed via `POST /api/meta-ads/leads/status`, which updates the row and then — separately, wrapped so a failure here never fails the request — calls `sendLeadStatusEvent()` (`src/services/meta/conversions-api.ts`) to report the same status to Meta's **Conversions API for CRM**, matched back to the original submission by `meta_lead_id`. This requires `META_CONVERSIONS_DATASET_ID` (a CRM dataset created once in Meta Events Manager, outside this codebase); if it isn't set, the local status change still succeeds and the Meta push is simply skipped. On its own, reporting the event does **not** change ad delivery — Meta only acts on it once an ad set's Optimization Goal is switched from `LEAD_GENERATION` to a quality-based **"Conversion Leads"** goal, which is a separate change not yet made to the Campaign creation flow (`resolveDeliverySettings()` in `launch.service.ts` still always forces `LEAD_GENERATION` for a native Instant Form ad set).

## 4. Pagination

Campaigns, Reports, Ad Library, and Leads all paginate server-side through the shared system described in `../architecture/system_design.md` §6 — Campaigns/Reports/Leads at `PAGE_SIZE_COMPACT` (10), Ad Library at `PAGE_SIZE_DENSE` (20, denser thumbnail grid). Reports has no DB table backing its list (see §5 below) — its pagination is a post-fetch slice of the already-fully-fetched, already-sorted in-memory array, with the summary/KPI row always computed over the full range regardless of which page is showing.

## 5. Database Relationships

- `meta_ad_creatives`: the AI-generated copy (`ad_script`) and a link to the final video/image via `media_asset_id` (`media_assets`), plus `revision_history` for Quick-Edit/undo.
- `ad_performance_daily`: real Meta ad performance, synced daily — powers the Dashboard's spend trend and self-ad score chart, computed fresh on every load (`src/services/ai/self-ad-processor.ts`).
- `campaigns`, `ad_sets`, `ads`: mirror Meta's own object structure, each a pointer (`external_*_id`) to the real Meta object — see §3.1 above. **Fully built**, not schema-only.
- `leads`: permanent lead storage, synced live from Meta on every Leads-page load.

See `../architecture/database_schema.md` for the full table list — this doc only covers what's specific to Meta Ads. Reports' ad-level list has **no backing DB table at all** — it's entirely live Meta Graph Insights data, by design (see §6 below), so don't go looking for a "reports" table.

## 6. Why It's Built This Way

- **Reports never touches `ad_performance_daily`.** That table exists purely for the nightly sync job / Dashboard trend charts. Reports needs "today" to never be stale, so it always calls the Graph API live for whatever range is selected — trading a slightly slower request for a guarantee that the numbers are never a snapshot.
- **Everything Launch creates starts `PAUSED`.** Going live is always a separate, explicit action (Smart Run / Resume) — never a side effect of creating something, so a half-configured campaign can never accidentally start spending.

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
| API routes | `src/app/api/meta-ads/**` |
| Lead sync logic (called live from `GET /api/meta-ads/leads`, no background job) | `src/modules/meta-ads/services/leads.service.ts` |

</details>
