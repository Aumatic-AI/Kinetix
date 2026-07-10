export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'admin' | 'editor' | 'viewer'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'editor' | 'viewer'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'editor' | 'viewer'
          created_at?: string
          updated_at?: string
        }
      }
      // Stub for other tables: brands, connected_accounts, etc.
      brands: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: { id?: string; name: string }
        Update: { id?: string; name?: string }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'editor' | 'viewer'
      platform_type: 'facebook' | 'instagram' | 'linkedin' | 'x' | 'tiktok' | 'youtube' | 'threads'
      account_status: 'connected' | 'expired' | 'revoked' | 'error'
      job_status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
      generation_type: 'ad_copy' | 'image' | 'video' | 'newsletter' | 'outreach_email' | 'analysis'
      asset_type: 'image' | 'video' | 'audio' | 'document'
      asset_source: 'ai_generated' | 'uploaded' | 'scraped'
      creative_status: 'draft' | 'in_review' | 'approved' | 'rejected' | 'archived'
      post_status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'deleted'
      campaign_status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
      newsletter_status: 'draft' | 'generating' | 'ready' | 'scheduled' | 'sending' | 'sent' | 'failed'
      subscriber_status: 'active' | 'unsubscribed' | 'bounced' | 'complained'
      contact_status: 'new' | 'contacted' | 'replied' | 'interested' | 'not_interested' | 'bounced' | 'do_not_contact'
      email_event_type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'complained' | 'unsubscribed'
    }
  }
}
