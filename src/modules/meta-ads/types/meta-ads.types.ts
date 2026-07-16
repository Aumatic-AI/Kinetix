export type CreativeStatus = "pending" | "processing" | "review" | "approved" | "failed";
export type CreativeType = "video" | "image";
export type CreativeService = "Hair Transplant" | "Dental Implants" | "Rhinoplasty";

export interface MetaAdCreative {
  id: string;
  created_at: string;
  business_id: string;
  type: CreativeType;
  status: CreativeStatus;
  service?: CreativeService | string | null;
  idea_prompt?: string;
  ad_script?: any;
  media_urls?: string[];
  media_asset_id?: string | null;
  revision_history?: any[];
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
  business_id: string;
  report_type: "competitor" | "self";
  insights: any;
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
