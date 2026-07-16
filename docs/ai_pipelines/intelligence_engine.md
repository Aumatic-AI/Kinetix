# Intelligence Engine Pipeline

The Intelligence Engine is what powers Kinetix's AI generation. By automatically scraping competitors, syncing real ad performance, and analyzing both every week, Kinetix ensures generated ads are data-driven rather than generic. Both reports feed directly into Step 1 of the Ad Creative Generation pipeline (`ai_pipelines/media_generation.md`) — that's the entire point of running them.

Neither analysis workflow uses a vector database or retrieval step. The legacy n8n version of the competitor pipeline used Pinecone; that's deliberately not carried forward. Both workflows assemble their scored/filtered rows directly into a single prompt — simpler to build and debug, and more than enough for the data volumes involved.

## Competitor Analysis — weekly, fully automatic, no persisted gallery

Ported from the legacy n8n workflow (`toga Research analysis for ads.json`) at its actual depth, not the simplified version first drafted for this doc — see `src/jobs/competitor-ad-scraper.job.ts` and `src/services/ai/competitor-ad-processor.ts`.

1. **Trigger:** Weekly cron (`0 0 * * 0`) fans out one `jobs/competitor-ad-scraper` event per business.
2. **Search matrix:** One Facebook Ads Library URL is built for **every `target_countries` × `competitor_keywords` combination**, then sent as a single batch to Apify's `curious_coder~facebook-ads-library-scraper` actor, along with `settings.competitor_scrape` (`only_active`, `max_ads`, `sort`).
3. **Ad Processor, in memory — nothing here touches the database:**
   - **Relevance filter:** dynamic, derived from the business's own `competitor_keywords` and `name` — an ad is only kept if its text mentions one of them. (The legacy version hardcoded a medical-tourism regex; this generalizes to any vertical.)
   - Deleted/restricted pages and template/empty-hook ads are skipped.
   - Copy is extracted into hook/headline/body/cta/caption; ad type (video/image/carousel/text) is detected from the raw snapshot.
   - Each ad is tagged with a **framework** (PAS/HSC/HUC/Cost-Savings/Direct/Awareness) and up to **11 emotional angles** (cost-savings, trust/proof, urgency, safety, transformation, before/after, concierge/vip, fear-removal, local-targeting — derived from `target_countries`, not a hardcoded region list — plus the business's own keyword topics).
   - Ads are **scored** 0–10 (headline length, body length, CTA presence, format bonus, price/trust/CTA/local-targeting signals, plus a longevity bonus — see below) and **grouped by competitor page** into summaries (dominant angle, top framework, top hooks/CTAs/hashtags, best ad).
   - Each ad's **`days_running`** is computed from its Facebook Ads Library start date — an ad still live after 30-60+ days is a strong implicit signal it's converting, so it both boosts the ad's score and is surfaced to the AI as explicit evidence.
   - Market-wide stats (format breakdown, top angles/frameworks/CTAs/hashtags, average/longest ad longevity) and 10 gap flags (e.g. `no_carousel`, `no_trust_proof`, `no_local_targeting`) are computed across the whole scrape.
   - Any text truncated for storage (ad copy, hooks) uses a Unicode-code-point-safe truncation, not a raw character-index `.substring()` — a naive substring can slice a surrogate pair used by an emoji in half, producing a string that still passes `JSON.stringify` in JS but corrupts the UTF-8 bytes sent to Postgres and fails the insert with an opaque "Empty or invalid json" error.
4. **Trim for the prompt:** top 10 competitors and top 5 highest-scoring ads only — keeps the prompt token count bounded regardless of scrape size. These stay AI input context only; see point 6 for what actually gets written.
5. **AI call:** a system prompt built from the business's `industry`/`core_offerings`/`business_voice`/`target_audience` (not hardcoded to one client) requests a **6-section report** — `executive_summary`, `hook_analysis` (top patterns + a reusable hook formula), `gap_opportunities`, `ready_ad_scripts`, `budget_recommendation`, `action_plan`. `ready_ad_scripts` requires exactly as many scripts as `businesses.ad_script_topics` has entries, each in that topic's configured format. An earlier draft of this prompt requested a much larger 11-section report (a full competitor-by-competitor writeup, a framework breakdown, a hashtag strategy, restated market stats) — cut because none of it was ever read: the Competitors page only shows executive summary / hook formula / gaps / scripts / budget / action plan, and the ad-generation pipeline (`ai_pipelines/media_generation.md`) only ever reads `hook_analysis` and `gap_opportunities`/`ready_ad_scripts` from this report. The AI is explicitly told not to invent a `generated_at` timestamp — it has no way to know the real time, and reliably got it wrong; the system stamps this itself instead.
6. **The write:** the AI's 6-section response is written to `ad_analysis_reports` (`report_type = 'competitor'`), plus only the aggregate stats the Market Snapshot section actually charts (`meta.market_stats`: format breakdown, top angles, ad longevity) and the plain scalar counts (`meta.total_relevant`, `meta.total_competitors`). The full per-competitor breakdown, the top-ad image gallery, and the raw gap/framework/hashtag flags computed during processing are used as AI *input* context only and are never persisted — they didn't survive into any UI section or generation prompt, so keeping them in storage would just be unused weight in the `insights` column.

## Performance Sync — daily, feeds self-ad analysis

`src/jobs/meta-ads-performance-sync.job.ts`, cron `0 4 * * *`. For each business with a connected Meta ad account (`platform_connections`, `platform='facebook'`, `account_kind='ad_account'`) — or `META_ACCESS_TOKEN`/`META_AD_ACCOUNT_ID` env vars for development — fetches yesterday's ads, campaigns, and ad-level insights from the Meta Graph API (`src/services/meta-ads/insights.service.ts`) and upserts one `ad_performance_daily` row per ad. This is the "Performance Polling" capability referenced in `modules/meta_ads.md` — previously undocumented as unbuilt.

## Self-Ad Performance Analysis — weekly, conditional

`src/jobs/business-ad-analysis.job.ts` + `src/services/ai/self-ad-processor.ts`. Rebuilt around the deterministic scoring system already proven in the legacy project's Meta Ads dashboard (`/api/meta/report-analysis`) — not a ROAS threshold, which was never a meaningful metric here without purchase-value tracking on a lead-gen account.

1. **Trigger:** Inngest cron, weekly (`0 2 * * 0`).
2. **Aggregate first, then gate:** every `ad_performance_daily` row is grouped **by ad** (summed spend/impressions/clicks, true first-seen date) before any threshold is applied — fixing a real bug in the original version, which gated on raw daily rows, so a single 30-day-old ad could count as ~23 separate "seasoned" entries.
3. **Business-level gate:** skipped entirely unless the business has **more than 10 distinct ads** tracked.
4. **Ad-level gate:** only ads whose aggregated lifetime is **7 days or more** ("seasoned") are scored.
5. **Scoring:** a CTR-curve formula (5–100, labeled Excellent/Good/Average/Needs Work/Critical) — a 2x CTR improvement roughly halves CPM in Meta's auction, so CTR is weighted as the dominant signal, with click-volume and CPM as secondary adjustments.
6. **Pattern diagnosis**, per ad: **A** never delivered (fix budget/status, not creative) · **B** seen but zero clicks (hook is failing) · **C** clicks but weak CTR (audience or body needs work) · **D** good CTR but starved for reach (budget/audience too narrow) · **E** fine CTR but expensive clicks vs. account average (CTA or audience-readiness mismatch).
7. **Bucketing:** score ≥ 40 → top performer (top 3); everything else → underperformer, each get a pattern-specific, anti-hallucination-guarded suggestion (never invents copy, prices, or stats not present in the ad's own data; a suggestion field is `null` rather than generic advice when there isn't a specific, data-driven one to give).
8. **Delta framing:** the previous week's `ad_analysis_reports` row (`report_type = 'self'`) is fetched so the new report can speak in deltas, not just absolutes.
9. **Result:** written to `ad_analysis_reports` (`report_type = 'self'`). If the AI call fails for any reason, a deterministic rule-based report is generated instead — this job always produces something usable, never silently fails.

## Why this matters for generation

Both reports are pulled automatically every time the Ad Creative Generation pipeline runs (`media_generation.md` §1) — competitor intelligence tells the AI what hooks and angles are currently working in the market; self-performance intelligence tells it what's already worked (or is fatiguing) for this business specifically. Together they close the loop between "what the market is doing," "what's worked for us," and "what we generate next."
