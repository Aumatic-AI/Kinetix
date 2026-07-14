# Kinetix — Database Architecture & Data Flows

This document outlines the database architecture for Kinetix. It is a highly optimized, 14-table schema built to handle Meta Ads, Social Media publishing, and AI-driven ad intelligence at scale.

## Complete Database Schema Overview

The following diagram provides a bird's-eye view of all 14 tables in the system and how they connect to one another. 
> *Note: For readability, only the Primary Keys (PK) and Foreign Keys (FK) are shown in this global view. See the individual sections below for full table schemas.*

```mermaid
erDiagram
    %% Core Users & Businesses
    users ||--o{ business_users : "joins"
    businesses ||--o{ business_users : "has"
    businesses ||--o{ api_credentials : "configures"

    %% Platform & Media
    businesses ||--o{ platform_connections : "connects to"
    businesses ||--o{ media_assets : "owns"

    %% Intelligence
    businesses ||--o{ ad_analysis_reports : "generates"

    %% Meta Ads Module
    businesses ||--o{ meta_ad_creatives : "generates"
    meta_ad_creatives ||--o{ media_assets : "uses (media_asset_id)"
    
    businesses ||--o{ campaigns : "runs"
    platform_connections ||--o{ campaigns : "hosts (ad_account_id, page_id)"
    
    campaigns ||--o{ ad_sets : "contains"
    ad_sets ||--o{ ads : "places"
    meta_ad_creatives ||--o{ ads : "used in (creative_id)"

    %% Leads & Performance
    businesses ||--o{ leads : "receives"
    ads ||--o{ ad_performance_daily : "measured by"

    %% Social Media Module
    businesses ||--o{ social_posts : "creates"
    media_assets ||--o{ social_posts : "uses (media_asset_id)"
    platform_connections ||--o{ social_posts : "published to"

    %% Table Definitions (Keys Only)
    users { uuid id PK }
    businesses { uuid id PK }
    business_users { uuid business_id FK uuid user_id FK }
    api_credentials { uuid id PK uuid business_id FK }
    
    platform_connections { uuid id PK uuid business_id FK }
    media_assets { uuid id PK uuid business_id FK }
    
    ad_analysis_reports { uuid id PK uuid business_id FK }
    
    meta_ad_creatives { uuid id PK uuid business_id FK uuid media_asset_id FK }
    campaigns { uuid id PK uuid business_id FK uuid ad_account_id FK uuid page_connection_id FK }
    ad_sets { uuid id PK uuid campaign_id FK }
    ads { uuid id PK uuid ad_set_id FK uuid creative_id FK }
    
    leads { uuid id PK uuid business_id FK }
    ad_performance_daily { uuid id PK uuid ad_id FK }
    
    social_posts { uuid id PK uuid business_id FK uuid connection_id FK uuid media_asset_id FK }
```

---

## High-Level System Architecture

```mermaid
graph TB
    Client["Next.js Frontend"] --> API["API Routes"]
    API --> Services["Service Layer"]
    Services --> Supabase["Supabase DB + Auth + Storage"]
    Services --> Inngest["Inngest Background Jobs"]
    Services --> AI["AI Orchestrator"]
    AI --> OpenAI["OpenAI"]
    AI --> Kie["Kie AI"]
    AI --> ElevenLabs["ElevenLabs"]
    Inngest --> MetaAPI["Meta Graph API"]
    Inngest --> Apify["Apify Scraper"]
    Inngest --> Supabase
```

---

## 1. Core Users & Businesses

The platform is multi-tenant at the **Business** level. Users can belong to multiple businesses. All API credentials (OpenAI, Apify, etc.) are stored at the business level.

```mermaid
erDiagram
    users ||--o{ business_users : "joins"
    businesses ||--o{ business_users : "has"
    businesses ||--o{ api_credentials : "configures"

    users {
        uuid id PK "Mirrors auth.users"
        citext email
        text display_name
        timestamptz created_at
    }

    businesses {
        uuid id PK
        text name
        text website
        text industry
        text voice_guidelines "How AI writes for this business"
        text value_proposition "Core offering"
        jsonb target_markets "e.g. ['CA', 'US']"
        jsonb competitor_keywords "e.g. ['hair transplant turkey']"
        jsonb settings "General UI/App settings (timezone, toggles)"
        timestamptz created_at
    }

    business_users {
        uuid business_id FK
        uuid user_id FK
        text role "owner, admin"
        timestamptz joined_at
    }

    api_credentials {
        uuid id PK
        uuid business_id FK
        text provider "openai, apify, elevenlabs, kie"
        text secret_vault_ref "Supabase Vault secret ID"
        boolean is_active
        timestamptz created_at
    }
```

---

## 2. Media Library & Platform Connections

A unified media library holds all generated and uploaded assets. Platform connections store OAuth tokens for Meta, TikTok, etc., securely linking to Supabase Vault.

```mermaid
erDiagram
    businesses ||--o{ media_assets : "owns"
    businesses ||--o{ platform_connections : "connects to"

    media_assets {
        uuid id PK
        uuid business_id FK
        text kind "image, video"
        text storage_path "Supabase Storage path"
        text public_url "CDN URL"
        timestamptz created_at
    }

    platform_connections {
        uuid id PK
        uuid business_id FK
        text platform "meta, tiktok, linkedin, youtube"
        text connection_type "page, ad_account, profile"
        text external_id "Platform's own ID"
        text access_token_vault_ref "Supabase Vault ref"
        jsonb metadata "pixel_id, etc."
        timestamptz created_at
    }
```

---

## 3. Meta Ads Module

This schema strictly mirrors Meta's API structure (Campaigns → Ad Sets → Ads). 
**Note:** `meta_ad_creatives` is separate from `ads`. A creative is what the AI generates (the media + copy). An `ad` is the object on Meta that combines the creative with targeting.

```mermaid
erDiagram
    businesses ||--o{ campaigns : "runs"
    campaigns ||--o{ ad_sets : "contains"
    ad_sets ||--o{ ads : "places"
    businesses ||--o{ meta_ad_creatives : "generates"
    meta_ad_creatives ||--o{ ads : "used in"

    meta_ad_creatives {
        uuid id PK
        uuid business_id FK
        text status "generating, review, approved, failed"
        text format "video, image"
        text idea_prompt "User's original idea"
        jsonb ad_copy "headline, primary_text, description, cta_type"
        jsonb generation_inputs "duration, video_style, voice_id"
        uuid media_asset_id FK "Points to final video/image"
        jsonb revision_history "Stores old media IDs for Undo functionality"
        timestamptz created_at
    }

    campaigns {
        uuid id PK
        uuid business_id FK
        uuid ad_account_id FK "Points to platform_connections"
        text name
        text objective "OUTCOME_TRAFFIC, OUTCOME_LEADS, etc."
        text budget_strategy "CBO or AdSet"
        text status "active, paused, etc."
        text meta_campaign_id "If NULL, we create new. If present, we append."
        timestamptz created_at
    }

    ad_sets {
        uuid id PK
        uuid campaign_id FK
        text name
        text meta_adset_id
        jsonb targeting "geo, age, gender"
        integer budget_amount_cents
        text status
        timestamptz created_at
    }

    ads {
        uuid id PK
        uuid ad_set_id FK
        uuid creative_id FK
        text meta_ad_id
        text status
        timestamptz created_at
    }
```

---

## 4. Leads & Performance Metrics (For AI Storage)

We store leads permanently because Meta deletes them after 90 days. We store a daily snapshot of metrics strictly for the AI to analyze historical trends without hitting Meta API rate limits. (The frontend dashboard will still fetch live data directly from Meta).

```mermaid
erDiagram
    businesses ||--o{ leads : "receives"
    ads ||--o{ ad_performance_daily : "measured by"

    leads {
        uuid id PK
        uuid business_id FK
        text meta_lead_id "From Meta Webhook"
        text meta_form_id
        text campaign_name
        text adset_name
        text ad_name
        jsonb field_data "Answers to questions (Name, Email, etc.)"
        timestamptz created_at "Saved permanently"
    }

    ad_performance_daily {
        uuid id PK
        uuid ad_id FK
        date snapshot_date
        numeric spend_cents
        integer impressions
        integer clicks
        numeric roas
        numeric cpa
        timestamptz captured_at
    }
```

---

## 5. Ad Analysis Engine

No raw competitor ads are stored. The scraper feeds JSON directly into the AI, and we only save the final, massive analytical report.

```mermaid
erDiagram
    businesses ||--o{ ad_analysis_reports : "generates"

    ad_analysis_reports {
        uuid id PK
        uuid business_id FK
        text report_type "competitor_analysis, self_ad_analysis"
        text analysis_content "Markdown/JSON containing the full analysis and directives"
        timestamptz generated_at
    }
```

---

## 6. Social Media Module

Has its own table for inputs, but behind the scenes, Inngest runs the exact same video/image generation pipeline as Meta Ads.

```mermaid
erDiagram
    businesses ||--o{ social_posts : "creates"

    social_posts {
        uuid id PK
        uuid business_id FK
        text status "generating, review, approved, scheduled, published"
        text format "video, image"
        text idea_prompt "Social-specific prompt"
        jsonb social_captions "Different captions for TikTok vs IG"
        jsonb generation_inputs "Social-specific video lengths, styles"
        uuid media_asset_id FK "Points to final video/image"
        timestamptz scheduled_at
        timestamptz published_at
    }
```

---

## 7. Background Jobs (Inngest) Overview

1. `scrape-and-analyze-competitors` (Weekly: Apify -> AI -> saves to `ad_analysis_reports`)
2. `poll-daily-metrics` (Daily: Meta Insights -> saves to `ad_performance_daily` for AI use)
3. `analyze-self-performance` (Weekly: Reads `ad_performance_daily` -> AI -> saves to `ad_analysis_reports`)
4. `generate-meta-creative` (Event: runs video/image pipeline -> updates `meta_ad_creatives`)
5. `generate-social-post` (Event: reuses same pipeline code -> updates `social_posts`)
6. `deploy-meta-campaign` (Event: pushes structure to Meta API)
7. `meta-lead-webhook` (Event: receives real-time lead -> saves to `leads`)

---

## 8. Core Feature Data Flows

### A. Ad Generation & Refinement Flow

#### Step 1: User requests a new Ad
We insert a new row into `meta_ad_creatives` with status `generating`. An Inngest job is triggered.
```json
{
  "id": "c1a...",
  "business_id": "b1...",
  "status": "generating",
  "format": "video",
  "idea_prompt": "Create an ad for our Summer Sale on hair transplants.",
  "ad_copy": null,
  "media_asset_id": null,
  "revision_history": []
}
```

#### Step 2: AI Finishes Generation
We save the video to `media_assets`. We update `meta_ad_creatives` with the copy and link the video. Status changes to `review`.
```json
{
  "status": "review",
  "ad_copy": {
    "headline": "Summer Sale: 50% Off",
    "primary_text": "Get your confidence back this summer..."
  },
  "media_asset_id": "media-v1" 
}
```

#### Step 3: User Refines the Ad Media (Quick Edit)
The user selects **"Quick Edit"** and types: *"Change his shirt to blue"*.
We snapshot the old video ID into `revision_history` (for Undo). We send the *existing* video (`media-v1`) to an AI Video-to-Video model. We save the result as `media-v2` and update the row.
```json
{
  "status": "review", 
  "media_asset_id": "media-v2", 
  "revision_history": [
    {
      "action": "Quick Edit: Change his shirt to blue",
      "previous_media_id": "media-v1", 
      "previous_ad_copy": { "headline": "Summer Sale: 50% Off" },
      "timestamp": "2026-07-14T10:00:00Z"
    }
  ]
}
```

### B. Campaign Launch Flow

#### Case 1: Creating a Brand New Campaign
We call the Meta API, create everything, and save the structure to our DB. `meta_campaign_id` is populated.
```json
// campaigns table
{
  "name": "Summer Blowout 2026",
  "objective": "OUTCOME_TRAFFIC",
  "budget_strategy": "CBO",
  "budget_amount_cents": 5000, 
  "meta_campaign_id": "1234567890" 
}

// ad_sets table
{
  "name": "Broad Audience - Men",
  "targeting": { "gender": [1], "age_min": 25, "age_max": 45 },
  "meta_adset_id": "9876543210" 
}

// ads table
{
  "creative_id": "c1a...", 
  "meta_ad_id": "1122334455" 
}
```

#### Case 2: Appending to an Existing Meta Campaign
We only create a new Ad Set and Ad on Meta. In our DB, we save the `campaigns` row but we set `meta_campaign_id` to that existing ID. 
```json
// campaigns table
{
  "name": "Always On - Retargeting", 
  "meta_campaign_id": "555555555" // ID of the pre-existing campaign
}
```

### C. Social Media Flow

The user posts a video to TikTok and Instagram. We insert into `social_posts`. The Inngest job runs the exact same AI video generation pipeline as Meta Ads, but tailors captions for social.
```json
{
  "status": "scheduled",
  "format": "video",
  "social_captions": {
    "tiktok": "Wait until the end... 😱 #clinic #bts",
    "instagram": "A day in the life at our clinic! Book a consult today. ✨"
  },
  "media_asset_id": "m9z...", 
  "scheduled_at": "2026-07-20T10:00:00Z"
}
```

### D. Ad Analysis Flow (Competitor + Self)

#### The Competitor Analysis (Weekly)
Apify runs and returns a massive JSON array of 200 ads. We DO NOT save the 200 ads to the DB. We send that massive JSON directly to the AI, and save only the final, intelligent output.
```json
{
  "report_type": "competitor_analysis",
  "analysis_content": {
    "executive_summary": "Competitors are heavily using user-generated content (UGC)...",
    "top_hooks": ["Are you tired of hair loss?", "I tried 3 clinics..."],
    "action_plan": "Shift away from cinematic videos; test selfie-style UGC."
  }
}
```

#### The Self Analysis (Weekly)
The AI job reads the `ad_performance_daily` table for the last 7 days, looks for trends, and generates a report focused on your ads.
```json
{
  "report_type": "self_ad_analysis",
  "analysis_content": {
    "performance_summary": "Overall ROAS is up 5%.",
    "winning_ads": ["Summer Sale - Video 2"],
    "recommendations": "Pause the Image 1 ad. Scale budget on Video 2."
  }
}
```
