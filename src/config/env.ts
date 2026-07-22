import { z } from "zod";

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  // Server-only secret — never present in the browser bundle (Next.js only
  // inlines NEXT_PUBLIC_* vars client-side), so this must stay optional here
  // even though every server-only consumer requires it via a `!` assertion.
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // AI providers (all routed through src/services/ai/orchestrator.ts)
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  KIE_API_KEY: z.string().optional(),

  // Media rendering & publishing
  FFMPEG_API_KEY: z.string().optional(),
  UPLOAD_POST_PROFILE: z.string().optional(),

  // Web scraping (Apify) — used by Meta Ads competitor intel and Outreach lead-finding
  APIFY_API_TOKEN: z.string().optional(),

  // Newsletter (Resend) — module is currently deferred, but the provider client stays
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().email().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),

  // Outreach (lead verification & cold email sending)
  MILLIONVERIFIER_API_KEY: z.string().optional(),
  INSTANTLY_API_KEY: z.string().optional(),

  // Meta Graph API — Ads
  META_ACCESS_TOKEN: z.string().optional(),
  META_AD_ACCOUNT_ID: z.string().optional(),

  // Meta Graph API — Leads (separate Page-scoped token, not the ad-account one above)
  META_PAGE_ID: z.string().optional(),
  META_PAGE_TOKEN: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),

  // Storage
  STORAGE_PROVIDER: z.enum(["supabase", "s3", "local"]).default("supabase"),

  // Background jobs (Inngest)
  INNGEST_EVENT_KEY: z.string().optional(),

  // Logging
  LOG_LEVEL: z.string().optional(),

  // Cron (src/app/api/cron/route.ts is currently an unused stub)
  CRON_SECRET: z.string().optional(),

  // App Settings
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const _env = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  KIE_API_KEY: process.env.KIE_API_KEY,

  FFMPEG_API_KEY: process.env.FFMPEG_API_KEY,
  UPLOAD_POST_PROFILE: process.env.UPLOAD_POST_PROFILE,

  APIFY_API_TOKEN: process.env.APIFY_API_TOKEN,

  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
  RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,

  MILLIONVERIFIER_API_KEY: process.env.MILLIONVERIFIER_API_KEY,
  INSTANTLY_API_KEY: process.env.INSTANTLY_API_KEY,

  META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN,
  META_AD_ACCOUNT_ID: process.env.META_AD_ACCOUNT_ID,
  META_PAGE_ID: process.env.META_PAGE_ID,
  META_PAGE_TOKEN: process.env.META_PAGE_TOKEN,
  META_APP_SECRET: process.env.META_APP_SECRET,
  META_WEBHOOK_VERIFY_TOKEN: process.env.META_WEBHOOK_VERIFY_TOKEN,

  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,

  INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,

  LOG_LEVEL: process.env.LOG_LEVEL,

  CRON_SECRET: process.env.CRON_SECRET,

  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NODE_ENV: process.env.NODE_ENV,
});

if (!_env.success) {
  console.error("❌ Invalid environment variables:");
  console.error(_env.error.format());
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
