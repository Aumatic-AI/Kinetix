"use client";
import { Send, MessageSquare, AlertTriangle, Users, Megaphone } from "lucide-react";
import { useOutreachAnalytics } from "../hooks/useOutreachCampaigns";
import { KpiCard } from "../components/dashboard/KpiCard";

export function DashboardPage() {
  const { data, isLoading } = useOutreachAnalytics();
  const counts = data?.counts || {};

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-text">Dashboard</h2>
        <p className="text-sm text-muted mt-1">Read from Kinetix&apos;s own saved numbers — no live call to the outreach service on every visit.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 rounded-2xl bg-surface animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <KpiCard icon={Users} label="Leads" value={data?.totalLeads || 0} tint="#F1F4F8" color="#64748B" />
          <KpiCard icon={Megaphone} label="Campaigns sent" value={data?.totalCampaignsSent || 0} tint="#F3EEFF" color="#7132f5" />
          <KpiCard icon={Send} label="Emails sent" value={counts.sent || 0} tint="#E9FBF3" color="#10B981" />
          <KpiCard icon={MessageSquare} label="Replied" value={counts.replied || 0} tint="#FFF6E5" color="#F59E0B" />
          <KpiCard icon={AlertTriangle} label="Bounced" value={counts.bounced || 0} tint="#FBE9E9" color="#C23B3B" />
        </div>
      )}
    </div>
  );
}
