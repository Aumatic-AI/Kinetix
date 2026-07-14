export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ad_analyses: {
        Row: {
          brand_id: string
          created_at: string
          findings: Json
          id: string
          model_used: string | null
          scrape_job_id: string | null
          summary: string | null
          title: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          findings?: Json
          id?: string
          model_used?: string | null
          scrape_job_id?: string | null
          summary?: string | null
          title?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          findings?: Json
          id?: string
          model_used?: string | null
          scrape_job_id?: string | null
          summary?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_analyses_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_analyses_scrape_job_id_fkey"
            columns: ["scrape_job_id"]
            isOneToOne: false
            referencedRelation: "scrape_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_analysis_sources: {
        Row: {
          analysis_id: string
          competitor_ad_id: string
        }
        Insert: {
          analysis_id: string
          competitor_ad_id: string
        }
        Update: {
          analysis_id?: string
          competitor_ad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_analysis_sources_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "ad_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_analysis_sources_competitor_ad_id_fkey"
            columns: ["competitor_ad_id"]
            isOneToOne: false
            referencedRelation: "competitor_ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_campaigns: {
        Row: {
          brand_id: string
          connected_account_id: string | null
          created_at: string
          currency: string
          daily_budget_cents: number | null
          end_at: string | null
          external_campaign_id: string | null
          id: string
          lifetime_budget_cents: number | null
          name: string
          objective: string | null
          start_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string
        }
        Insert: {
          brand_id: string
          connected_account_id?: string | null
          created_at?: string
          currency?: string
          daily_budget_cents?: number | null
          end_at?: string | null
          external_campaign_id?: string | null
          id?: string
          lifetime_budget_cents?: number | null
          name: string
          objective?: string | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Update: {
          brand_id?: string
          connected_account_id?: string | null
          created_at?: string
          currency?: string
          daily_budget_cents?: number | null
          end_at?: string | null
          external_campaign_id?: string | null
          id?: string
          lifetime_budget_cents?: number | null
          name?: string
          objective?: string | null
          start_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaigns_connected_account_id_fkey"
            columns: ["connected_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_creative_assets: {
        Row: {
          asset_id: string
          creative_id: string
          position: number
        }
        Insert: {
          asset_id: string
          creative_id: string
          position?: number
        }
        Update: {
          asset_id?: string
          creative_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_creative_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_creative_assets_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "ad_creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_creatives: {
        Row: {
          analysis_id: string | null
          brand_id: string
          created_at: string
          created_by: string | null
          cta_text: string | null
          description: string | null
          generation_job_id: string | null
          headline: string | null
          id: string
          inspired_by_ad_id: string | null
          landing_url: string | null
          name: string
          primary_text: string | null
          status: Database["public"]["Enums"]["creative_status"]
          updated_at: string
        }
        Insert: {
          analysis_id?: string | null
          brand_id: string
          created_at?: string
          created_by?: string | null
          cta_text?: string | null
          description?: string | null
          generation_job_id?: string | null
          headline?: string | null
          id?: string
          inspired_by_ad_id?: string | null
          landing_url?: string | null
          name: string
          primary_text?: string | null
          status?: Database["public"]["Enums"]["creative_status"]
          updated_at?: string
        }
        Update: {
          analysis_id?: string | null
          brand_id?: string
          created_at?: string
          created_by?: string | null
          cta_text?: string | null
          description?: string | null
          generation_job_id?: string | null
          headline?: string | null
          id?: string
          inspired_by_ad_id?: string | null
          landing_url?: string | null
          name?: string
          primary_text?: string | null
          status?: Database["public"]["Enums"]["creative_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_creatives_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "ad_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_creatives_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_creatives_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_creatives_generation_job_id_fkey"
            columns: ["generation_job_id"]
            isOneToOne: false
            referencedRelation: "generation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_creatives_inspired_by_ad_id_fkey"
            columns: ["inspired_by_ad_id"]
            isOneToOne: false
            referencedRelation: "competitor_ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_metrics_daily: {
        Row: {
          ad_id: string
          clicks: number
          conversions: number
          cpc_cents: number | null
          cpm_cents: number | null
          ctr: number | null
          id: number
          impressions: number
          metric_date: string
          raw_data: Json
          reach: number
          spend_cents: number
        }
        Insert: {
          ad_id: string
          clicks?: number
          conversions?: number
          cpc_cents?: number | null
          cpm_cents?: number | null
          ctr?: number | null
          id?: never
          impressions?: number
          metric_date: string
          raw_data?: Json
          reach?: number
          spend_cents?: number
        }
        Update: {
          ad_id?: string
          clicks?: number
          conversions?: number
          cpc_cents?: number | null
          cpm_cents?: number | null
          ctr?: number | null
          id?: never
          impressions?: number
          metric_date?: string
          raw_data?: Json
          reach?: number
          spend_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_metrics_daily_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_sets: {
        Row: {
          bid_strategy: string | null
          campaign_id: string
          created_at: string
          daily_budget_cents: number | null
          end_at: string | null
          external_adset_id: string | null
          id: string
          name: string
          optimization_goal: string | null
          placements: Json
          start_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          targeting: Json
        }
        Insert: {
          bid_strategy?: string | null
          campaign_id: string
          created_at?: string
          daily_budget_cents?: number | null
          end_at?: string | null
          external_adset_id?: string | null
          id?: string
          name: string
          optimization_goal?: string | null
          placements?: Json
          start_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          targeting?: Json
        }
        Update: {
          bid_strategy?: string | null
          campaign_id?: string
          created_at?: string
          daily_budget_cents?: number | null
          end_at?: string | null
          external_adset_id?: string | null
          id?: string
          name?: string
          optimization_goal?: string | null
          placements?: Json
          start_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          targeting?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ad_sets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          ad_set_id: string
          created_at: string
          creative_id: string | null
          external_ad_id: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["campaign_status"]
        }
        Insert: {
          ad_set_id: string
          created_at?: string
          creative_id?: string | null
          external_ad_id?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["campaign_status"]
        }
        Update: {
          ad_set_id?: string
          created_at?: string
          creative_id?: string | null
          external_ad_id?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["campaign_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ads_ad_set_id_fkey"
            columns: ["ad_set_id"]
            isOneToOne: false
            referencedRelation: "ad_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "ad_creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string | null
          id: number
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: never
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: never
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          brand_colors: Json
          brand_voice: string | null
          competitor_keywords: Json | null
          core_offerings: string | null
          created_at: string
          description: string | null
          guidelines: Json
          id: string
          industry: string | null
          keywords: string[]
          logo_asset_id: string | null
          name: string
          target_audience: string | null
          target_countries: Json | null
          tone_of_voice: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          brand_colors?: Json
          brand_voice?: string | null
          competitor_keywords?: Json | null
          core_offerings?: string | null
          created_at?: string
          description?: string | null
          guidelines?: Json
          id?: string
          industry?: string | null
          keywords?: string[]
          logo_asset_id?: string | null
          name: string
          target_audience?: string | null
          target_countries?: Json | null
          tone_of_voice?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          brand_colors?: Json
          brand_voice?: string | null
          competitor_keywords?: Json | null
          core_offerings?: string | null
          created_at?: string
          description?: string | null
          guidelines?: Json
          id?: string
          industry?: string | null
          keywords?: string[]
          logo_asset_id?: string | null
          name?: string
          target_audience?: string | null
          target_countries?: Json | null
          tone_of_voice?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_brands_logo"
            columns: ["logo_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_ads: {
        Row: {
          body_text: string | null
          competitor_id: string
          creative_urls: string[]
          cta_text: string | null
          external_ad_id: string | null
          format: string | null
          headline: string | null
          id: string
          is_active: boolean | null
          landing_url: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          raw_data: Json
          scrape_job_id: string
          scraped_at: string
          started_running_at: string | null
        }
        Insert: {
          body_text?: string | null
          competitor_id: string
          creative_urls?: string[]
          cta_text?: string | null
          external_ad_id?: string | null
          format?: string | null
          headline?: string | null
          id?: string
          is_active?: boolean | null
          landing_url?: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          raw_data?: Json
          scrape_job_id: string
          scraped_at?: string
          started_running_at?: string | null
        }
        Update: {
          body_text?: string | null
          competitor_id?: string
          creative_urls?: string[]
          cta_text?: string | null
          external_ad_id?: string | null
          format?: string | null
          headline?: string | null
          id?: string
          is_active?: boolean | null
          landing_url?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          raw_data?: Json
          scrape_job_id?: string
          scraped_at?: string
          started_running_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_ads_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_ads_scrape_job_id_fkey"
            columns: ["scrape_job_id"]
            isOneToOne: false
            referencedRelation: "scrape_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          brand_id: string
          created_at: string
          handles: Json
          id: string
          is_active: boolean
          meta_page_id: string | null
          name: string
          notes: string | null
          website_url: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          handles?: Json
          id?: string
          is_active?: boolean
          meta_page_id?: string | null
          name: string
          notes?: string | null
          website_url?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          handles?: Json
          id?: string
          is_active?: boolean
          meta_page_id?: string | null
          name?: string
          notes?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitors_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      connected_accounts: {
        Row: {
          access_token_ref: string | null
          account_kind: string
          brand_id: string
          created_at: string
          display_name: string | null
          external_id: string
          id: string
          metadata: Json
          platform: Database["public"]["Enums"]["platform_type"]
          refresh_token_ref: string | null
          scopes: string[]
          status: Database["public"]["Enums"]["account_status"]
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_ref?: string | null
          account_kind: string
          brand_id: string
          created_at?: string
          display_name?: string | null
          external_id: string
          id?: string
          metadata?: Json
          platform: Database["public"]["Enums"]["platform_type"]
          refresh_token_ref?: string | null
          scopes?: string[]
          status?: Database["public"]["Enums"]["account_status"]
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_ref?: string | null
          account_kind?: string
          brand_id?: string
          created_at?: string
          display_name?: string | null
          external_id?: string
          id?: string
          metadata?: Json
          platform?: Database["public"]["Enums"]["platform_type"]
          refresh_token_ref?: string | null
          scopes?: string[]
          status?: Database["public"]["Enums"]["account_status"]
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connected_accounts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          email_id: string | null
          event_type: Database["public"]["Enums"]["email_event_type"]
          id: number
          metadata: Json
          occurred_at: string
          recipient_id: number | null
        }
        Insert: {
          email_id?: string | null
          event_type: Database["public"]["Enums"]["email_event_type"]
          id?: never
          metadata?: Json
          occurred_at?: string
          recipient_id?: number | null
        }
        Update: {
          email_id?: string | null
          event_type?: Database["public"]["Enums"]["email_event_type"]
          id?: never
          metadata?: Json
          occurred_at?: string
          recipient_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "outreach_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "newsletter_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_jobs: {
        Row: {
          brand_id: string
          cost_usd: number | null
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          input_params: Json
          model: string | null
          output: Json
          prompt: string | null
          provider: string | null
          requested_by: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          tokens_used: number | null
          type: Database["public"]["Enums"]["generation_type"]
        }
        Insert: {
          brand_id: string
          cost_usd?: number | null
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_params?: Json
          model?: string | null
          output?: Json
          prompt?: string | null
          provider?: string | null
          requested_by?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          tokens_used?: number | null
          type: Database["public"]["Enums"]["generation_type"]
        }
        Update: {
          brand_id?: string
          cost_usd?: number | null
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_params?: Json
          model?: string | null
          output?: Json
          prompt?: string | null
          provider?: string | null
          requested_by?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          tokens_used?: number | null
          type?: Database["public"]["Enums"]["generation_type"]
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_jobs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          max_attempts: number
          payload: Json
          priority: number
          run_at: string
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          type: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          max_attempts?: number
          payload?: Json
          priority?: number
          run_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          type: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          max_attempts?: number
          payload?: Json
          priority?: number
          run_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          type?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          brand_id: string
          bucket: string
          created_at: string
          duration_seconds: number | null
          generation_job_id: string | null
          height_px: number | null
          id: string
          metadata: Json
          mime_type: string | null
          size_bytes: number | null
          source: Database["public"]["Enums"]["asset_source"]
          storage_path: string
          thumbnail_path: string | null
          type: Database["public"]["Enums"]["asset_type"]
          width_px: number | null
        }
        Insert: {
          brand_id: string
          bucket?: string
          created_at?: string
          duration_seconds?: number | null
          generation_job_id?: string | null
          height_px?: number | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          size_bytes?: number | null
          source?: Database["public"]["Enums"]["asset_source"]
          storage_path: string
          thumbnail_path?: string | null
          type: Database["public"]["Enums"]["asset_type"]
          width_px?: number | null
        }
        Update: {
          brand_id?: string
          bucket?: string
          created_at?: string
          duration_seconds?: number | null
          generation_job_id?: string | null
          height_px?: number | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          size_bytes?: number | null
          source?: Database["public"]["Enums"]["asset_source"]
          storage_path?: string
          thumbnail_path?: string | null
          type?: Database["public"]["Enums"]["asset_type"]
          width_px?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_generation_job_id_fkey"
            columns: ["generation_job_id"]
            isOneToOne: false
            referencedRelation: "generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ad_creatives: {
        Row: {
          ad_script: Json | null
          audio_style: string | null
          brand_id: string
          character_type: string | null
          created_at: string
          duration: string | null
          id: string
          idea_prompt: string | null
          language: string | null
          media_urls: Json | null
          status: string | null
          type: string | null
          updated_at: string
          video_style: string | null
          voice_id: string | null
        }
        Insert: {
          ad_script?: Json | null
          audio_style?: string | null
          brand_id: string
          character_type?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          idea_prompt?: string | null
          language?: string | null
          media_urls?: Json | null
          status?: string | null
          type?: string | null
          updated_at?: string
          video_style?: string | null
          voice_id?: string | null
        }
        Update: {
          ad_script?: Json | null
          audio_style?: string | null
          brand_id?: string
          character_type?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          idea_prompt?: string | null
          language?: string | null
          media_urls?: Json | null
          status?: string | null
          type?: string | null
          updated_at?: string
          video_style?: string | null
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_ad_creatives_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ad_intelligence: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          insights: Json
          report_type: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          insights: Json
          report_type: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          insights?: Json
          report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_ad_intelligence_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_competitor_ads: {
        Row: {
          ad_text: string | null
          brand_id: string
          competitor_name: string
          emotional_angles: Json | null
          fingerprint: string
          first_seen_at: string
          format: string | null
          framework: string | null
          id: string
          is_active: boolean | null
          last_seen_at: string
          media_url: string | null
          score: number | null
          seen_count: number | null
        }
        Insert: {
          ad_text?: string | null
          brand_id: string
          competitor_name: string
          emotional_angles?: Json | null
          fingerprint: string
          first_seen_at?: string
          format?: string | null
          framework?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string
          media_url?: string | null
          score?: number | null
          seen_count?: number | null
        }
        Update: {
          ad_text?: string | null
          brand_id?: string
          competitor_name?: string
          emotional_angles?: Json | null
          fingerprint?: string
          first_seen_at?: string
          format?: string | null
          framework?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string
          media_url?: string | null
          score?: number | null
          seen_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_competitor_ads_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_self_ad_metrics: {
        Row: {
          brand_id: string
          clicks: number | null
          conversions: number | null
          date: string
          id: string
          impressions: number | null
          meta_ad_id: string
          spend: number | null
        }
        Insert: {
          brand_id: string
          clicks?: number | null
          conversions?: number | null
          date: string
          id?: string
          impressions?: number | null
          meta_ad_id: string
          spend?: number | null
        }
        Update: {
          brand_id?: string
          clicks?: number | null
          conversions?: number | null
          date?: string
          id?: string
          impressions?: number | null
          meta_ad_id?: string
          spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_self_ad_metrics_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_recipients: {
        Row: {
          bounced_at: string | null
          clicked_at: string | null
          delivered_at: string | null
          id: number
          opened_at: string | null
          provider_message_id: string | null
          send_id: string
          subscriber_id: string
          unsubscribed_at: string | null
        }
        Insert: {
          bounced_at?: string | null
          clicked_at?: string | null
          delivered_at?: string | null
          id?: never
          opened_at?: string | null
          provider_message_id?: string | null
          send_id: string
          subscriber_id: string
          unsubscribed_at?: string | null
        }
        Update: {
          bounced_at?: string | null
          clicked_at?: string | null
          delivered_at?: string | null
          id?: never
          opened_at?: string | null
          provider_message_id?: string | null
          send_id?: string
          subscriber_id?: string
          unsubscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_recipients_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "newsletter_sends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_recipients_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_sends: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          newsletter_id: string
          provider: string | null
          segment_filter: Json
          started_at: string | null
          total_recipients: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          newsletter_id: string
          provider?: string | null
          segment_filter?: Json
          started_at?: string | null
          total_recipients?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          newsletter_id?: string
          provider?: string | null
          segment_filter?: Json
          started_at?: string | null
          total_recipients?: number
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_sends_newsletter_id_fkey"
            columns: ["newsletter_id"]
            isOneToOne: false
            referencedRelation: "newsletters"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletters: {
        Row: {
          brand_id: string
          content_html: string | null
          content_markdown: string | null
          created_at: string
          created_by: string | null
          generation_job_id: string | null
          id: string
          preview_text: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["newsletter_status"]
          subject_line: string | null
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          brand_id: string
          content_html?: string | null
          content_markdown?: string | null
          created_at?: string
          created_by?: string | null
          generation_job_id?: string | null
          id?: string
          preview_text?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["newsletter_status"]
          subject_line?: string | null
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          brand_id?: string
          content_html?: string | null
          content_markdown?: string | null
          created_at?: string
          created_by?: string | null
          generation_job_id?: string | null
          id?: string
          preview_text?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["newsletter_status"]
          subject_line?: string | null
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletters_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletters_generation_job_id_fkey"
            columns: ["generation_job_id"]
            isOneToOne: false
            referencedRelation: "generation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_campaigns: {
        Row: {
          brand_id: string
          created_at: string
          created_by: string | null
          daily_send_limit: number
          from_email: string | null
          from_name: string | null
          goal: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          created_by?: string | null
          daily_send_limit?: number
          from_email?: string | null
          from_name?: string | null
          goal?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          created_by?: string | null
          daily_send_limit?: number
          from_email?: string | null
          from_name?: string | null
          goal?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_contacts: {
        Row: {
          brand_id: string
          company: string | null
          created_at: string
          email: string
          enrichment: Json
          full_name: string | null
          id: string
          job_title: string | null
          linkedin_url: string | null
          source: string | null
          status: Database["public"]["Enums"]["contact_status"]
          updated_at: string
        }
        Insert: {
          brand_id: string
          company?: string | null
          created_at?: string
          email: string
          enrichment?: Json
          full_name?: string | null
          id?: string
          job_title?: string | null
          linkedin_url?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          updated_at?: string
        }
        Update: {
          brand_id?: string
          company?: string | null
          created_at?: string
          email?: string
          enrichment?: Json
          full_name?: string | null
          id?: string
          job_title?: string | null
          linkedin_url?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_contacts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_emails: {
        Row: {
          body: string | null
          created_at: string
          enrollment_id: string
          generation_job_id: string | null
          id: string
          provider_message_id: string | null
          scheduled_at: string | null
          sent_at: string | null
          step_id: string | null
          subject: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          enrollment_id: string
          generation_job_id?: string | null
          id?: string
          provider_message_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          step_id?: string | null
          subject?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          enrollment_id?: string
          generation_job_id?: string | null
          id?: string
          provider_message_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          step_id?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_emails_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "outreach_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_emails_generation_job_id_fkey"
            columns: ["generation_job_id"]
            isOneToOne: false
            referencedRelation: "generation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_emails_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "outreach_sequence_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_enrollments: {
        Row: {
          campaign_id: string
          contact_id: string
          current_step: number
          enrolled_at: string
          id: string
          is_completed: boolean
          stopped_reason: string | null
        }
        Insert: {
          campaign_id: string
          contact_id: string
          current_step?: number
          enrolled_at?: string
          id?: string
          is_completed?: boolean
          stopped_reason?: string | null
        }
        Update: {
          campaign_id?: string
          contact_id?: string
          current_step?: number
          enrolled_at?: string
          id?: string
          is_completed?: boolean
          stopped_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_enrollments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_sequence_steps: {
        Row: {
          body_template: string | null
          campaign_id: string
          delay_days: number
          id: string
          step_number: number
          stop_on_reply: boolean
          subject_template: string | null
        }
        Insert: {
          body_template?: string | null
          campaign_id: string
          delay_days?: number
          id?: string
          step_number: number
          stop_on_reply?: boolean
          subject_template?: string | null
        }
        Update: {
          body_template?: string | null
          campaign_id?: string
          delay_days?: number
          id?: string
          step_number?: number
          stop_on_reply?: boolean
          subject_template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_sequence_steps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      post_assets: {
        Row: {
          asset_id: string
          position: number
          post_id: string
        }
        Insert: {
          asset_id: string
          position?: number
          post_id: string
        }
        Update: {
          asset_id?: string
          position?: number
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_assets_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_metric_snapshots: {
        Row: {
          captured_at: string
          clicks: number
          comments: number
          id: number
          impressions: number
          likes: number
          post_id: string
          raw_data: Json
          reach: number
          saves: number
          shares: number
          video_views: number
        }
        Insert: {
          captured_at?: string
          clicks?: number
          comments?: number
          id?: never
          impressions?: number
          likes?: number
          post_id: string
          raw_data?: Json
          reach?: number
          saves?: number
          shares?: number
          video_views?: number
        }
        Update: {
          captured_at?: string
          clicks?: number
          comments?: number
          id?: never
          impressions?: number
          likes?: number
          post_id?: string
          raw_data?: Json
          reach?: number
          saves?: number
          shares?: number
          video_views?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_metric_snapshots_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          brand_id: string
          caption: string | null
          connected_account_id: string
          created_at: string
          created_by: string | null
          creative_id: string | null
          error_message: string | null
          external_post_id: string | null
          hashtags: string[]
          id: string
          permalink: string | null
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["post_status"]
          updated_at: string
        }
        Insert: {
          brand_id: string
          caption?: string | null
          connected_account_id: string
          created_at?: string
          created_by?: string | null
          creative_id?: string | null
          error_message?: string | null
          external_post_id?: string | null
          hashtags?: string[]
          id?: string
          permalink?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string
        }
        Update: {
          brand_id?: string
          caption?: string | null
          connected_account_id?: string
          created_at?: string
          created_by?: string | null
          creative_id?: string | null
          error_message?: string | null
          external_post_id?: string | null
          hashtags?: string[]
          id?: string
          permalink?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_connected_account_id_fkey"
            columns: ["connected_account_id"]
            isOneToOne: false
            referencedRelation: "connected_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "ad_creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      provider_credentials: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          label: string
          provider: string
          secret_ref: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          provider: string
          secret_ref: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          provider?: string
          secret_ref?: string
        }
        Relationships: []
      }
      scrape_jobs: {
        Row: {
          actor_id: string | null
          ads_found: number
          apify_run_id: string | null
          brand_id: string
          competitor_id: string | null
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          input_params: Json
          source: string
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
        }
        Insert: {
          actor_id?: string | null
          ads_found?: number
          apify_run_id?: string | null
          brand_id: string
          competitor_id?: string | null
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_params?: Json
          source?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
        }
        Update: {
          actor_id?: string | null
          ads_found?: number
          apify_run_id?: string | null
          brand_id?: string
          competitor_id?: string | null
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          input_params?: Json
          source?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
        }
        Relationships: [
          {
            foreignKeyName: "scrape_jobs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrape_jobs_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          brand_id: string
          email: string
          full_name: string | null
          id: string
          metadata: Json
          source: string | null
          status: Database["public"]["Enums"]["subscriber_status"]
          subscribed_at: string
          tags: string[]
          unsubscribed_at: string | null
        }
        Insert: {
          brand_id: string
          email: string
          full_name?: string | null
          id?: string
          metadata?: Json
          source?: string | null
          status?: Database["public"]["Enums"]["subscriber_status"]
          subscribed_at?: string
          tags?: string[]
          unsubscribed_at?: string | null
        }
        Update: {
          brand_id?: string
          email?: string
          full_name?: string | null
          id?: string
          metadata?: Json
          source?: string | null
          status?: Database["public"]["Enums"]["subscriber_status"]
          subscribed_at?: string
          tags?: string[]
          unsubscribed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscribers_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      account_status: "connected" | "expired" | "revoked" | "error"
      asset_source: "ai_generated" | "uploaded" | "scraped"
      asset_type: "image" | "video" | "audio" | "document"
      campaign_status: "draft" | "active" | "paused" | "completed" | "archived"
      contact_status:
        | "new"
        | "contacted"
        | "replied"
        | "interested"
        | "not_interested"
        | "bounced"
        | "do_not_contact"
      creative_status:
        | "draft"
        | "in_review"
        | "approved"
        | "rejected"
        | "archived"
      email_event_type:
        | "sent"
        | "delivered"
        | "opened"
        | "clicked"
        | "replied"
        | "bounced"
        | "complained"
        | "unsubscribed"
      generation_type:
        | "ad_copy"
        | "image"
        | "video"
        | "newsletter"
        | "outreach_email"
        | "analysis"
      job_status: "queued" | "running" | "succeeded" | "failed" | "cancelled"
      newsletter_status:
        | "draft"
        | "generating"
        | "ready"
        | "scheduled"
        | "sending"
        | "sent"
        | "failed"
      platform_type:
        | "facebook"
        | "instagram"
        | "linkedin"
        | "x"
        | "tiktok"
        | "youtube"
        | "threads"
      post_status:
        | "draft"
        | "scheduled"
        | "publishing"
        | "published"
        | "failed"
        | "deleted"
      subscriber_status: "active" | "unsubscribed" | "bounced" | "complained"
      user_role: "admin" | "editor" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: ["connected", "expired", "revoked", "error"],
      asset_source: ["ai_generated", "uploaded", "scraped"],
      asset_type: ["image", "video", "audio", "document"],
      campaign_status: ["draft", "active", "paused", "completed", "archived"],
      contact_status: [
        "new",
        "contacted",
        "replied",
        "interested",
        "not_interested",
        "bounced",
        "do_not_contact",
      ],
      creative_status: [
        "draft",
        "in_review",
        "approved",
        "rejected",
        "archived",
      ],
      email_event_type: [
        "sent",
        "delivered",
        "opened",
        "clicked",
        "replied",
        "bounced",
        "complained",
        "unsubscribed",
      ],
      generation_type: [
        "ad_copy",
        "image",
        "video",
        "newsletter",
        "outreach_email",
        "analysis",
      ],
      job_status: ["queued", "running", "succeeded", "failed", "cancelled"],
      newsletter_status: [
        "draft",
        "generating",
        "ready",
        "scheduled",
        "sending",
        "sent",
        "failed",
      ],
      platform_type: [
        "facebook",
        "instagram",
        "linkedin",
        "x",
        "tiktok",
        "youtube",
        "threads",
      ],
      post_status: [
        "draft",
        "scheduled",
        "publishing",
        "published",
        "failed",
        "deleted",
      ],
      subscriber_status: ["active", "unsubscribed", "bounced", "complained"],
      user_role: ["admin", "editor", "viewer"],
    },
  },
} as const
