"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiMeta } from "react-icons/si";
import { CheckCircle2, XCircle, Loader2, Unplug, Wallet, Wallet2, Globe, Building2, CalendarClock, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AdAccountConnection {
  id: string;
  display_name: string | null;
  external_id: string;
  status: string;
  metadata: {
    currency?: string;
    timezoneName?: string;
    accountStatus?: number;
    amountSpent?: string;
    balance?: string;
    businessName?: string;
  } | null;
  created_at: string;
}

const ACCOUNT_STATUS: Record<number, { label: string; tone: "success" | "danger" | "warning" }> = {
  1: { label: "Active", tone: "success" },
  2: { label: "Disabled", tone: "danger" },
  3: { label: "Unsettled", tone: "warning" },
  7: { label: "Pending Risk Review", tone: "warning" },
  8: { label: "Pending Settlement", tone: "warning" },
  9: { label: "In Grace Period", tone: "warning" },
  100: { label: "Pending Closure", tone: "warning" },
  101: { label: "Closed", tone: "danger" },
};

const TONE_CLASSES: Record<string, string> = {
  success: "text-success bg-success-bg",
  danger: "text-danger bg-danger-bg",
  warning: "",
};
const WARNING_STYLE = { color: "#B45309", background: "#FFF6E5" };

function formatMoney(raw: string | undefined, currency: string | undefined) {
  if (raw === undefined) return "—";
  const value = Number(raw) / 100;
  try {
    return value.toLocaleString(undefined, { style: "currency", currency: currency || "USD" });
  } catch {
    return `${value.toFixed(2)} ${currency || ""}`;
  }
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-surface rounded-xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary-subtle text-primary flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-muted uppercase tracking-wide">{label}</p>
        <p className="text-sm font-bold text-text truncate mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export function AdAccountPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [connection, setConnection] = useState<AdAccountConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchConnection = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from("platform_connections") as any)
      .select("id, display_name, external_id, status, metadata, created_at")
      .eq("platform", "facebook")
      .eq("account_kind", "ad_account")
      .eq("status", "connected")
      .maybeSingle();
    setConnection(data || null);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  const handleDisconnect = async () => {
    if (!connection) return;
    setDisconnecting(true);
    await supabase.from("platform_connections").delete().eq("id", connection.id);
    await fetchConnection();
    setDisconnecting(false);
  };

  const connectedBanner = searchParams.get("connected");
  const errorBanner = searchParams.get("error");
  const errorMessage = searchParams.get("message");

  useEffect(() => {
    if (connectedBanner || errorBanner) {
      const t = setTimeout(() => router.replace("/meta-ads/account"), 6000);
      return () => clearTimeout(t);
    }
  }, [connectedBanner, errorBanner, router]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-10">
        <div className="h-64 rounded-2xl bg-surface animate-pulse" />
      </div>
    );
  }

  const status = connection?.metadata?.accountStatus !== undefined ? ACCOUNT_STATUS[connection.metadata.accountStatus] : undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {connectedBanner && (
        <div className="flex items-center gap-2.5 bg-success-bg border border-success/20 text-success text-sm font-medium rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> Meta Ads account connected successfully.
        </div>
      )}
      {errorBanner && (
        <div className="flex items-start gap-2.5 bg-danger-bg border border-danger-border text-danger text-sm font-medium rounded-xl px-4 py-3">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {errorBanner === "not_configured"
              ? "Meta Ads isn't set up yet — the app needs to be registered on Meta's developer console first."
              : `Couldn't connect your Meta Ads account${errorMessage ? `: ${errorMessage}` : "."}`}
          </span>
        </div>
      )}

      {!connection ? (
        <div className="bg-background border border-default/60 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0866FF] text-white flex items-center justify-center mx-auto mb-4">
            <SiMeta className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-text">Connect your Meta Ads account</h3>
          <ul className="text-sm text-muted mt-4 space-y-2 max-w-sm mx-auto text-left">
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0" /> Launch generated ads as live campaigns</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0" /> Daily spend and performance sync</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0" /> Budget and balance tracking, right here</li>
          </ul>
          <a
            href="/api/meta-ads/account/connect"
            className="inline-flex items-center gap-2 text-sm font-bold text-white bg-[#0866FF] hover:opacity-90 rounded-xl px-6 py-3 mt-6 transition-opacity"
          >
            <SiMeta className="w-4 h-4" /> Connect Meta Ads Account
          </a>
        </div>
      ) : (
        <div className="bg-background border border-default/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-start justify-between p-6 border-b border-default/60">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#0866FF] text-white flex items-center justify-center shrink-0">
                <SiMeta className="w-6 h-6" />
              </div>
              <div>
                <p className="text-lg font-bold text-text leading-tight">{connection.display_name || "Meta Ads Account"}</p>
                <p className="text-xs text-muted mt-0.5">Account ID · act_{connection.external_id}</p>
              </div>
            </div>
            {status && (
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${TONE_CLASSES[status.tone]}`}
                style={status.tone === "warning" ? WARNING_STYLE : undefined}
              >
                {status.label}
              </span>
            )}
          </div>

          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Wallet} label="Amount Spent" value={formatMoney(connection.metadata?.amountSpent, connection.metadata?.currency)} />
            <StatCard icon={Wallet2} label="Balance" value={formatMoney(connection.metadata?.balance, connection.metadata?.currency)} />
            <StatCard icon={Globe} label="Timezone" value={connection.metadata?.timezoneName || "—"} />
            <StatCard icon={Building2} label="Business Manager" value={connection.metadata?.businessName || "—"} />
          </div>

          <div className="px-6 pb-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-muted">
              <CalendarClock className="w-3.5 h-3.5" /> Connected {new Date(connection.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <ShieldCheck className="w-3.5 h-3.5" /> ads_management · ads_read · business_management
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="ml-auto flex items-center justify-center gap-1.5 text-xs font-semibold text-danger border border-danger/25 hover:bg-danger/10 rounded-xl px-4 py-2 transition-colors disabled:opacity-50"
            >
              {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unplug className="w-3.5 h-3.5" />}
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
