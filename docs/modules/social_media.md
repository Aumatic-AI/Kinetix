# Social Media Module

The Social Media module creates and publishes organic content (image or video posts) across Facebook, Instagram, YouTube, X, LinkedIn, and TikTok. Built this session — OAuth connections, content generation, and publishing are all real and wired end-to-end; only the 6 platforms' own developer-app credentials are outstanding (see `docs/architecture/database_schema.md` and the Connected Accounts page for what's needed per platform).

## Core Capabilities
1. **OAuth Integrations** (`Connected Accounts` tab): users connect accounts via real OAuth 2.0 flows (`src/services/social/oauth/providers.ts`, `/api/social/connect/[provider]`, `/api/social/callback/[provider]`) into `platform_connections` — the same table Meta Ads' ad-account connections would use, no separate connections table. Facebook and Instagram share one Meta app under the hood (Instagram has no independent OAuth — it's reached through a Facebook Page's token).
2. **Content Generation** (`Posts` tab, "Create Post"): reuses the exact proven Kie AI / ElevenLabs / FFmpeg pipeline built for Meta Ads (`src/services/inngest/social/generate-social-{image,video}.ts` mirror `generate-{image,video}-ad.ts` step for step), with organic-content prompts ported from the legacy n8n workflows (`src/services/ai/prompts/social-media.ts`) instead of the ad-conversion prompts. One generation call produces one image or video plus a per-platform caption for every platform selected.
3. **Media Library** (`Media` tab): every generated or uploaded asset is saved to `media_assets` — a durable, reusable library independent of any one post (generated media is downloaded from Kie and re-uploaded to our own storage specifically so it doesn't depend on a third-party temporary URL).
4. **Publishing**: a dispatcher (`src/services/social/publish.ts`) calls each platform's real API (Meta Graph API, LinkedIn UGC API, X API v2, TikTok Content Posting API, YouTube Data API v3) with that connection's stored token.

## Database Relationships
- `social_posts`: one row per platform per post — publishing the same creative to Instagram and TikTok is two rows, not one, so each platform's publish status is tracked independently. Carries its own generation-config columns (`idea_prompt`, `generation_inputs`), plus `media_asset_id` for the shared asset and `connection_id` for which platform this row targets. `media_asset_ids` (array) exists for a future carousel format — not yet wired to generation.
- `platform_connections`: OAuth tokens per platform. Vault isn't wired up yet — `access_token_ref`/`refresh_token_ref` currently hold the raw token directly, same simplification already in place for Meta Ads.
- `media_assets`: the shared library — `source` (`ai_generated`/`uploaded`/`scraped`) and `type` (`image`/`video`/`audio`/`document`) distinguish what's in it.

See `architecture/database_schema.md` §7 for the full reasoning behind the one-row-per-platform design.

## Posting Flow (as built)
1. User opens "Create Post," picks a format (image or video — carousel and text-only formats exist in the schema but aren't wired to generation yet), selects which *connected* platforms to post to, and describes the idea (or uploads existing media directly, skipping generation).
2. The API route (`/api/social/posts/generate` or `/upload`) creates one `social_posts` row per selected platform, all `status = 'generating'` (or `'draft'` immediately for uploads), sharing the same `idea_prompt`/`generation_inputs`.
3. For AI generation, one Inngest event fires; the shared pipeline produces one `media_asset_id`, which every row points to, and one caption-metadata AI call whose output is deterministically reformatted per platform (`formatPlatformCaptions` — character budgets and per-platform structure ported from the proven legacy formatter, not re-invented).
4. Each row moves to `status = 'draft'` once ready for review. The user reviews, edits if needed, and clicks "Publish" — `/api/social/posts/publish` calls that connection's real platform API with that row's caption + the shared media.
5. Each row updates independently to `published` or `failed` — one platform's failure doesn't block or roll back the others.

## What's ported from the legacy n8n workflows vs. rebuilt
The legacy project (`projects/meta/src/app/SocialDash.tsx` + `workflows/Toga Social media Images posts.json` / `Toga Social media video creation.json`) never called an AI provider directly — 100% of generation was delegated to n8n webhooks, and actual publishing went through a third-party aggregator (upload-post.com) rather than direct platform APIs. This rebuild ports the **proven prompt content** (the caption/metadata prompt, the platform character-budget formatter, the 4-act SAD → MEET BUSINESS → JOURNEY → HAPPY video story structure) genericized for any business, but replaces the SaaS-aggregator publishing step with direct OAuth + direct platform API calls (`src/services/social/*.ts`), and replaces the single 3,000-line UI component with a modular, original composer.
