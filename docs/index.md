# Kinetix Documentation Overview

Welcome to the **Kinetix** documentation. Kinetix is a single-tenant Marketing Automation Platform, consolidating several previously-separate n8n + Next.js projects built for one client into one codebase, one Postgres schema, and one background-job runner (Inngest replacing n8n). The schema is multi-tenant-shaped (a `businesses` + `business_users` model) but runs with exactly **one** `businesses` row today — there is one client. A second client later needs new rows, not a new schema (see `architecture/system_design.md` §3).

**Built and active today:** Meta Ads, Social Media, and Outreach.

1. **Meta Ads Automation:** AI-driven generation, launching, and analysis of Meta (Facebook/Instagram) advertising campaigns. *(active)*
2. **Social Media Management:** Multi-platform (TikTok, LinkedIn, YouTube, Meta, X) content generation, scheduling, and publishing. *(active)*
3. **Outreach & Lead Gen:** Apify-based lead scraping into lists, AI-drafted cold email campaigns sent through Instantly.ai, and live delivery analytics. *(active)*

## Tech Stack
Kinetix is built on a modern serverless stack:
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4
- **Backend & API:** Next.js Server Actions & API Routes
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security, Supabase Auth)
- **Background Jobs:** Inngest (event-driven, replacing the legacy projects' n8n workflows)
- **AI & Media:** OpenAI (scripting/logic), Kie AI (image/video generation), ElevenLabs (voice), AssemblyAI (caption timing), FFmpeg (final assembly)
- **Scraping:** Apify (competitor ad intelligence *and* outreach lead scraping) — analyzed via direct LLM prompting, not a vector database/RAG
- **Outreach delivery:** Instantly.ai (cold email sending, opens/replies/clicks analytics)

## Directory Structure
To understand the system deeply without scanning source code, refer to the following documentation modules:

### 1. Architecture
- [`architecture/database_schema.md`](architecture/database_schema.md) — Every table and relationship, verified column-by-column against `supabase/migrations/`.
- [`architecture/system_design.md`](architecture/system_design.md) — How Next.js, Supabase, and Inngest communicate securely, and how the multi-tenant-shaped schema runs single-tenant today.

### 2. Core Modules
- [`modules/meta_ads.md`](modules/meta_ads.md) — Campaign creation, ad sets, Meta Graph API integration.
- [`modules/social_media.md`](modules/social_media.md) — Platform OAuth integrations and publishing logic.
- [`modules/outreach.md`](modules/outreach.md) — Lead lists, scraping, AI campaign drafting, and Instantly.ai sending.

### 3. Design
- [`../DESIGN.md`](../DESIGN.md) — The UI design system: color/spacing/radius tokens, component specs, and rules for building consistent UI. Always loaded into Claude Code's context via `CLAUDE.md`'s `@DESIGN.md` import.

---
*Note for AI Agents: Read these documentation files to understand the Kinetix project state and design patterns instead of parsing massive codebase folders. If something here contradicts the actual code, trust the code and flag the doc as stale — these are meant to be kept current, not aspirational.*
