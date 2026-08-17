# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@DESIGN.md

## Commands

```bash
npm run dev              # Start dev server (Next.js 16, App Router)
npm run build             # Production build
npm run lint               # ESLint
npx tsc --noEmit          # Typecheck (no dedicated npm script — run this directly after any change)
```

No test suite exists in this repo yet — don't assume `npm test` works.

### Supabase (migrations)

```bash
npx supabase db push --linked        # Push a new migration in supabase/migrations/ to the linked project
npx supabase gen types typescript --project-id nzsxuyjermciofffcama --schema public > src/types/supabase.ts
```

Never redirect stderr into the types file (`... > src/types/supabase.ts 2>&1`) — a CLI update-notice on stderr gets appended after the generated `} as const` and silently breaks every consumer with cascading `tsc` errors. Regenerate types after every migration and re-run `tsc --noEmit`. See the `supabase-migration` skill for the full step-by-step.

### Background jobs (Inngest)

Inngest dev server runs at `http://localhost:8288` (`INNGEST_DEV=1` in `.env.local` — must be unset/`0` in production, or every background job tries to reach a local server that doesn't exist). A new Inngest function must be added to the `functions` array in `src/services/inngest/functions.ts` or it never registers, even if `createFunction(...)` exists elsewhere. All cron scheduling is Inngest-side (declared on each `src/jobs/*.job.ts` function itself, triggered by Inngest's own scheduler hitting `/api/inngest`) — there is no `vercel.json` `crons` entry or `/api/cron` route; an earlier no-op stub of both was removed since it did nothing and (being hourly) tripped Vercel Hobby-plan's daily-cron-jobs limit on deploy.

`src/jobs/*.job.ts`, registered in `src/services/inngest/functions.ts`:
- `meta-ads-performance-sync.job.ts` — nightly, populates `ad_performance_daily`.
- `business-ad-analysis.job.ts` — hourly cron that checks each business's own configured day/hour (Settings → Automation Defaults → Analysis Schedule) before actually doing the weekly self-ad analysis work. (The competitor-ad-scraper job and its Dashboard display were removed — `ad_analysis_reports` rows with `report_type = 'competitor'` from before removal may still exist and are still read by ad-generation prompts for market context, but nothing generates new ones anymore.)
- `social-scheduled-post-check.job.ts` — publishes scheduled social posts when due.
- `social-analytics-cache-refresh.job.ts` — every 5 minutes, refreshes `upload_post_analytics_cache` (see the Social/Root Dashboard note below) so those dashboards never call Upload-Post live.
- `meta-ads-leads-sync.job.ts` — every 5 minutes, syncs `leads` from the Meta Graph API in the background (see the Meta Ads Leads note above) so the Leads page never calls Meta live.
- `src/services/inngest/outreach/send-campaign.ts` (event `outreach/send-campaign`) — sends one outreach campaign through Instantly.ai; fired on-demand from the Campaigns list, not on a cron.

**Never call a slow third-party API (Meta Graph, Upload-Post, Instantly) directly from a page-load GET route.** Both the Leads page (Meta Graph, ~7-8s) and the Root/Social dashboards (Upload-Post analytics, ~10s) were originally built this way and had to be fixed — the pattern now is: a scheduled Inngest job is the only thing that ever calls the slow API, writing its result into our own table (`leads`, `upload_post_analytics_cache`); the page's own route only ever reads that table, so it's a fast Postgres query regardless of how slow the upstream API is. A manual "force refresh now" button is fine to keep calling the live API synchronously, since that's an explicit user action with its own loading state, not a passive page load.

## Documentation map

This file covers cross-cutting conventions only. For anything deeper, read the relevant file in `docs/` rather than re-deriving it from source — they're kept current, not aspirational:
- [`docs/index.md`](docs/index.md) — start here for an overview of the whole system.
- [`docs/architecture/database_schema.md`](docs/architecture/database_schema.md) — every table, column, and relationship, verified against `supabase/migrations/`.
- [`docs/architecture/system_design.md`](docs/architecture/system_design.md) — how Next.js, Supabase, and Inngest fit together, and the single-tenant-on-multi-tenant-schema model.
- [`docs/modules/*.md`](docs/modules/) — one file per product module (Meta Ads, Social Media, Outreach), what's actually built.
- [`DESIGN.md`](DESIGN.md) (imported above, always in context) — the UI design system: tokens, component specs, and rules for building consistent UI.

## Architecture

Kinetix is a single-tenant marketing-automation platform for one client (Toga Health, medical tourism). It is a Next.js App Router app with several product "modules" (Meta Ads, Social Media, Outreach, Settings), navigated via a two-tier sidebar (`PrimarySidebar` = modules, `SecondarySidebar` = per-module tabs) driven by the URL's pathname prefix in `src/app/(app)/layout.tsx`.

**Meta Ads, Social Media, and Outreach have real functionality built** — these are the only three product modules in the app today.

### Module structure — always follow this split

- `src/app/(app)/<module>/<tab>/page.tsx` — thin file, just renders the real page component. Real logic never lives here.
- `src/modules/<module>/pages/*.tsx` — the actual page components.
- `src/modules/<module>/components/`, `hooks/`, `services/`, `types/` — everything else for that module.
- Nav entries are centralized, not inferred from the filesystem: a new page needs an entry in both `src/config/routes.ts` (`ROUTES`) and `src/config/navigation.ts` (`SECONDARY_NAV_ITEMS`), or the sidebar link won't exist / will 404.
- New shared UI components go in `src/components/ui/` — see `DESIGN.md` §7 for the full component inventory and the PascalCase-filename convention for new ones.

### Single-tenant assumption

There is no per-user auth gating (no `middleware.ts`) and almost every API route/service resolves "the business" via `supabase.from("businesses").limit(1).single()` rather than deriving `business_id` from a session. This is intentional for the current one-client scope, not a bug to "fix" by adding multi-tenant plumbing unless explicitly asked.

### Supabase client conventions

- **API routes**: `createClient()` from `@/lib/supabase/server` (async, cookie/RLS-scoped).
- **Client components/hooks**: `createClient()` from `@/lib/supabase/client` (sync, browser).
- **Inngest jobs**: bypass RLS entirely — instantiate a raw `@supabase/supabase-js` client inline in the job file with `SUPABASE_SERVICE_ROLE_KEY`, not through `@/lib/supabase`.

### AI orchestration

`aiOrchestrator.executeTask(taskType, prompt, provider, options)` in `src/services/ai/orchestrator.ts` is the single entry point for every AI provider (OpenAI, Gemini, Runway, Fal, ElevenLabs, Kling, Replicate, Kie). Always call through this, never a provider SDK directly from a route or job. All prompt-building logic lives in `src/prompts/<domain>/index.ts` as plain exported functions, one file per domain — never inline long prompt strings in a route.

### Meta Ads module — credentials and data model

Two separate Meta credentials, both declared in `src/config/env.ts`'s zod schema (optional there, since they're server-only) and read via the parsed `env` object, not `process.env` directly:
- `META_ACCESS_TOKEN` + `META_AD_ACCOUNT_ID` — ad-account scope, covers Campaigns/Reports/Ad Library.
- `META_PAGE_ID` + `META_PAGE_TOKEN` — Page scope, only for Leads (Instant Forms).

`src/services/meta/graph-client.ts` is the one shared Graph API client (`graphGet`/`graphGetAllPages`/`graphPost`/`graphPostForm`/`graphDelete` + `metaErrorMessage()`) — every Meta call should go through it rather than a fresh `fetch()`.

The `campaigns`/`ad_sets`/`ads`/`leads` tables are a **pointer, not a mirror**: they store our own config plus an `external_*_id` pointing at the real Meta object. Current status/spend is always fetched live from the Graph API (short TanStack Query cache), never persisted — only `ad_performance_daily` (nightly snapshot job) and `leads` are meant to be durably stored. New Campaigns/Ad Sets/Ads are always created `PAUSED` on Meta; going live is a separate explicit action (Smart Run / Resume).

**Leads has no webhook, and `GET /api/meta-ads/leads` never calls Meta live either** — both would make the page load wait on Meta's API (a real, measured 7-8s round trip). Instead `jobs/meta-ads-leads-sync.job.ts` (Inngest cron, every 5 minutes) calls `LeadsService.syncFromMeta()` (upserts on `meta_lead_id`) in the background, and the GET route only ever reads the now-current `leads` table — a single fast Postgres query. The "Sync now" button (`POST /api/meta-ads/leads/sync`, same underlying service) still exists for forcing an immediate on-demand sync instead of waiting for the next tick. No `META_APP_SECRET`/`META_WEBHOOK_VERIFY_TOKEN`/HMAC verification/dashboard subscription needed either way.

### Outreach module — Instantly.ai and the unified status system

Every Kinetix outreach campaign gets its **own dedicated Instantly.ai campaign** — never share one Instantly campaign across multiple Kinetix campaigns (a legacy bug this deliberately avoids). `src/services/instantly/client.ts` is the one Instantly API wrapper (`InstantlyService`); campaigns are created in Draft and must be explicitly activated.

Same **pointer, not mirror** split as Meta Ads: our DB (`outreach_campaigns`, `outreach_leads`, `outreach_lead_lists`, `outreach_campaign_leads`) owns config and workflow state; Instantly owns live delivery/analytics, always fetched fresh via `/api/outreach/analytics`, never cached in our DB.

**Never branch UI on `outreach_campaigns.status` or Instantly's raw numeric status directly** — always go through `resolveCampaignStatus()` in `src/modules/outreach/utils/campaign-status.ts`, the single merge point producing one of six values (`draft`, `ready`, `sending`, `sent`, `paused`, `no_recipients`). See `docs/modules/outreach.md` for what each means and drives it.

### Styling — a recurring gotcha

`src/styles/globals.css` mixes Tailwind v4's auto-generated (layered) utilities with hand-written plain (unlayered) utility classes for the custom design tokens (`--color-primary`, `--color-success`, `--color-danger`, `--color-warning`, `--color-border`, `--color-text`/`--color-text-muted`, radius, etc. — see `DESIGN.md` §2/§4 for the full token list). Per the CSS Cascade Layers spec, **unlayered CSS always wins over layered CSS regardless of specificity or source order** — so a Tailwind utility class with no matching hand-written override in `globals.css` can silently lose to a reset rule (e.g. `button/input/select/textarea { padding: 0 }`, `a { color: inherit }`, or Tailwind's own computed `rounded-lg`) and appear to "do nothing" or resolve to an unexpected value. If a Tailwind class visually has no effect, check for a competing unlayered rule in `globals.css` before assuming a typo — this has been the root cause several times. Only use the real token names already defined there; don't invent new CSS variables.
