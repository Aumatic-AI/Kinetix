# Kinetix Documentation Overview

Welcome to the **Kinetix** documentation. Kinetix is a Marketing Automation Platform, consolidating four previously-separate n8n + Next.js projects (Meta Ads, Social Media Dashboard, Newsletter, Outreach) built for one client into one codebase, one Postgres schema, and one background-job runner (Inngest replacing n8n). The schema is multi-tenant-shaped (a `businesses` + `business_users` model, exactly 14 tables) but runs with exactly **one** `businesses` row today — there is one client. A second client later needs new rows, not a new schema (see `architecture/system_design.md` §3).

**Active development now:** Meta Ads and Social Media. **Deferred** (schema and/or module design intentionally not built yet): Newsletter, Outreach, and Voice — see their module docs for what's carried over from the legacy projects and what's still an open question.

1. **Meta Ads Automation:** AI-driven generation, launching, and analysis of Meta (Facebook/Instagram) advertising campaigns. *(active)*
2. **Social Media Management:** Multi-platform (TikTok, LinkedIn, YouTube, Meta, X) content generation, scheduling, and publishing. *(active)*
3. **Newsletter Automation:** Automated email newsletter creation and distribution based on business updates and AI curation. *(deferred)*
4. **Outreach & Lead Gen:** Cold outreach automation and lead tracking pipelines. *(deferred)*
5. **Voice Agent Calling:** AI-driven inbound/outbound phone calls. *(deferred — carried over from the legacy Newsletter project, not part of the original four pillars but real and planned)*

## Tech Stack
Kinetix is built on a modern serverless stack:
- **Frontend:** Next.js (App Router), React, Tailwind CSS, Shadcn UI
- **Backend & API:** Next.js Server Actions & API Routes
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security, Supabase Auth, Supabase Vault for secrets)
- **Background Jobs:** Inngest (event-driven, replacing the legacy projects' n8n workflows)
- **AI & Media:** OpenAI (scripting/logic), Kie AI (image/video generation), ElevenLabs (voice), AssemblyAI (caption timing), FFmpeg (final assembly)
- **Scraping:** Apify (competitor intelligence) — analyzed via direct LLM prompting, not a vector database/RAG

## Directory Structure
To understand the system deeply without scanning source code, refer to the following documentation modules:

### 1. Architecture
- [`architecture/database_schema.md`](architecture/database_schema.md) - The finalized, exactly-14-table schema for Meta Ads + Social Media. Migrated and live in `supabase/migrations/`.
- [`architecture/system_design.md`](architecture/system_design.md) - How Next.js, Supabase, and Inngest communicate securely, and how the multi-tenant-shaped schema runs single-tenant today.

### 2. Core Modules
- [`modules/meta_ads.md`](modules/meta_ads.md) - Campaign creation, ad sets, Meta Graph API integration.
- [`modules/social_media.md`](modules/social_media.md) - Platform OAuth integrations and publishing logic.
- [`modules/newsletter.md`](modules/newsletter.md) - Email template generation and dispatch architecture. *(deferred)*
- [`modules/outreach.md`](modules/outreach.md) - Cold outreach sequencing and lead tracking. *(deferred)*
- [`modules/voice.md`](modules/voice.md) - AI voice-call agent, carried over from the legacy project. *(deferred)*

### 3. AI & Pipelines
- [`ai_pipelines/media_generation.md`](ai_pipelines/media_generation.md) - The step-by-step Inngest workflow for text-to-video and text-to-image generation, shared by Meta Ads and Social Media.
- [`ai_pipelines/intelligence_engine.md`](ai_pipelines/intelligence_engine.md) - Weekly competitor scraping (Apify) and self-ad performance analysis (OpenAI), both fully automatic and both feeding generation.

---
*Note for AI Agents: Read these documentation files to understand the Kinetix project state and design patterns instead of parsing massive codebase folders.*
