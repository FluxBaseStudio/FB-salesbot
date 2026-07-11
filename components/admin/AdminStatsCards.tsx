"use client";

import { MetricCard } from "@/components/admin/ui";

export type AdminStatsCardsProps = {
  stats: {
    clients: number;
    campaigns: number;
    sent: number;
    delivered: number;
    opened: number;
    replied: number;
    bounced: number;
    spam: number;
    followUps: number;
  };
  activeCampaignCount: number;
  trends?: Partial<Record<"leads" | "sent" | "delivered" | "opened" | "replied" | "bounced" | "spam" | "followUps", number | null>>;
};

function trendLabel(value: number | null | undefined) {
  if (value === null || value === undefined) return undefined;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}% vs poprzedni okres`;
}

export function AdminStatsCards({ stats, activeCampaignCount, trends }: AdminStatsCardsProps) {
  return (
    <div className="metrics-grid">
      <MetricCard label="Klienci" value={stats.clients} detail="aktywni i historyczni" icon="●" tone="blue" />
      <MetricCard label="Aktywne kampanie" value={activeCampaignCount} detail={`${stats.campaigns} łącznie`} icon="✦" tone="green" />
      <MetricCard label="Wysłane wiadomości" value={stats.sent} detail="bez szkiców i firm bez maila" trend={trendLabel(trends?.sent)} icon="✉" tone="amber" />
      <MetricCard label="Dostarczone" value={stats.delivered} detail={`${stats.bounced} bounce`} trend={trendLabel(trends?.delivered)} icon="▣" tone="green" />
      <MetricCard label="Otwarte" value={stats.opened} detail={`${stats.replied} odpowiedzi`} trend={trendLabel(trends?.opened)} icon="◎" tone="violet" />
      <MetricCard label="Spam" value={stats.spam} detail={`${stats.followUps} follow-upów`} trend={trendLabel(trends?.spam)} icon="⊘" tone="blue" />
    </div>
  );
}

export default AdminStatsCards;
