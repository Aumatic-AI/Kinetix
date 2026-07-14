export type CreativeStatus = "pending" | "processing" | "review" | "approved" | "failed";
export type CreativeType = "video" | "image";

export interface MetaAdCreative {
  id: string;
  created_at: string;
  brand_id: string;
  type: CreativeType;
  status: CreativeStatus;
  idea_prompt?: string;
  ad_script?: any;
  media_urls?: string[];
  video_style?: string;
  audio_style?: string;
  language?: string;
  character_type?: string;
  duration?: string;
  voice_id?: string;
}

export interface MetaAdIntelligence {
  id: string;
  created_at: string;
  brand_id: string;
  report_type: "competitor" | "self";
  insights: any;
}

export interface MetaCompetitorAd {
  id: string;
  created_at: string;
  brand_id: string;
  platform_ad_id: string;
  ad_text?: string;
  visual_summary?: string;
  cta?: string;
  performance_score?: number;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface CreativeFilters {
  status?: CreativeStatus;
  type?: CreativeType;
  search?: string;
}
