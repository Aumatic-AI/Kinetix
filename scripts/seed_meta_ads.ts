import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
// @ts-ignore
import ws from "ws";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
  realtime: {
    transport: ws
  }
});

async function seed() {
  console.log("Starting seed process...");

  // 1. Get first brand
  const { data: brandData, error: brandError } = await supabase.from("brands").select("id").limit(1).single();
  if (brandError || !brandData) {
    console.error("Failed to find a brand:", brandError);
    return;
  }
  const brandId = brandData.id;
  console.log(`Using Brand ID: ${brandId}`);

  // 2. Clear old data for this brand
  await supabase.from("meta_competitor_ads").delete().eq("brand_id", brandId);
  await supabase.from("meta_self_ad_metrics").delete().eq("brand_id", brandId);
  await supabase.from("meta_ad_intelligence").delete().eq("brand_id", brandId);
  await supabase.from("meta_ad_creatives").delete().eq("brand_id", brandId);

  // 3. Seed meta_competitor_ads
  console.log("Seeding competitor ads...");
  const competitorAds = [
    {
      brand_id: brandId,
      competitor_name: "Smile Direct Club",
      fingerprint: "sdc-ad-1",
      ad_text: "Get the perfect smile you've always wanted, for 60% less than braces. Book your free scan today!",
      media_url: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=500&q=80",
      format: "image",
      seen_count: 12
    },
    {
      brand_id: brandId,
      competitor_name: "Invisalign",
      fingerprint: "inv-ad-1",
      ad_text: "Clear aligners that actually work. Recommended by 9/10 dentists globally.",
      media_url: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=500&q=80",
      format: "video",
      seen_count: 8
    },
    {
      brand_id: brandId,
      competitor_name: "Byte",
      fingerprint: "byte-ad-1",
      ad_text: "Whiten while you straighten. See results in just 3 months.",
      media_url: "https://images.unsplash.com/photo-1598256989800-fea5ce514661?w=500&q=80",
      format: "image",
      seen_count: 5
    },
    {
      brand_id: brandId,
      competitor_name: "Local Ortho",
      fingerprint: "lo-ad-1",
      ad_text: "Free consultations this month! Don't wait to fix your smile.",
      media_url: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=500&q=80",
      format: "image",
      seen_count: 2
    }
  ];
  await supabase.from("meta_competitor_ads").insert(competitorAds);

  // 4. Seed meta_self_ad_metrics (Last 30 days)
  console.log("Seeding metrics...");
  const metrics = [];
  const metaAdId = "self-ad-123";
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    metrics.push({
      brand_id: brandId,
      meta_ad_id: metaAdId,
      spend: Math.floor(Math.random() * 200) + 100, // $100 - $300
      impressions: Math.floor(Math.random() * 10000) + 5000,
      clicks: Math.floor(Math.random() * 500) + 100,
      conversions: Math.floor(Math.random() * 10) + 1,
      date: d.toISOString().split("T")[0]
    });
  }
  await supabase.from("meta_self_ad_metrics").insert(metrics);

  // 5. Seed Intelligence
  console.log("Seeding intelligence...");
  await supabase.from("meta_ad_intelligence").insert([
    {
      brand_id: brandId,
      report_type: "competitor",
      insights: {
        top_hooks: ["Stop overpaying for braces", "Get a perfect smile from home"],
        gaps: ["No competitors are showing clinical facility tours"],
        ctas: ["Book Free Scan", "Shop Now"]
      }
    },
    {
      brand_id: brandId,
      report_type: "self",
      insights: {
        winning_patterns: ["UGC style videos perform 2x better", "Short 15s duration"]
      }
    }
  ]);

  // 6. Seed Creatives
  console.log("Seeding creatives...");
  const creatives = [
    {
      brand_id: brandId,
      status: "pending",
      type: "video",
      duration: "28s",
      idea_prompt: "Highlight our new digital smile design tech",
      ad_script: null,
      media_urls: null
    },
    {
      brand_id: brandId,
      status: "review",
      type: "video",
      duration: "15s",
      idea_prompt: "Patient testimonial with before/after transitions",
      ad_script: {
        headline: "Real Results in 6 Months!",
        primary_text: "See how Sarah transformed her smile.",
      },
      media_urls: ["https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=500&q=80"]
    },
    {
      brand_id: brandId,
      status: "approved",
      type: "image",
      duration: null,
      idea_prompt: "JCI accreditation trust badge ad",
      ad_script: {
        headline: "Globally Recognized Care",
        primary_text: "We are proud to be JCI accredited.",
      },
      media_urls: ["https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=500&q=80"]
    }
  ];
  await supabase.from("meta_ad_creatives").insert(creatives);

  console.log("Seed completed successfully!");
}

seed().catch(console.error);
