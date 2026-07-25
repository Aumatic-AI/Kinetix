# Meta Ads Automation Module

The Meta Ads module automates the creation of high-converting Meta advertising campaigns, ad sets, and ads, using AI-generated video and image creatives. This module is in active development now, alongside Social Media.

## Core Capabilities
1. **Ad Creative Generation:** Users input a basic prompt (e.g., "Summer sale for dental implants"). The AI writes the copy and visual prompts and generates the final video/image via the `meta-ads/generate-image` / `meta-ads/generate-video` Inngest events (script generation → visual prompting → voiceover → image generation → video generation → final FFmpeg assembly). *(No caption/subtitle step exists yet in this chain — see "Known gaps" below.)*
2. **Campaign Launching:** Fully built. A 3-step wizard (`CreateCampaignWizard`) always creates a brand-new Campaign → Ad Set → Ad hierarchy, PAUSED, directly on the Meta Graph API. Adding another Ad Set to an existing campaign, or another creative to an existing Ad Set, is a separate action from the Campaign Details view (see "Campaign Launch & Management Flow" below) — the wizard itself never appends to something that already exists.
3. **Performance Polling:** `meta-ads-performance-sync.job.ts` runs daily, fetching each business's ads/campaigns/insights straight from the Meta Graph API and writing into `ad_performance_daily` — the input to the weekly self-ad analysis. Works against `META_ACCESS_TOKEN`/`META_AD_ACCOUNT_ID` env vars (not `platform_connections` — see the credentials note below); does not depend on Campaign Launch existing.
4. **Competitor & Self-Ad Analysis:** weekly jobs (`competitor-ad-scraper.job.ts` / `business-ad-analysis.job.ts`) that scrape the Facebook Ads Library and analyze real ad performance, writing reports to `ad_analysis_reports`. Required ad-script topics/formats for competitor analysis come from `businesses.ad_script_topics`, configurable per business.
5. **Lead Capture:** Fully built. A real-time webhook (`/api/webhooks/meta/leads`, HMAC-verified) receives incoming Instant Form leads and permanently stores them in `leads` (Meta itself purges leads after 90 days), deduped on `meta_lead_id`. A manual `/api/meta-ads/leads/sync` route exists purely to backfill leads submitted before the webhook was registered — it never runs automatically.

### Credentials — env vars, not `platform_connections`
Both Launch and the nightly sync job read `META_ACCESS_TOKEN`/`META_AD_ACCOUNT_ID` directly via `requireMetaAdAccountEnv()` in `src/services/meta/graph-client.ts` — this module does not read from `platform_connections`/Vault at all today, unlike what an earlier draft of this doc described.

## Database Relationships
- `meta_ad_creatives`: the AI-generated copy (`ad_script`) and a link to the final video/image via `media_asset_id` (`media_assets`), plus `revision_history` for Quick-Edit/undo.
- `ad_analysis_reports`: competitor and self-performance intelligence, read back in at generation time. There's no separate competitor-ad gallery table — see `architecture/database_schema.md` §5.
- `ad_performance_daily`: real Meta ad performance, synced daily.
- `campaigns`, `ad_sets`, `ads`: mirror Meta's own object structure. *(Schema exists; Campaign Launch itself isn't built yet.)*
- `leads`: permanent lead storage.

See `architecture/database_schema.md` for the full table list — this doc only covers what's specific to Meta Ads.

## Campaign Launch & Management Flow

Three distinct entry points, each with exactly one job — deliberately not one omnibus "Launch" flow that also handles appending to something that already exists:

1. **`CreateCampaignWizard`** (Campaigns page "Launch New Campaign", or Ad Library's per-creative "Launch"/"Relaunch") — always creates a brand-new Campaign + its first Ad Set + first Ad. 3 steps: **Campaign** (name, objective, optional CBO toggle — when on, the daily budget is asked here instead of step 2), **Ad Set** (Optimization Goal filtered by objective, countries/age/gender, Advantage+ Audience toggle, Placements — Advantage+ automatic or manual Facebook/Instagram platform+position picker — budget if not CBO, optional schedule), **Creative** (pick an approved creative, ad copy, Instant Form picker if objective is Leads). `POST /api/meta-ads/campaigns/launch`.
2. **"+ Add Ad Set"** (Campaign Details view, on an existing campaign) — adds another audience under that campaign, inheriting its objective and CBO status from our own `campaigns` row (never re-derived from Meta). `POST /api/meta-ads/campaigns/[campaignId]/ad-sets`.
3. **"+ Add Creative"** (Campaign Details view, per existing Ad Set) — adds another Ad under that Ad Set, inheriting its targeting/budget/optimization goal untouched. If the Ad Set's `optimization_goal` is `LEAD_GENERATION`, a Lead Gen Form is required instead of a destination URL (Meta doesn't allow mixing lead-form ads and website-link ads in the same ad set). `POST /api/meta-ads/campaigns/ad-sets/[adSetId]/ads`.

All three follow the same underlying sequence (shared helpers in `launch.service.ts`): upload the creative's media (`meta_ad_creatives.media_urls`, not `media_assets`/`media_asset_id`) + resolve the Facebook Page in parallel → resolve delivery settings (optimization goal, and a Pixel auto-discovered/created if the goal needs one) → create the Ad Set on Meta → create the Ad Creative → create the Ad → persist our own pointer row(s) with the Meta-assigned `external_*_id`s. Every object created this way is `status: "PAUSED"` — going live is always a separate, explicit action (Smart Run, or the generic pause/resume/archive endpoint), never automatic.

Manual placement choices are genuinely sent to Meta (`publisher_platforms`/`facebook_positions`/`instagram_positions`) when "Manual" is chosen — unlike the legacy project, whose equivalent UI collected these but never actually forwarded them.
