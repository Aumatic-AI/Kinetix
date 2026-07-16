# Meta Ads Automation Module

The Meta Ads module automates the creation of high-converting Meta advertising campaigns, ad sets, and ads, using AI-generated video and image creatives. This module is in active development now, alongside Social Media.

## Core Capabilities
1. **Ad Creative Generation:** Users input a basic prompt (e.g., "Summer sale for dental implants"). The AI writes the copy and visual prompts and generates the final video/image via the `meta-ads/generate-image` / `meta-ads/generate-video` Inngest events — see `ai_pipelines/media_generation.md`.
2. **Campaign Launching:** Deploy complete Campaign → Ad Set → Ad hierarchies directly to the Meta Graph API. *(Schema exists already — `campaigns`/`ad_sets`/`ads`; the launch flow itself isn't built yet.)*
3. **Performance Polling:** `meta-ads-performance-sync.job.ts` runs daily, fetching each business's ads/campaigns/insights straight from the Meta Graph API and writing into `ad_performance_daily` — the input to the self-ad analysis described in `ai_pipelines/intelligence_engine.md`. Works against a real connected ad account (`platform_connections`) or `META_ACCESS_TOKEN`/`META_AD_ACCOUNT_ID` env vars for development; does not depend on Campaign Launch existing.
4. **Competitor & Self-Ad Analysis:** weekly jobs that scrape the Facebook Ads Library and analyze real performance data — see `ai_pipelines/intelligence_engine.md` for the full pipeline. Required ad-script topics/formats for competitor analysis come from `businesses.ad_script_topics`, configurable per business.
5. **Lead Capture:** Real-time webhooks receive incoming Meta leads and permanently store them in `leads` (Meta itself purges leads after 90 days). *(Not yet built.)*

## Database Relationships
- `meta_ad_creatives`: the AI-generated copy (`ad_script`) and a link to the final video/image via `media_asset_id` (`media_assets`), plus `revision_history` for Quick-Edit/undo.
- `ad_analysis_reports`: competitor and self-performance intelligence, read back in at generation time. There's no separate competitor-ad gallery table — see `architecture/database_schema.md` §5.
- `ad_performance_daily`: real Meta ad performance, synced daily.
- `campaigns`, `ad_sets`, `ads`: mirror Meta's own object structure. *(Schema exists; Campaign Launch itself isn't built yet.)*
- `leads`: permanent lead storage.

See `architecture/database_schema.md` for the full, finalized table list — this doc only covers what's specific to Meta Ads.

## Campaign Launch Flow
When a user clicks "Launch Campaign", the API:
1. Verifies `platform_connections` to retrieve the Meta Ad Account access token (via Vault ref).
2. POSTs to Meta to create the Campaign.
3. POSTs to Meta to create the Ad Set (targeting: Age, Gender, Geo).
4. Uploads the final video/image (from `media_assets`, via `meta_ad_creatives.media_asset_id`) to the Meta Ad Account.
5. POSTs to Meta to create the Ad, linking the creative and the Ad Set.
6. Saves the generated `meta_campaign_id` / `meta_adset_id` / `meta_ad_id` back to `campaigns` / `ad_sets` / `ads` for tracking.
