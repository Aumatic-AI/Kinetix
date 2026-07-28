"use client";
import React from "react";
import { XCircle, ExternalLink } from "lucide-react";
import { PLATFORMS as PLATFORM_META, Platform, PlatformMeta as SharedPlatformMeta } from "../lib/platforms";
import { PlatformCard } from "../components/connected-accounts/PlatformCard";
import { useConnectedAccountsSync } from "../hooks/useConnectedAccounts";

const UPLOAD_POST_DASHBOARD_URL = "https://app.upload-post.com/manage-users";

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

export function ConnectedAccounts() {
  const { data: connections = [], isLoading, error } = useConnectedAccountsSync();

  const connectionByPlatform = (platform: Platform) => connections.find((c) => c.platform === platform);

  // Explicit grid-template-columns (auto-fit/minmax) instead of Tailwind's
  // sm:/lg: breakpoint classes — those are plain viewport media queries and
  // should work regardless, but they weren't taking effect here even after
  // a full cache clear, so this sidesteps the class-generation step
  // entirely and sizes columns off the container's own width instead.
  const cardGridStyle: React.CSSProperties = { gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-text">Connected Accounts</h2>
          <p className="text-muted text-sm mt-1">
            Accounts are connected on the Upload-Post dashboard — this page just reflects live status and is what Kinetix publishes through.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={UPLOAD_POST_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg px-3 py-2 transition-colors"
          >
            Manage on Upload-Post <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 bg-danger-bg border border-danger-border text-danger text-sm font-medium rounded-xl px-4 py-3">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error instanceof Error ? error.message : "Failed to sync connection status"}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4" style={cardGridStyle}>
          {PLATFORMS.map((p) => (
            <div key={p.platform} className="h-40 rounded-2xl bg-surface animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4" style={cardGridStyle}>
          {PLATFORMS.map((p) => {
            const conn = connectionByPlatform(p.platform);
            return (
              <PlatformCard
                key={p.platform}
                meta={p}
                connection={conn?.status === "connected" ? conn : undefined}
                description={p.description}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
