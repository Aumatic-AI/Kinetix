"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Target, MessageSquareText, TrendingUp, Sparkles, Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const InsightCard = ({ title, value, icon: Icon, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="relative p-[1px] rounded-2xl overflow-hidden group h-full"
  >
    {/* Holographic Border Effect */}
    <div className="absolute inset-0 bg-primary opacity-5 group-hover:opacity-10 transition-opacity duration-500" />
    <div className="absolute inset-0 bg-primary opacity-10 blur-xl group-hover:opacity-20 transition-opacity duration-500" />
    
    <div className="relative h-full bg-background border border-default rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-surface rounded-lg text-primary">
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-muted font-medium text-sm flex items-center gap-2">
          {title}
          <Sparkles className="w-3 h-3 text-primary" />
        </h3>
      </div>
      <p className="text-text text-lg font-medium leading-relaxed">{value}</p>
    </div>
  </motion.div>
);

export function Competitors() {
  const [ads, setAds] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>({ top_hooks: [], gaps: [], ctas: [] });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Fetch intelligence
      const { data: intelData } = await (supabase
        .from("meta_ad_intelligence") as any)
        .select("insights, created_at")
        .eq("report_type", "competitor")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (intelData?.insights) {
        setInsights(intelData.insights);
      }

      // Fetch competitor ads
      const { data: adsData } = await (supabase
        .from("meta_competitor_ads") as any)
        .select("*")
        .order("seen_count", { ascending: false })
        .limit(20);

      if (adsData) {
        setAds(adsData);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="text-muted animate-pulse">Loading market intelligence...</div>;
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-semibold mb-1 text-text">Market Intelligence</h2>
          <p className="text-muted text-sm">Real-time competitor analysis powered by AI.</p>
        </div>
        <button className="flex items-center gap-2 text-sm text-muted hover:text-text transition-colors bg-background px-4 py-2 rounded-full border border-default shadow-sm">
          <RefreshCw className="w-4 h-4" />
          Sync Now
        </button>
      </div>

      {/* AI Insights Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InsightCard 
          title="Winning Hooks" 
          value={insights.top_hooks?.[0] || "Waiting for enough competitor data to generate hooks."}
          icon={MessageSquareText}
          delay={0.1}
        />
        <InsightCard 
          title="Market Gaps" 
          value={insights.gaps?.[0] || "AI is analyzing the market for opportunities."}
          icon={Target}
          delay={0.2}
        />
        <InsightCard 
          title="Dominant Format" 
          value={insights.ctas?.[0] || "Analyzing CTA performance."}
          icon={TrendingUp}
          delay={0.3}
        />
      </div>

      {/* Competitor Gallery */}
      <div>
        <h3 className="text-xl font-medium mb-6 text-text">Proven Competitor Ads</h3>
        {ads.length === 0 ? (
          <div className="text-center py-20 text-muted border border-default rounded-lg border-dashed">
            No competitor ads found. A scraper job will pull them automatically.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {ads.map((ad, idx) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + (idx * 0.1), duration: 0.4 }}
                key={ad.id}
                className="group relative bg-background border-default shadow-sm border rounded-lg overflow-hidden backdrop-blur-sm"
              >
                <div className="relative aspect-[4/5] bg-surface rounded-t-lg overflow-hidden">
                  {ad.media_url ? (
                    <>
                      <img 
                        src={ad.media_url} 
                        alt="ad" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                        }}
                      />
                      <div className="fallback-icon hidden w-full h-full flex items-center justify-center text-muted">
                        {ad.format === "video" ? <Target size={48} /> : <MessageSquareText size={48} />}
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted fallback-icon">No Media</div>
                  )}
                  
                  {/* Fire Badge for Seen Count */}
                  <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-background text-danger font-bold text-xs shadow-md flex items-center gap-1.5 border border-default backdrop-blur-md">
                    <Flame className="w-3.5 h-3.5" fill="currentColor" /> {ad.seen_count} Weeks
                  </div>
                  
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-md text-xs font-medium border border-default text-text">
                    {ad.competitor_name}
                  </div>

                  {/* Hover Overlay for Text */}
                  <div className="absolute inset-0 bg-background/90 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-6 flex flex-col justify-between translate-y-4 group-hover:translate-y-0">
                    <p className="text-text text-sm leading-relaxed line-clamp-[8]">{ad.ad_text || "No text provided"}</p>
                    <div className="mt-4 pt-4 border-t border-default">
                      <p className="text-xs text-muted mb-1">Format</p>
                      <p className="font-medium text-primary capitalize">{ad.format || "Unknown"}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
