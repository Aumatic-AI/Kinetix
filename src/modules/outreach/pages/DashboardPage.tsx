"use client";
import { Send, MessageSquare, AlertTriangle, Users, Megaphone, Eye } from "lucide-react";
import { useOutreachAnalytics } from "../hooks/useCampaigns";
import { KpiCard } from "../components/dashboard/KpiCard";

export function DashboardPage() {
  const { data, isLoading } = useOutreachAnalytics();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-text">Dashboard</h2>
        <p className="text-sm text-muted mt-1">Live from Instantly — refreshes automatically, not a stored snapshot.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-20 rounded-2xl bg-surface animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard icon={Users} label="Leads" value={data?.totalLeads || 0} tint="#F1F4F8" color="#64748B" />
          <KpiCard icon={Megaphone} label="Campaigns sent" value={data?.totalCampaignsSent || 0} tint="#F3EEFF" color="#7132f5" />
          <KpiCard icon={Send} label="Emails sent" value={data?.totals.sent || 0} tint="#E9FBF3" color="#10B981" />
          <KpiCard icon={Eye} label="Opened" value={data?.totals.opened || 0} tint="#EAF2FF" color="#3B82F6" />
          <KpiCard icon={MessageSquare} label="Replied" value={data?.totals.replied || 0} tint="#FFF6E5" color="#F59E0B" />
          <KpiCard icon={AlertTriangle} label="Bounced" value={data?.totals.bounced || 0} tint="#FBE9E9" color="#C23B3B" />
        </div>
      )}
    </div>
  );
}
