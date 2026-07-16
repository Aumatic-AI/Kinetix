"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Unplug, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PLATFORMS as PLATFORM_META, Platform, PlatformMeta as SharedPlatformMeta } from "../lib/platforms";

const DESCRIPTIONS: Record<Platform, string> = {
  facebook: "Publish posts and manage your Facebook Page.",
  instagram: "Publish photos, reels, and stories to Instagram.",
  youtube: "Upload and manage videos on your channel.",
  x: "Post and schedule updates on X.",
  linkedin: "Share updates to your LinkedIn profile.",
  tiktok: "Publish videos directly to TikTok.",
};

type PlatformMeta = SharedPlatformMeta & { description: string };

const PLATFORMS: PlatformMeta[] = PLATFORM_META.map((p) => ({ ...p, description: DESCRIPTIONS[p.platform] }));

interface Connection {
  id: string;
  platform: string;
  display_name: string | null;
  status: string;
  metadata: any;
  created_at: string;
}

function formatCount(n?: number) {
  if (n === undefined || n === null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function ProviderCard({ meta, connection, onDisconnect, disconnecting }: { meta: PlatformMeta; connection?: Connection; disconnecting: boolean; onDisconnect: (id: string) => void }) {
  const Icon = meta.icon;
  const isConnected = !!connection;
  const followerCount = formatCount(connection?.metadata?.followers ?? connection?.metadata?.subscribers);
  const avatarUrl = connection?.metadata?.avatarUrl;

  return (
    <div className="group relative bg-background border border-default/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div
        className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-[0.06] transition-opacity group-hover:opacity-[0.1]"
        style={{ background: meta.color }}
      />
      <div className="relative flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white" style={{ background: meta.color }}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-text leading-tight">{meta.label}</p>
            {isConnected ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-success mt-0.5">
                <CheckCircle2 className="w-3 h-3" /> Connected
              </span>
            ) : (
              <span className="text-[11px] text-muted mt-0.5 block">Not connected</span>
            )}
          </div>
        </div>
      </div>

      {isConnected ? (
        <div className="relative space-y-3">
          <div className="flex items-center gap-2.5 bg-surface rounded-xl p-2.5">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-subtle text-primary flex items-center justify-center shrink-0 text-xs font-bold">
                {connection?.display_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-text truncate">{connection?.display_name || "Connected account"}</p>
              {followerCount && (
                <p className="text-[11px] text-muted flex items-center gap-1">
                  <Users className="w-3 h-3" /> {followerCount}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => connection && onDisconnect(connection.id)}
            disabled={disconnecting}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-danger border border-danger/25 hover:bg-danger/10 rounded-xl py-2 transition-colors disabled:opacity-50"
          >
            {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unplug className="w-3.5 h-3.5" />}
            {disconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      ) : (
        <div className="relative space-y-3">
          <p className="text-xs text-muted leading-snug min-h-[32px]">{meta.description}</p>
          <a
            href={`/api/social/connect/${meta.platform}`}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white rounded-xl py-2.5 transition-opacity hover:opacity-90"
            style={{ background: meta.color }}
          >
            Connect
          </a>
        </div>
      )}
    </div>
  );
}

export function ConnectedAccounts() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from("platform_connections") as any)
      .select("id, platform, display_name, status, metadata, created_at")
      .eq("status", "connected");
    setConnections(data || []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleDisconnect = async (id: string) => {
    setDisconnectingId(id);
    await supabase.from("platform_connections").delete().eq("id", id);
    await fetchConnections();
    setDisconnectingId(null);
  };

  const connectedBanner = searchParams.get("connected");
  const errorBanner = searchParams.get("error");
  const errorPlatform = searchParams.get("platform");
  const errorMessage = searchParams.get("message");

  useEffect(() => {
    if (connectedBanner || errorBanner) {
      const t = setTimeout(() => router.replace("/social/connected-accounts"), 6000);
      return () => clearTimeout(t);
    }
  }, [connectedBanner, errorBanner, router]);

  const connectionByPlatform = (platform: Platform) => connections.find((c) => c.platform === platform);

  // Explicit grid-template-columns (auto-fit/minmax) instead of Tailwind's
  // sm:/lg: breakpoint classes — those are plain viewport media queries and
  // should work regardless, but they weren't taking effect here even after
  // a full cache clear, so this sidesteps the class-generation step
  // entirely and sizes columns off the container's own width instead.
  const cardGridStyle: React.CSSProperties = { gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-text">Connected Accounts</h2>
        <p className="text-muted text-sm mt-1">Connect your social platforms once — Kinetix publishes and tracks performance from here.</p>
      </div>

      {connectedBanner && (
        <div className="flex items-center gap-2.5 bg-success-bg border border-success/20 text-success text-sm font-medium rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {PLATFORMS.find((p) => p.platform === connectedBanner)?.label || connectedBanner} connected successfully.
        </div>
      )}
      {errorBanner && (
        <div className="flex items-start gap-2.5 bg-danger-bg border border-danger-border text-danger text-sm font-medium rounded-xl px-4 py-3">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {errorBanner === "not_configured"
              ? `${PLATFORMS.find((p) => p.platform === errorPlatform)?.label || errorPlatform} isn't set up yet — an app needs to be registered on that platform's developer console first.`
              : `Couldn't connect ${PLATFORMS.find((p) => p.platform === errorPlatform)?.label || errorPlatform}${errorMessage ? `: ${errorMessage}` : "."}`}
          </span>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4" style={cardGridStyle}>
          {PLATFORMS.map((p) => (
            <div key={p.platform} className="h-40 rounded-2xl bg-surface animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4" style={cardGridStyle}>
          {PLATFORMS.map((p) => (
            <ProviderCard
              key={p.platform}
              meta={p}
              connection={connectionByPlatform(p.platform)}
              disconnecting={disconnectingId === connectionByPlatform(p.platform)?.id}
              onDisconnect={handleDisconnect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
