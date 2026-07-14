import { inngest } from "@/services/inngest/client";
import { ApifyService } from "@/services/apify";
import { MetaAdsService } from "@/modules/meta-ads/services/meta-ads.service";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// --- Pre-Processing Heuristics (n8n port) ---
function extractText(val: any): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (val?.markup?.["__html"]) return val.markup["__html"];
  if (val?.text) return val.text;
  if (val?.paragraph_text) return val.paragraph_text;
  for (const k of ["content", "message", "description", "copy"]) {
    if (typeof val[k] === "string") return val[k];
  }
  return "";
}

function cleanHtml(val: any): string {
  return extractText(val)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getFramework(text: string): string {
  const t = text.toLowerCase();
  const h = (r: RegExp) => r.test(t);

  const problem = h(/expensive|can't afford|waiting list|pain|scared|afraid|nervous|avoid|embarrassed|hiding/);
  const solution = h(/solution|we handle|we arrange|we include|book|free consult|get started|check eligibility/);
  const proof = h(/jci|accredited|harvard|trusted|certified|years|patients|★|stars|rated|award/);
  const urgency = h(/limited|only|today|now|hurry|last|few spots|this month|slots|filling fast/);
  const savings = h(/save|saving|less than|compared to canada|vs canada|\$\d+|\d+%|affordable|fraction/);
  const cta = h(/book|call|dm|click|visit|reserve|apply|get started|check|free quote|free consult/);

  if (savings && cta) return "Cost-Savings";
  if (problem && solution && cta) return "PAS";
  if (proof && cta) return "HSC";
  if (urgency && cta) return "HUC";
  if (cta) return "Direct";
  return "Awareness";
}

function getAngles(text: string): string[] {
  const t = text.toLowerCase();
  const out = [];
  if (/save|saving|\d+%\s*less|affordable|fraction|canada.*cost|vs canada|\$\d+\s*(vs|compared)/i.test(t)) out.push("cost-savings");
  if (/jci|accredited|harvard|johns hopkins|certified|licensed|trusted|years|patients|★|4\.\d|5\.0/i.test(t)) out.push("trust/proof");
  if (/limited|only|today|now|hurry|last chance|few slots|this month|filling fast/i.test(t)) out.push("urgency");
  if (/safe|hygiene|steril|clean|modern|state\.of\.the\.art|approved|standard/i.test(t)) out.push("safety");
  if (/transform|new smile|new you|dream|always wanted|changed|confidence|finally/i.test(t)) out.push("transformation");
  if (/before|after|healed|result|look at|months later/i.test(t)) out.push("before/after");
  if (/vip|transfer|hotel|accommodation|pickup|package|all\.inclusive|we handle/i.test(t)) out.push("concierge/vip");
  if (/canada|ontario|bc|alberta|toronto|vancouver|calgary|canadian/i.test(t)) out.push("local/canada");
  if (/scared|nervous|afraid|worried|what if|is it safe|abroad/i.test(t)) out.push("fear-removal");
  if (/implant|crown|veneer|smile|teeth|dental/i.test(t)) out.push("dental");
  if (/hair|transplant|fue|dhi|sapphire|hairline|bald/i.test(t)) out.push("hair");
  return out.length ? out : ["general"];
}

function scoreAd(text: string): number {
  let s = 0;
  if (text.length > 30) s += 2;
  if (text.length > 100) s += 1;
  if (/\$\d+|\d+%/.test(text)) s += 1; // price specificity
  if (/jci|accredited|harvard|certified/i.test(text)) s += 1; // trust signal
  if (/free consult|free quote|check eligib/i.test(text)) s += 1; // low-friction CTA
  if (/canada|ontario|bc|alberta/i.test(text)) s += 1; // local targeting
  return Math.min(s, 10);
}
// ------------------------------------------

export const competitorAdScraperJob = inngest.createFunction(
  { id: "jobs-competitor-ad-scraper", triggers: [{ cron: "0 0 * * 0" }] },
  async ({ step }: any) => {
    const brands = await step.run("fetch-brands", async () => {
      const { data } = await supabase.from("brands").select("*");
      return data || [];
    });

    for (const brand of brands) {
      await step.sendEvent("trigger-scrape", {
        name: "jobs/competitor-ad-scraper",
        data: { brandId: brand.id },
      });
    }
  }
);

export const competitorAdScraperWorker = inngest.createFunction(
  {
    id: "jobs-competitor-ad-scraper-worker",
    triggers: [{ event: "jobs/competitor-ad-scraper" }],
  },
  async ({ event, step }: any) => {
    const { brandId } = event.data;

    const brandConfig = await step.run("fetch-config", async () => {
      const { data } = await supabase.from("brands").select("*").eq("id", brandId).single();
      return data;
    });

    if (!brandConfig) return;

    // Use dynamic multi-tenant config or fallback
    let keywordsString = brandConfig.name || "Competitor";
    if (brandConfig.competitor_keywords && Array.isArray(brandConfig.competitor_keywords) && brandConfig.competitor_keywords.length > 0) {
      keywordsString = brandConfig.competitor_keywords.join(",");
    } else if (typeof brandConfig.competitor_keywords === 'string') {
      keywordsString = brandConfig.competitor_keywords;
    }

    const datasetId = await step.run("trigger-apify", async () => {
      const result = await ApifyService.runActor("apify/facebook-ads-scraper", {
        searchTerms: keywordsString,
        limit: 50,
      });
      return result.datasetId;
    });

    await step.sleep("wait-for-scraper", "5m");

    const scrapedAds = await step.run("fetch-apify-results", async () => {
      const items = await ApifyService.getDatasetItems(datasetId);
      return items.map((item: any) => ({
        text: cleanHtml(item.primaryText),
        media: item.mediaUrl,
        format: item.format,
        competitor: item.pageName,
      }));
    });

    await step.run("save-scraped-ads", async () => {
      for (const ad of scrapedAds) {
        if (!ad.text && !ad.media) continue;
        
        const fingerprint = crypto
          .createHash("sha256")
          .update(`${ad.text}${ad.media}`)
          .digest("hex");

        const existing = await MetaAdsService.getCompetitorAdByFingerprint(supabase, brandId, fingerprint);

        // Run Pre-processing heuristics
        const framework = getFramework(ad.text);
        const angles = getAngles(ad.text);
        const score = scoreAd(ad.text);

        if (existing) {
          await supabase.from("meta_competitor_ads").update({
            seen_count: existing.seen_count + 1,
            last_seen_at: new Date().toISOString(),
            score,
            framework,
            emotional_angles: angles
          }).eq("id", existing.id);
        } else {
          await supabase.from("meta_competitor_ads").insert({
            brand_id: brandId,
            competitor: ad.competitor || "Unknown",
            fingerprint,
            ad_text: ad.text,
            media_url: ad.media,
            format: ad.format,
            score,
            framework,
            emotional_angles: angles
          });
        }
      }
    });
  }
);
