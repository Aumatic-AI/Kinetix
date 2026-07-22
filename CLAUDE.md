# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

Never redirect stderr into the types file (`... > src/types/supabase.ts 2>&1`) — a CLI update-notice on stderr gets appended after the generated `} as const` and silently breaks every consumer with cascading `tsc` errors. Regenerate types after every migration and re-run `tsc --noEmit`.

### Background jobs (Inngest)

Inngest dev server runs at `http://localhost:8288` (`INNGEST_DEV=1` in `.env.local`). A new Inngest function must be added to the `functions` array in `src/services/inngest/functions.ts` or it never registers, even if `createFunction(...)` exists elsewhere. `src/app/api/cron/route.ts` is an unused stub, not the real scheduler — actual cron triggers live on each `src/jobs/*.job.ts` function itself.

## Architecture

Kinetix is a single-tenant marketing-automation platform for one client (Toga Health, medical tourism). It is a Next.js App Router app with several product "modules" (Meta Ads, Social Media, Newsletter, Outreach, Voice Agents, Settings), navigated via a two-tier sidebar (`PrimarySidebar` = modules, `SecondarySidebar` = per-module tabs) driven by the URL's pathname prefix in `src/app/(app)/layout.tsx`.

**Only Meta Ads and Social Media have real functionality built.** Newsletter, Outreach, Voice, and Settings are single placeholder overview pages (`src/modules/<name>/pages/*OverviewPage.tsx`) with no logic behind them yet.

### Module structure — always follow this split

- `src/app/(app)/<module>/<tab>/page.tsx` — thin file, just renders the real page component. Real logic never lives here.
- `src/modules/<module>/pages/*.tsx` — the actual page components.
- `src/modules/<module>/components/`, `hooks/`, `services/`, `types/` — everything else for that module.
- Nav entries are centralized, not inferred from the filesystem: a new page needs an entry in both `src/config/routes.ts` (`ROUTES`) and `src/config/navigation.ts` (`SECONDARY_NAV_ITEMS`), or the sidebar link won't exist / will 404.

### Single-tenant assumption

There is no per-user auth gating (no `middleware.ts`) and almost every API route/service resolves "the business" via `supabase.from("businesses").limit(1).single()` rather than deriving `business_id` from a session. This is intentional for the current one-client scope, not a bug to "fix" by adding multi-tenant plumbing unless explicitly asked.

### Supabase client conventions

- **API routes**: `createClient()` from `@/lib/supabase/server` (async, cookie/RLS-scoped).
- **Client components/hooks**: `createClient()` from `@/lib/supabase/client` (sync, browser).
- **Inngest jobs**: bypass RLS entirely — instantiate a raw `@supabase/supabase-js` client inline in the job file with `SUPABASE_SERVICE_ROLE_KEY`, not through `@/lib/supabase`.

### AI orchestration

`aiOrchestrator.executeTask(taskType, prompt, provider, options)` in `src/services/ai/orchestrator.ts` is the single entry point for every AI provider (OpenAI, Gemini, Runway, Fal, ElevenLabs, Kling, Replicate, Kie). Always call through this, never a provider SDK directly from a route or job. All prompt-building logic lives in `src/prompts/<domain>/index.ts` as plain exported functions, one file per domain — never inline long prompt strings in a route.

### Meta Ads module — credentials and data model

Two separate Meta credentials, read directly via `process.env` (not through `src/config/env.ts`'s zod schema, which doesn't cover these):
- `META_ACCESS_TOKEN` + `META_AD_ACCOUNT_ID` — ad-account scope, covers Campaigns/Reports/Ad Library.
- `META_PAGE_ID` + `META_PAGE_TOKEN` + `META_APP_SECRET` + `META_WEBHOOK_VERIFY_TOKEN` — Page scope, only for Leads (Instant Forms + the leadgen webhook).

`src/services/meta-ads/graph-client.ts` is the one shared Graph API client (`graphGet`/`graphGetAllPages`/`graphPost`/`graphPostForm`/`graphDelete` + `metaErrorMessage()`) — every Meta call should go through it rather than a fresh `fetch()`.

The `campaigns`/`ad_sets`/`ads`/`leads` tables are a **pointer, not a mirror**: they store our own config plus an `external_*_id` pointing at the real Meta object. Current status/spend is always fetched live from the Graph API (short TanStack Query cache), never persisted — only `ad_performance_daily` (nightly snapshot job) and `leads` (webhook-fed) are meant to be durably stored. New Campaigns/Ad Sets/Ads are always created `PAUSED` on Meta; going live is a separate explicit action (Smart Run / Resume).

### Styling — a recurring gotcha

`src/styles/globals.css` mixes Tailwind v4's auto-generated (layered) utilities with hand-written plain (unlayered) utility classes for the custom design tokens (`--color-primary`, `--color-success`, `--color-danger`, `--color-warning`, `--color-border`, `--color-text`/`--color-text-muted`, etc.). Per the CSS Cascade Layers spec, **unlayered CSS always wins over layered CSS regardless of specificity or source order** — so a Tailwind utility class with no matching hand-written override in `globals.css` can silently lose to a reset rule (e.g. `button/input/select/textarea { padding: 0 }`, `a { color: inherit }`) and appear to "do nothing." If a Tailwind class visually has no effect, check for a competing unlayered reset rule in `globals.css` before assuming a typo — this has been the root cause several times. Only use the real token names already defined there; don't invent new CSS variables.

### Background jobs currently running

`src/jobs/*.job.ts`, registered in `src/services/inngest/functions.ts`:
- `meta-ads-performance-sync.job.ts` — nightly, populates `ad_performance_daily`.
- `competitor-ad-scraper.job.ts` / `business-ad-analysis.job.ts` — weekly Meta Ads intelligence (competitor + self-ad analysis).
- `social-scheduled-post-check.job.ts` — publishes scheduled social posts when due.
