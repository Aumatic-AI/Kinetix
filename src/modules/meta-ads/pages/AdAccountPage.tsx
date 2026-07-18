"use client";
import { useEffect, useState } from "react";
import { SiMeta } from "react-icons/si";
import { XCircle, Wallet, Wallet2, Globe, Building2, ShieldCheck } from "lucide-react";

interface AdAccountProfile {
  externalId: string;
  name: string;
  currency: string;
  timezoneName: string;
  accountStatus: number;
  amountSpent: string;
  balance: string;
  businessName?: string;
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
  warning: "text-warning bg-warning-bg",
};

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
  const [profile, setProfile] = useState<AdAccountProfile | null>(null);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/meta-ads/account")
      .then((res) => res.json())
      .then((data) => {
        setConfigured(data.configured);
        if (data.profile) setProfile(data.profile);
        if (data.error) setError(data.error);
      })
      .catch(() => setError("Failed to load Meta ad account"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-10">
        <div className="h-64 rounded-2xl bg-surface animate-pulse" />
      </div>
    );
  }

  const status = profile?.accountStatus !== undefined ? ACCOUNT_STATUS[profile.accountStatus] : undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {error && (
        <div className="flex items-start gap-2.5 bg-danger-bg border border-danger-border text-danger text-sm font-medium rounded-xl px-4 py-3">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {!configured ? (
        <div className="bg-background border border-default/60 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0866FF] text-white flex items-center justify-center mx-auto mb-4">
            <SiMeta className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-text">Meta Ads account isn't configured</h3>
          <p className="text-sm text-muted mt-3 max-w-sm mx-auto">
            Set <code className="text-xs bg-surface px-1.5 py-0.5 rounded">META_ACCESS_TOKEN</code> and{" "}
            <code className="text-xs bg-surface px-1.5 py-0.5 rounded">META_AD_ACCOUNT_ID</code> in the environment
            to connect this business's Meta Business Manager ad account.
          </p>
        </div>
      ) : profile ? (
        <div className="bg-background border border-default/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-start justify-between p-6 border-b border-default/60">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#0866FF] text-white flex items-center justify-center shrink-0">
                <SiMeta className="w-6 h-6" />
              </div>
              <div>
                <p className="text-lg font-bold text-text leading-tight">{profile.name || "Meta Ads Account"}</p>
                <p className="text-xs text-muted mt-0.5">Account ID · act_{profile.externalId}</p>
              </div>
            </div>
            {status && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${TONE_CLASSES[status.tone]}`}>
                {status.label}
              </span>
            )}
          </div>

          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Wallet} label="Amount Spent" value={formatMoney(profile.amountSpent, profile.currency)} />
            <StatCard icon={Wallet2} label="Balance" value={formatMoney(profile.balance, profile.currency)} />
            <StatCard icon={Globe} label="Timezone" value={profile.timezoneName || "—"} />
            <StatCard icon={Building2} label="Business Manager" value={profile.businessName || "—"} />
          </div>

          <div className="px-6 pb-6 flex items-center gap-2 text-xs text-muted">
            <ShieldCheck className="w-3.5 h-3.5" /> ads_management · ads_read · business_management
          </div>
        </div>
      ) : null}
    </div>
  );
}
