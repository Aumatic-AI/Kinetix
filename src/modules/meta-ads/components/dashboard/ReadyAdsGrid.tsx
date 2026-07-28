"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Rocket } from "lucide-react";
import { FormatIcon, ACCENT, CHART_SERIES, SectionTitle } from "./shared";

interface ReadyScript {
  topic: string;
  format: string;
  framework?: string;
  hook: string;
  script?: string;
  body_copy?: string;
  slides?: { slide: number; headline: string; body: string }[];
  cta: string;
  visual_direction?: string;
  target_audience?: string;
  why_this_beats_competitors?: string;
}

const USED_STORAGE_KEY = "kinetix_used_ready_scripts";
const PREFILL_STORAGE_KEY = "kinetix_prefill_ad";
const DURATION_OPTIONS = ["20 seconds", "28 seconds", "32 seconds", "36 seconds", "40 seconds"];

function getUsedKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(window.localStorage.getItem(USED_STORAGE_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function markUsed(key: string) {
  const set = getUsedKeys();
  set.add(key);
  window.localStorage.setItem(USED_STORAGE_KEY, JSON.stringify([...set]));
}

function nearestDuration(seconds: number): string {
  return DURATION_OPTIONS.reduce((best, opt) => {
    const diff = Math.abs(parseInt(opt, 10) - seconds);
    const bestDiff = Math.abs(parseInt(best, 10) - seconds);
    return diff < bestDiff ? opt : best;
  }, DURATION_OPTIONS[0]);
}

function scriptBodyText(s: ReadyScript): string {
  if (s.script) return s.script;
  if (s.body_copy) return s.body_copy;
  if (s.slides) return s.slides.map((sl) => `Slide ${sl.slide}: ${sl.headline} — ${sl.body}`).join(" ");
  return "";
}

const SERVICE_KEYWORDS: [string, string][] = [
  ["hair", "Hair Transplant"],
  ["dental", "Dental Treatment"],
  ["smile", "Dental Treatment"],
  ["teeth", "Dental Treatment"],
  ["nose", "Cosmetic Surgery"],
  ["rhinoplasty", "Cosmetic Surgery"],
  ["cosmetic", "Cosmetic Surgery"],
  ["eye", "Eye Treatment"],
  ["vision", "Eye Treatment"],
  ["ivf", "IVF Fertility"],
  ["fertility", "IVF Fertility"],
  ["thermal", "Thermal Wellness"],
  ["wellness", "Thermal Wellness"],
];

/** Best-effort mapping from a script's topic to one of the business's
 * configured service names (see businesses.services) — keeps the auto-filled
 * Create Ad modal's required Service field populated instead of leaving it
 * for the user to pick manually. */
function guessService(topic: string): string | undefined {
  const t = topic.toLowerCase();
  return SERVICE_KEYWORDS.find(([kw]) => t.includes(kw))?.[1];
}

/** Builds the detailed idea/script text handed to CreateAdModal — combines
 * every field the AI wrote for this script so the downstream generation
 * prompt (which only ever sees `creative.ideaPrompt`) has maximum grounding,
 * instead of just the one-line hook. */
function buildPrefill(s: ReadyScript) {
  const isVideo = s.format.toLowerCase().includes("video");
  const durationMatch = s.format.match(/(\d+)\s*sec/i);

  const ideaParts = [
    `Topic: ${s.topic}.`,
    s.framework ? `Framework: ${s.framework}.` : "",
    `Hook: ${s.hook}`,
    scriptBodyText(s) ? `Story/body: ${scriptBodyText(s)}` : "",
    s.visual_direction ? `Visual direction: ${s.visual_direction}` : "",
    s.target_audience ? `Target audience: ${s.target_audience}` : "",
    s.why_this_beats_competitors ? `Why this angle wins: ${s.why_this_beats_competitors}` : "",
    `Call to action: ${s.cta}`,
  ].filter(Boolean);

  return {
    type: isVideo ? "video" : "image",
    duration: isVideo ? nearestDuration(durationMatch ? parseInt(durationMatch[1], 10) : 28) : undefined,
    idea: ideaParts.join("\n"),
    service: guessService(s.topic),
  };
}

export function ReadyAdsGrid({ scripts = [], reportKey }: { scripts?: ReadyScript[]; reportKey?: string }) {
  const router = useRouter();
  const [usedKeys, setUsedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    setUsedKeys(getUsedKeys());
  }, []);

  if (!scripts.length) return null;

  const visible = scripts.filter((s) => !usedKeys.has(`${reportKey}:${s.topic}`));
  if (!visible.length) {
    return (
      <div>
        <SectionTitle icon={Rocket} accent={ACCENT.emerald} title="Ready To Launch" />
        <p className="text-sm text-muted">All of this week's scripts have been turned into ads. Check back after the next sync.</p>
      </div>
    );
  }

  const handleCreate = (s: ReadyScript) => {
    const prefill = buildPrefill(s);
    window.sessionStorage.setItem(PREFILL_STORAGE_KEY, JSON.stringify(prefill));
    markUsed(`${reportKey}:${s.topic}`);
    router.push("/meta-ads/ad-library");
  };

  return (
    <div>
      <SectionTitle icon={Rocket} accent={ACCENT.emerald} title="Ready To Launch" trailing={<span className="text-xs text-muted">{visible.length} scripts</span>} />
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {visible.map((s, i) => {
          const accentColor = CHART_SERIES[i % CHART_SERIES.length];
          return (
            <div key={i} className="bg-background border border-default/60 rounded-2xl p-4 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accentColor}1A`, color: accentColor }}>
                  <FormatIcon format={s.format} className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted">{s.format}</span>
              </div>
              <p className="text-sm font-semibold text-text mb-1.5 leading-snug">{s.topic}</p>
              <p className="text-xs text-muted italic leading-snug line-clamp-2 mb-4 flex-1">"{s.hook}"</p>
              <button
                onClick={() => handleCreate(s)}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-xl py-2.5 transition-colors"
              >
                Create Ad <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
