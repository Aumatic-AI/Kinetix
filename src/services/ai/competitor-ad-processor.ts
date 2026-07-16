/**
 * Competitor Ad Processor
 *
 * Ports the "Ad Processor" + "GPT Input Trimmer" Code nodes from the
 * legacy n8n workflow (toga Research analysis for ads.json) to a
 * business-agnostic pipeline: dedupe/filter/score scraped Facebook
 * Ads Library results in memory, group by competitor, compute
 * market-wide stats and gap flags, then trim to what the AI prompt
 * actually needs. Nothing here is persisted — see
 * docs/ai_pipelines/intelligence_engine.md.
 */

export interface BusinessScrapeContext {
  name: string;
  competitorKeywords: string[];
  targetCountries: string[];
}

interface RawAd {
  [key: string]: any;
}

interface ProcessedAd {
  ad_id: string;
  page_name: string;
  page_url: string;
  ad_type: "carousel" | "video" | "image" | "text";
  start_date: string;
  days_running: number | null;
  platforms: string;
  copy: { hook: string; headline: string; body: string; cta: string; caption: string };
  script: {
    framework: string;
    est_read_time: string;
    has_urgency: boolean;
    has_proof: boolean;
    has_savings: boolean;
    has_cta: boolean;
    has_local: boolean;
  };
  angles: string[];
  hashtags: string[];
  strength: "strong" | "moderate" | "weak";
  score: number;
  image_url: string;
  has_video: boolean;
}

// A small set of common country-code -> region-name aliases, used only to
// detect "local targeting" mentions in ad copy. Falls back to the raw code
// itself for anything not in this list, so it still works for any market.
const COUNTRY_ALIASES: Record<string, string[]> = {
  CA: ["canada", "canadian", "ontario", "toronto", "vancouver", "calgary", "alberta", "bc"],
  US: ["usa", "america", "american", "united states"],
  GB: ["uk", "britain", "british", "england", "london"],
  AU: ["australia", "australian", "sydney", "melbourne"],
};

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

const safe = (v: any) => (!v ? "" : typeof v === "string" ? v.trim() : String(v));

/** Truncates by Unicode code point, not UTF-16 code unit. Plain `.substring(0, n)`
 * can slice a surrogate pair in half (common in scraped ad copy containing
 * emoji) — the resulting lone surrogate still round-trips through JSON.stringify
 * in JS, but corrupts the UTF-8 bytes sent over the wire and Postgres rejects
 * the whole insert with an opaque "Empty or invalid json" error. */
function safeTruncate(str: string, maxLen: number): string {
  if (!str) return str;
  const chars = Array.from(str);
  if (chars.length <= maxLen) return str;
  return chars.slice(0, maxLen).join("");
}

function topN(arr: string[], n = 5) {
  const f: Record<string, number> = {};
  arr.forEach((v) => v && (f[v] = (f[v] || 0) + 1));
  return Object.entries(f).sort((a, b) => b[1] - a[1]).slice(0, n).map(([val, count]) => ({ val, count }));
}

function getAdType(ad: RawAd): ProcessedAd["ad_type"] {
  const s = ad.snapshot || {};
  if ((s.cards || []).length > 1) return "carousel";
  if ((s.videos || []).length > 0) return "video";
  if ((s.images || []).length > 0) return "image";
  return "text";
}

function getCopy(ad: RawAd) {
  const s = ad.snapshot || {};
  const body = cleanHtml(s.body || s.message || s.description || "");
  const headline = cleanHtml(s.title || s.headline || s.cards?.[0]?.title || s.cards?.[0]?.body || "");
  const cta = safe(s.cta_text || s.cta_type || s.cards?.[0]?.cta_text || "");
  const caption = cleanHtml(s.caption || s.link_description || "");
  const source = headline || body || caption;
  const hook = safeTruncate(source.split(/[.!?\n]/)[0], 150).trim();
  const full = [headline, body, caption].filter(Boolean).join(" ").trim();
  return { body, headline, cta, caption, hook, full };
}

function getFramework(text: string): string {
  const t = text.toLowerCase();
  const h = (r: RegExp) => r.test(t);
  const problem = h(/expensive|can't afford|waiting list|pain|scared|afraid|nervous|avoid|embarrassed|hiding/);
  const solution = h(/solution|we handle|we arrange|we include|book|free consult|get started|check eligibility/);
  const proof = h(/jci|accredited|harvard|trusted|certified|licensed|years|patients|★|stars|rated|award/);
  const urgency = h(/limited|only|today|now|hurry|last|few spots|this month|slots|filling fast/);
  const savings = h(/save|saving|less than|\$\d+|\d+%|affordable|fraction/);
  const cta = h(/book|call|dm|click|visit|reserve|apply|get started|check|free quote|free consult/);
  if (savings && cta) return "Cost-Savings";
  if (problem && solution && cta) return "PAS";
  if (proof && cta) return "HSC";
  if (urgency && cta) return "HUC";
  if (cta) return "Direct";
  return "Awareness";
}

/** 11 angle tags — the first 9 are universal marketing psychology categories;
 * the last two are the business's own configured keywords found in the copy,
 * used as generic topic tags instead of hardcoding a vertical (e.g. dental/hair). */
function getAngles(text: string, ctx: BusinessScrapeContext): string[] {
  const t = text.toLowerCase();
  const out: string[] = [];
  if (/save|saving|\d+%\s*less|affordable|fraction|\$\d+\s*(vs|compared)/i.test(t)) out.push("cost-savings");
  if (/jci|accredited|harvard|certified|licensed|trusted|years|patients|★|4\.\d|5\.0/i.test(t)) out.push("trust/proof");
  if (/limited|only|today|now|hurry|last chance|few slots|this month|filling fast/i.test(t)) out.push("urgency");
  if (/safe|hygiene|steril|clean|modern|state.of.the.art|approved|standard/i.test(t)) out.push("safety");
  if (/transform|new you|dream|always wanted|changed|confidence|finally/i.test(t)) out.push("transformation");
  if (/before|after|healed|result|look at|months later/i.test(t)) out.push("before/after");
  if (/vip|transfer|hotel|accommodation|pickup|package|all.inclusive|we handle/i.test(t)) out.push("concierge/vip");
  if (/scared|nervous|afraid|worried|what if|is it safe|abroad/i.test(t)) out.push("fear-removal");

  const localHit = ctx.targetCountries.some((code) => {
    const aliases = COUNTRY_ALIASES[code.toUpperCase()] || [code.toLowerCase()];
    return aliases.some((a) => t.includes(a));
  });
  if (localHit) out.push("local-targeting");

  for (const kw of ctx.competitorKeywords) {
    const topic = kw.toLowerCase().split(" ")[0]; // first significant word, e.g. "hair" from "hair transplant turkey"
    if (topic.length > 3 && t.includes(topic)) out.push(topic);
  }

  return out.length ? [...new Set(out)] : ["general"];
}

function scoreAd(copy: ReturnType<typeof getCopy>, type: ProcessedAd["ad_type"], ctx: BusinessScrapeContext, daysRunning: number | null): { score: number; label: ProcessedAd["strength"] } {
  let s = 0;
  if (copy.headline.split(/\s+/).length > 5) s += 2;
  if (copy.body.length > 30) s += 2;
  if (copy.cta.length > 0) s += 2;
  if (type === "video") s += 3;
  if (type === "carousel") s += 2;
  if (copy.body.length > 100) s += 1;
  if (/\$\d+|\d+%/.test(copy.full)) s += 1; // price/savings specificity
  if (/jci|accredited|harvard|certified|licensed/i.test(copy.full)) s += 1; // trust signal — kept universal, see build plan §08
  if (/free consult|free quote|check eligib|book now|get started/i.test(copy.full)) s += 1; // low-friction CTA
  const localHit = ctx.targetCountries.some((code) => {
    const aliases = COUNTRY_ALIASES[code.toUpperCase()] || [code.toLowerCase()];
    return aliases.some((a) => copy.full.toLowerCase().includes(a));
  });
  if (localHit) s += 1; // local targeting
  if (daysRunning !== null) {
    if (daysRunning >= 60) s += 2; // still running after 2 months — a strong "this is converting" signal
    else if (daysRunning >= 30) s += 1;
  }
  const score = Math.min(s, 10);
  return { score, label: score >= 8 ? "strong" : score >= 5 ? "moderate" : "weak" };
}

function fmtDate(ts: any): string {
  if (!ts) return "unknown";
  try {
    return new Date(typeof ts === "number" ? ts * 1000 : ts).toISOString().split("T")[0];
  } catch {
    return "unknown";
  }
}

/** Days an ad has been live, from its formatted start date. An ad still
 * running after weeks/months is a strong implicit signal it's converting —
 * advertisers don't keep paying for losers indefinitely. Returns null when
 * the start date is unknown rather than guessing. */
function daysRunningSince(formattedDate: string): number | null {
  if (!formattedDate || formattedDate === "unknown") return null;
  const start = new Date(formattedDate).getTime();
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.floor((Date.now() - start) / 86400000));
}

function getMedia(ad: RawAd) {
  const s = ad.snapshot || {};
  const imgs = (s.images || []).map((i: any) => i.original_image_url || i.resized_image_url || i.url).filter(Boolean);
  const thumbs = (s.videos || []).map((v: any) => v.video_preview_image_url || v.thumbnail).filter(Boolean);
  return { image_url: imgs[0] || thumbs[0] || "", has_video: (s.videos || []).length > 0 };
}

export interface ProcessedResult {
  meta: {
    total_scraped: number;
    total_relevant: number;
    total_competitors: number;
    skipped: { deleted: number; irrelevant: number; template: number };
  };
  summary: {
    formats: { video: number; image: number; carousel: number; text: number; video_pct: string; carousel_pct: string };
    top_angles: { val: string; count: number }[];
    top_frameworks: { val: string; count: number }[];
    top_ctas: { val: string; count: number }[];
    top_hashtags: { val: string; count: number }[];
    longevity: { avg_days_running: number | null; longest_running_days: number | null };
    gaps: Record<string, boolean>;
  };
  competitors: any[];
  top_ads: any[];
  all_ads: ProcessedAd[];
}

/** Main pipeline: filter, extract, score, group, and compute market stats. Nothing persisted. */
export function processCompetitorAds(rawAds: RawAd[], ctx: BusinessScrapeContext): ProcessedResult {
  // Relevance filter — dynamic, derived from this business's own keywords + name,
  // instead of a hardcoded vertical regex. An ad is relevant if it mentions any
  // configured competitor keyword (or a significant word from one) or the business's own name.
  const relevantTerms = [
    ctx.name.toLowerCase(),
    ...ctx.competitorKeywords.flatMap((k) => k.toLowerCase().split(" ").filter((w) => w.length > 3)),
  ];
  const isRelevant = (text: string) => relevantTerms.some((term) => text.includes(term));
  const SKIP_HOOK = /\{\{|\[object Object\]|^instagram\.?com?$/i;

  const processed: ProcessedAd[] = [];
  const pages: Record<string, any> = {};
  const skipped = { deleted: 0, irrelevant: 0, template: 0 };

  for (const ad of rawAds) {
    if (ad.page_is_deleted || ad.page_is_restricted) {
      skipped.deleted++;
      continue;
    }

    const pageName = safe(ad.page_name || ad.advertiser_name || "Unknown");
    const adText = [safe(ad.snapshot?.body || ""), safe(ad.snapshot?.title || ""), safe(ad.snapshot?.description || ""), pageName].join(" ").toLowerCase();
    if (!isRelevant(adText)) {
      skipped.irrelevant++;
      continue;
    }

    const copy = getCopy(ad);
    if (SKIP_HOOK.test(copy.hook) || copy.hook.length < 3) {
      skipped.template++;
      continue;
    }

    const type = getAdType(ad);
    const framework = getFramework(copy.full);
    const angles = getAngles(copy.full, ctx);
    const startDate = fmtDate(ad.start_date || ad.ad_creation_time);
    const daysRunning = daysRunningSince(startDate);
    const { score, label } = scoreAd(copy, type, ctx, daysRunning);
    const media = getMedia(ad);

    const item: ProcessedAd = {
      ad_id: safe(ad.ad_archive_id || ad.id),
      page_name: pageName,
      page_url: safe(ad.page_profile_uri || ""),
      ad_type: type,
      start_date: startDate,
      days_running: daysRunning,
      platforms: Array.isArray(ad.publisher_platforms) ? ad.publisher_platforms.join(", ") : safe(ad.publisher_platforms || "facebook"),
      copy: { hook: copy.hook, headline: copy.headline, body: safeTruncate(copy.body, 500), cta: copy.cta, caption: copy.caption },
      script: {
        framework,
        est_read_time: `~${Math.round((copy.full.split(/\s+/).length / 130) * 60)}s`,
        has_urgency: /limited|only|today|now|hurry|this month|slots/i.test(copy.full),
        has_proof: /jci|accredited|harvard|trusted|certified|licensed|years|patients|★/i.test(copy.full),
        has_savings: /save|saving|\d+%|less than|\$\d+|affordable/i.test(copy.full),
        has_cta: /book|call|dm|click|visit|apply|free consult|free quote|check eligib/i.test(copy.full),
        has_local: angles.includes("local-targeting"),
      },
      angles,
      hashtags: (copy.full.match(/#\w+/g) || []).slice(0, 5),
      strength: label,
      score,
      image_url: media.image_url,
      has_video: media.has_video,
    };

    processed.push(item);

    if (!pages[pageName]) {
      pages[pageName] = { name: pageName, url: safe(ad.page_profile_uri || ""), ads: [], hooks: [], ctas: [], angles: [], fws: [], tags: [] };
    }
    const p = pages[pageName];
    p.ads.push(item);
    if (copy.hook) p.hooks.push(copy.hook);
    if (copy.cta) p.ctas.push(copy.cta);
    p.angles.push(...angles);
    p.fws.push(framework);
    p.tags.push(...item.hashtags);
  }

  const competitors = Object.values(pages)
    .map((p: any) => {
      const best = [...p.ads].sort((a: ProcessedAd, b: ProcessedAd) => b.score - a.score)[0];
      return {
        page_name: p.name,
        page_url: p.url,
        total_ads: p.ads.length,
        video_ads: p.ads.filter((a: ProcessedAd) => a.ad_type === "video").length,
        image_ads: p.ads.filter((a: ProcessedAd) => a.ad_type === "image").length,
        carousel_ads: p.ads.filter((a: ProcessedAd) => a.ad_type === "carousel").length,
        dominant_angle: topN(p.angles, 1)[0]?.val || "general",
        top_framework: topN(p.fws, 1)[0]?.val || "Awareness",
        top_hooks: [...new Set(p.hooks)].slice(0, 3),
        top_ctas: [...new Set(p.ctas)].slice(0, 3),
        top_hashtags: [...new Set(p.tags)].slice(0, 6),
        uses_savings: p.ads.some((a: ProcessedAd) => a.script.has_savings),
        uses_proof: p.ads.some((a: ProcessedAd) => a.script.has_proof),
        uses_local: p.ads.some((a: ProcessedAd) => a.script.has_local),
        uses_urgency: p.ads.some((a: ProcessedAd) => a.script.has_urgency),
        best_ad: best
          ? {
              hook: best.copy.hook,
              headline: best.copy.headline,
              body: best.copy.body,
              cta: best.copy.cta,
              framework: best.script.framework,
              duration: best.script.est_read_time,
              angles: best.angles,
              score: best.score,
              image_url: best.image_url,
              days_running: best.days_running,
            }
          : null,
      };
    })
    .sort((a, b) => b.total_ads - a.total_ads);

  const total = processed.length;
  const videos = processed.filter((a) => a.ad_type === "video").length;
  const images = processed.filter((a) => a.ad_type === "image").length;
  const carousels = processed.filter((a) => a.ad_type === "carousel").length;

  const allAngles = processed.flatMap((a) => a.angles);
  const allFWs = processed.map((a) => a.script.framework);
  const allCTAs = processed.map((a) => a.copy.cta).filter(Boolean);
  const allTags = processed.flatMap((a) => a.hashtags);
  const knownDurations = processed.map((a) => a.days_running).filter((d): d is number => d !== null);
  const longevity = {
    avg_days_running: knownDurations.length ? Math.round(knownDurations.reduce((s, d) => s + d, 0) / knownDurations.length) : null,
    longest_running_days: knownDurations.length ? Math.max(...knownDurations) : null,
  };

  const gaps = {
    low_video_usage: total > 0 ? videos / total < 0.3 : true,
    no_urgency_ads: !processed.some((a) => a.script.has_urgency),
    no_proof_signals: !processed.some((a) => a.script.has_proof),
    no_before_after: !processed.some((a) => a.angles.includes("before/after")),
    no_trust_proof: !processed.some((a) => a.angles.includes("trust/proof")),
    no_local_targeting: !processed.some((a) => a.angles.includes("local-targeting")),
    no_savings_specificity: !processed.some((a) => a.script.has_savings),
    no_fear_removal: !processed.some((a) => a.angles.includes("fear-removal")),
    no_carousel: carousels === 0,
    no_concierge_angle: !processed.some((a) => a.angles.includes("concierge/vip")),
  };

  return {
    meta: { total_scraped: rawAds.length, total_relevant: total, total_competitors: competitors.length, skipped },
    summary: {
      formats: {
        video: videos,
        image: images,
        carousel: carousels,
        text: total - videos - images - carousels,
        video_pct: total > 0 ? Math.round((videos / total) * 100) + "%" : "0%",
        carousel_pct: total > 0 ? Math.round((carousels / total) * 100) + "%" : "0%",
      },
      top_angles: topN(allAngles),
      top_frameworks: topN(allFWs),
      top_ctas: topN(allCTAs),
      top_hashtags: topN(allTags, 8),
      longevity,
      gaps,
    },
    competitors,
    top_ads: [...processed]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((a) => ({
        page: a.page_name,
        type: a.ad_type,
        hook: a.copy.hook,
        headline: a.copy.headline,
        body: a.copy.body,
        cta: a.copy.cta,
        framework: a.script.framework,
        duration: a.script.est_read_time,
        angles: a.angles,
        score: a.score,
        image_url: a.image_url,
        days_running: a.days_running,
      })),
    all_ads: processed,
  };
}

/** Trims the full processed result down to what the AI prompt actually needs —
 * same token-economy pattern as the n8n "GPT Input Trimmer" node. */
export function trimForPrompt(result: ProcessedResult) {
  return {
    meta: result.meta,
    summary: result.summary,
    competitors: result.competitors.slice(0, 10).map((c) => ({
      page_name: c.page_name,
      total_ads: c.total_ads,
      video_ads: c.video_ads,
      image_ads: c.image_ads,
      carousel_ads: c.carousel_ads,
      dominant_angle: c.dominant_angle,
      top_framework: c.top_framework,
      top_hooks: c.top_hooks,
      top_ctas: c.top_ctas,
      uses_savings: c.uses_savings,
      uses_proof: c.uses_proof,
      uses_local: c.uses_local,
      uses_urgency: c.uses_urgency,
      best_ad: c.best_ad
        ? { hook: c.best_ad.hook, headline: c.best_ad.headline, body: c.best_ad.body ? safeTruncate(c.best_ad.body, 300) : c.best_ad.body, cta: c.best_ad.cta, framework: c.best_ad.framework, angles: c.best_ad.angles, score: c.best_ad.score, days_running: c.best_ad.days_running }
        : null,
    })),
    top_ads: result.top_ads.slice(0, 5).map((a) => ({ ...a, body: a.body ? safeTruncate(a.body, 300) : a.body })),
    gaps: result.summary.gaps,
  };
}
