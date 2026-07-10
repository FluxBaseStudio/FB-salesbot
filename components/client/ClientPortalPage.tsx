"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ChartCard,
  DashboardShell,
  DonutChart,
  EmptyState,
  LineChart,
  MetricCard,
  Notice,
  Panel,
  ProgressBar,
  ScreenHeader,
  Sidebar,
  StatusBadge,
} from "@/components/admin/ui";
import DateRangeFilter from "@/components/admin/DateRangeFilter";
import SessionGuard from "@/components/security/SessionGuard";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { useLanguage, type Language } from "@/components/i18n/LanguageContext";
import { defaultDateRange, type DateRangeValue } from "@/lib/dateRange";

type PortalData = {
  client: {
    company_name: string;
    contact_email: string | null;
    subscription_status: string;
    subscription_price: number | null;
    daily_email_limit?: number | null;
    monthly_email_limit?: number | null;
    warmup_enabled?: boolean | null;
    warmup_started_at?: string | null;
    warmup_stage_days?: number | null;
    created_at?: string | null;
  };
  campaigns: Array<{ id: string; name: string; status: string; daily_limit?: number | null; monthly_limit?: number | null; warmup_daily_limits?: number[] | null; send_on_weekends?: boolean | null; auto_send_enabled?: boolean | null; follow_up_delay_days?: number | null; max_follow_ups?: number | null; follow_ups_enabled?: boolean | null; last_run_at: string | null; next_run_at: string | null; created_at?: string | null }>;
  leads: Array<{ id: string; company_name: string; industry: string | null; city: string | null; email: string | null; phone: string | null; score: number | null; status: string; created_at: string }>;
  messages: Array<{ id: string; email_to?: string | null; subject: string | null; body?: string | null; status: string; sent_at: string | null; delivered_at?: string | null; opened_at?: string | null; replied_at?: string | null; bounced_at?: string | null; spam_at?: string | null; follow_up_count?: number | null; sequence_step?: number | null; created_at: string; leads?: { company_name?: string } | null }>;
  stats: { campaigns: number; leads: number; sent: number; monthlySent: number; delivered: number; opened: number; replied: number; bounced: number; spam: number; followUpSent: number };
  chartData?: Array<{ label: string; value: number; secondary?: number }>;
  dateRange?: { dateFrom: string; dateTo: string };
};

type ClientView = "overview" | "campaigns" | "leads" | "messages" | "subscription";

const statusLabels: Record<Language, Record<string, string>> = {
  pl: {
  active: "Aktywny",
  paused: "Pauza",
  cancel_requested: "Anulowanie zgłoszone",
  cancelled: "Anulowany",
  sent: "Wysłany",
  delivered: "Dostarczony",
  opened: "Otwarty",
  replied: "Odpowiedź",
  follow_up_sent: "Follow-up wysłany",
  bounced: "Bounce",
  spam: "Spam",
  unsubscribed: "Wypisany",
  skipped_no_email: "Pominięty, brak emaila",
  queued: "W kolejce",
  sending: "Wysyłanie",
  draft: "Czeka na akceptację",
  failed: "Błąd",
  new: "Nowy",
  email_found: "Email znaleziony",
  email_missing: "Brak emaila",
  draft_generated: "Mail gotowy",
  approved: "Zaakceptowany",
  do_not_contact: "Nie kontaktować",
  },
  en: {
    active: "Active",
    paused: "Paused",
    cancel_requested: "Cancellation requested",
    cancelled: "Cancelled",
    sent: "Sent",
    delivered: "Delivered",
    opened: "Opened",
    replied: "Reply",
    follow_up_sent: "Follow-up sent",
    bounced: "Bounce",
    spam: "Spam",
    unsubscribed: "Unsubscribed",
    skipped_no_email: "Skipped, no email",
    queued: "Queued",
    sending: "Sending",
    draft: "Waiting for approval",
    failed: "Error",
    new: "New",
    email_found: "Email found",
    email_missing: "No email",
    draft_generated: "Email ready",
    approved: "Approved",
    do_not_contact: "Do not contact",
  },
};

const navItems: Record<Language, Array<{ id: ClientView; label: string; icon: string }>> = {
  pl: [
    { id: "overview", label: "Przegląd", icon: "⌂" },
    { id: "campaigns", label: "Kampanie", icon: "✦" },
    { id: "leads", label: "Leady", icon: "◌" },
    { id: "messages", label: "Wiadomości", icon: "✉" },
    { id: "subscription", label: "Subskrypcja", icon: "▣" },
  ],
  en: [
    { id: "overview", label: "Overview", icon: "⌂" },
    { id: "campaigns", label: "Campaigns", icon: "✦" },
    { id: "leads", label: "Leads", icon: "◌" },
    { id: "messages", label: "Messages", icon: "✉" },
    { id: "subscription", label: "Subscription", icon: "▣" },
  ],
};

function formatDate(value?: string | null, locale = "pl-PL") {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function getStatusLabel(language: Language, value?: string | null) {
  return statusLabels[language][value || ""] || value || "-";
}

const portalCopy = {
  pl: {
    noActiveCampaigns: "Brak aktywnych kampanii", noLimitConfig: "Brak konfiguracji limitu", emailsToday: "maili dziś", noData: "Brak danych",
    loading: "Ładowanie panelu klienta...", loadError: "Nie udało się pobrać danych.", panelError: "Błąd panelu klienta.",
    paymentError: "Nie udało się utworzyć płatności za dodatkową skrzynkę.", paymentFallback: "Błąd płatności za dodatkową skrzynkę.",
    cancelConfirm: "Czy na pewno chcesz zgłosić anulowanie subskrypcji? Kampanie zostaną zatrzymane, a admin otrzyma status: anulowanie zgłoszone.",
    cancelError: "Nie udało się anulować subskrypcji.", cancelFallback: "Błąd anulowania subskrypcji.",
    ctaSmall: "Załóż własnego SalesBota", ctaStrong: "Nowa kampania", ctaButton: "{t.ctaButton}", logout: "{t.logout}", logoutNote: "Dla bezpieczeństwa wyloguj się po zakończeniu pracy.",
    titleFallback: "Panel klienta", subtitle: (name: string) => `Witaj z powrotem. Podsumowanie aktywności dla ${name}.`, refresh: "Odśwież", notice: "Bot wysyła wiadomości stopniowo w godzinach pracy, żeby chronić dostarczalność.",
    metrics: { active: "Aktywne kampanie", total: "łącznie", sentDelivered: "Wysłane / dostarczone", sent: "wysłanych", opened: "Otwarte", repliesDetail: "odpowiedzi", replies: "Odpowiedzi", repliesReceived: "odebrane od leadów", bounce: "Bounce", bounceDetail: "niedostarczone", spam: "Spam", spamDetail: "zgłoszenia spam", followups: "Follow-upy", followupsDetail: "wysłane sekwencje", monthly: "Limit miesięczny", none: "brak", warmup: "Warm-up" },
    charts: { history: "Historia kampanii", last7: "Ostatnie 7 dni", messages: "Wiadomości", leads: "Leady", pipeline: "Leady w pipeline", statuses: "Statusy", leadCount: "leadów", activity: "Aktywność", latest: "Ostatnie wysyłki" },
    common: { lead: "Lead", noSubject: "Bez tematu", noMessages: "Brak wiadomości.", noCampaigns: "Brak kampanii.", noLeads: "Brak leadów.", noBody: "Brak treści wiadomości.", noEmail: "brak", missingAddress: "brak adresu" },
    subscription: { eyebrow: "Subskrypcja", title: "Plan i użycie", activePlan: "Plan aktywny", perMonth: "zł / mies.", contactEmail: "Email kontaktowy", monthlyMessages: "Wiadomości miesięcznie", delivered: "Dostarczone", opened: "Otwarte", addTitle: "Dodaj drugą skrzynkę wysyłkową", addBody: "+40 maili dziennie za 1500 zł netto/mies. SalesBot rozdzieli wysyłkę na dwie skrzynki, a odpowiedzi mogą trafiać na jeden główny adres.", addButton: "Dodaj za 1500 zł netto", cancelNotice: "Prośba o anulowanie została wysłana do administratora. Kampanie zostały wstrzymane do czasu kontaktu.", cancelReason: "Powód anulowania", cancelPlaceholder: "Opcjonalnie: powód anulowania", sending: "Wysyłanie zgłoszenia...", cancelButton: "Zgłoś anulowanie subskrypcji" },
    campaigns: { eyebrow: "Kampanie", title: "Aktywne kampanie", auto: "Auto-wysyłka", days: "dni", max: "maks.", off: "follow-upy OFF", next: "Następny" },
    leads: { eyebrow: "Leady", title: (n: number) => `Znalezione w wybranym zakresie (${n})`, email: "E-mail", phone: "Telefon" },
    approvals: { eyebrow: "Akceptacja", title: "Maile do akceptacji", to: "Do", prepared: "przygotowany", approve: "Akceptuj", reject: "Odrzuć", empty: "Brak maili czekających na akceptację.", full: "Pełna treść", status: "Status", date: "Data", close: "Zamknij podgląd", messagesTitle: (n: number) => `Wysyłki w wybranym zakresie (${n})` },
  },
  en: {
    noActiveCampaigns: "No active campaigns", noLimitConfig: "No limit configuration", emailsToday: "emails today", noData: "No data",
    loading: "Loading client panel...", loadError: "Could not load data.", panelError: "Client panel error.",
    paymentError: "Could not create payment for the extra mailbox.", paymentFallback: "Extra mailbox payment error.",
    cancelConfirm: "Are you sure you want to request subscription cancellation? Campaigns will be stopped and admin will receive the cancellation requested status.",
    cancelError: "Could not cancel subscription.", cancelFallback: "Subscription cancellation error.",
    ctaSmall: "Start your own SalesBot", ctaStrong: "New campaign", ctaButton: "Start now", logout: "Log out", logoutNote: "For safety, log out when you finish working.",
    titleFallback: "Client panel", subtitle: (name: string) => `Welcome back. Activity summary for ${name}.`, refresh: "Refresh", notice: "The bot sends messages gradually during working hours to protect deliverability.",
    metrics: { active: "Active campaigns", total: "total", sentDelivered: "Sent / delivered", sent: "sent", opened: "Opened", repliesDetail: "reply rate", replies: "Replies", repliesReceived: "received from leads", bounce: "Bounce", bounceDetail: "undelivered", spam: "Spam", spamDetail: "spam reports", followups: "Follow-ups", followupsDetail: "sent sequences", monthly: "Monthly limit", none: "none", warmup: "Warm-up" },
    charts: { history: "Campaign history", last7: "Last 7 days", messages: "Messages", leads: "Leads", pipeline: "Leads in pipeline", statuses: "Statuses", leadCount: "leads", activity: "Activity", latest: "Latest sends" },
    common: { lead: "Lead", noSubject: "No subject", noMessages: "No messages.", noCampaigns: "No campaigns.", noLeads: "No leads.", noBody: "No message body.", noEmail: "none", missingAddress: "missing address" },
    subscription: { eyebrow: "Subscription", title: "Plan and usage", activePlan: "Active plan", perMonth: "PLN / month", contactEmail: "Contact email", monthlyMessages: "Monthly messages", delivered: "Delivered", opened: "Opened", addTitle: "Add a second sending mailbox", addBody: "+40 emails per day for 1500 PLN net/month. SalesBot will split sending across two mailboxes and replies can go to one main address.", addButton: "Add for 1500 PLN net", cancelNotice: "The cancellation request has been sent to admin. Campaigns are paused until contact.", cancelReason: "Cancellation reason", cancelPlaceholder: "Optional: cancellation reason", sending: "Sending request...", cancelButton: "Request subscription cancellation" },
    campaigns: { eyebrow: "Campaigns", title: "Active campaigns", auto: "Auto-send", days: "days", max: "max", off: "follow-ups OFF", next: "Next" },
    leads: { eyebrow: "Leads", title: (n: number) => `Found in selected range (${n})`, email: "E-mail", phone: "Phone" },
    approvals: { eyebrow: "Approval", title: "Emails for approval", to: "To", prepared: "prepared", approve: "Approve", reject: "Reject", empty: "No emails waiting for approval.", full: "Full content", status: "Status", date: "Date", close: "Close preview", messagesTitle: (n: number) => `Sends in selected range (${n})` },
  },
};


function businessDaysInCurrentMonth(includeWeekends: boolean) {
  const now = new Date();
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= days; day += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), day, 12, 0, 0, 0);
    const weekday = date.getDay();
    if (!includeWeekends && (weekday === 0 || weekday === 6)) continue;
    count += 1;
  }
  return count || days;
}

function positiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function campaignWarmupLimits(campaign: PortalData["campaigns"][number]) {
  return Array.isArray(campaign.warmup_daily_limits)
    ? campaign.warmup_daily_limits.map((item) => Math.round(Number(item))).filter((item) => Number.isFinite(item) && item > 0)
    : [];
}

function campaignDayIndex(campaign: PortalData["campaigns"][number]) {
  const startedAt = campaign.created_at ? new Date(campaign.created_at) : null;
  if (!startedAt || Number.isNaN(startedAt.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24)));
}

function dailyLimitForCampaignPreview(campaign: PortalData["campaigns"][number]) {
  const limits = campaignWarmupLimits(campaign);
  if (limits.length) return limits[Math.min(campaignDayIndex(campaign), limits.length - 1)];
  return positiveNumber(campaign.daily_limit);
}

function targetDailyLimitForCampaignPreview(campaign: PortalData["campaigns"][number]) {
  const limits = campaignWarmupLimits(campaign);
  if (limits.length) return limits[limits.length - 1];
  return positiveNumber(campaign.daily_limit);
}

function monthlyLimitForCampaignPreview(campaign: PortalData["campaigns"][number]) {
  const manual = positiveNumber(campaign.monthly_limit);
  if (manual) return manual;
  const targetDaily = targetDailyLimitForCampaignPreview(campaign);
  if (!targetDaily) return null;
  const days = businessDaysInCurrentMonth(campaign.send_on_weekends === true);
  return Math.round(targetDaily) * days;
}

function warmupLimitForPreview(campaigns: PortalData["campaigns"], labels: typeof portalCopy.pl) {
  const active = campaigns.filter((campaign) => campaign.status === "active");
  const configured = active
    .map((campaign) => {
      const current = dailyLimitForCampaignPreview(campaign);
      const target = targetDailyLimitForCampaignPreview(campaign);
      return current && target ? { current, target } : null;
    })
    .filter((item): item is { current: number; target: number } => Boolean(item));

  if (!active.length) return { configured: false, detail: labels.noActiveCampaigns };
  if (!configured.length) return { configured: false, detail: labels.noLimitConfig };

  const current = configured.reduce((sum, item) => sum + item.current, 0);
  const target = configured.reduce((sum, item) => sum + item.target, 0);
  return { configured: true, detail: `${current}/${target} ${labels.emailsToday}` };
}

function SubscriptionPanel({
  data,
  cancelReason,
  setCancelReason,
  busy,
  onCancel,
  onAddMailbox,
}: {
  data: PortalData;
  cancelReason: string;
  setCancelReason: (value: string) => void;
  busy: boolean;
  onCancel: () => void;
  onAddMailbox: () => void;
}) {
  const { language, locale } = useLanguage();
  const t = portalCopy[language];
  const locked = data.client.subscription_status === "cancel_requested" || data.client.subscription_status === "cancelled";
  const activeMonthlyLimits = data.campaigns
    .filter((campaign) => campaign.status === "active")
    .map(monthlyLimitForCampaignPreview)
    .filter((limit): limit is number => typeof limit === "number" && Number.isFinite(limit));
  const monthlyLimit = activeMonthlyLimits.length
    ? Math.max(activeMonthlyLimits.reduce((sum, limit) => sum + limit, 0), data.stats.monthlySent || 1)
    : null;

  return (
    <Panel eyebrow={t.subscription.eyebrow} title={t.subscription.title}>
      <div className="subscription-card">
        <div className="plan-chip">Pro</div>
        <div>
          <strong>{data.client.subscription_price ? `${data.client.subscription_price.toLocaleString(locale)} ${t.subscription.perMonth}` : t.subscription.activePlan}</strong>
          <span>{t.subscription.contactEmail}: {data.client.contact_email || "-"}</span>
        </div>
        <StatusBadge status={data.client.subscription_status}>{getStatusLabel(language, data.client.subscription_status)}</StatusBadge>
      </div>
      <div className="usage-stack">
        <ProgressBar label={t.subscription.monthlyMessages} value={data.stats.monthlySent} max={Math.max(monthlyLimit ?? data.client.monthly_email_limit ?? data.stats.monthlySent, 1)} tone="blue" />
        <ProgressBar label={t.subscription.delivered} value={data.stats.delivered} max={Math.max(data.stats.sent, 1)} tone="green" />
        <ProgressBar label={t.subscription.opened} value={data.stats.opened} max={Math.max(data.stats.delivered, 1)} tone="violet" />
      </div>
      <div className="subscription-card addon-card">
        <div className="plan-chip">+50</div>
        <div>
          <strong>{t.subscription.addTitle}</strong>
          <span>{t.subscription.addBody}</span>
        </div>
        <button className="button primary" type="button" onClick={onAddMailbox} disabled={busy || locked}>
          {t.subscription.addButton}
        </button>
      </div>
      {data.client.subscription_status === "cancel_requested" ? (
        <Notice tone="warning">{t.subscription.cancelNotice}</Notice>
      ) : null}
      <label className="field">
        <span>{t.subscription.cancelReason}</span>
        <textarea
          className="input textarea"
          placeholder={t.subscription.cancelPlaceholder}
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          disabled={locked}
        />
      </label>
      <button className="button danger" type="button" onClick={onCancel} disabled={busy || locked}>
        {busy ? t.subscription.sending : t.subscription.cancelButton}
      </button>
    </Panel>
  );
}

export default function ClientPortalPage() {
  const { language, locale } = useLanguage();
  const t = portalCopy[language];
  const currentNavItems = navItems[language];
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [view, setView] = useState<ClientView>("overview");
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => defaultDateRange());

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ dateFrom: dateRange.dateFrom, dateTo: dateRange.dateTo });
      const response = await fetch(`/api/client-portal/data?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.href = "/client/login";
        return;
      }
      if (!response.ok) throw new Error(payload.error || t.loadError);
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.panelError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [dateRange.dateFrom, dateRange.dateTo]);

  const latestMessages = useMemo(() => (data?.messages || []).filter((message) => message.status !== "draft"), [data]);
  const approvalMessages = useMemo(() => (data?.messages || []).filter((message) => message.status === "draft"), [data]);
  const latestLeads = useMemo(() => data?.leads || [], [data]);
  const activeCampaigns = useMemo(() => (data?.campaigns || []).filter((campaign) => campaign.status === "active"), [data]);
  const replies = data?.stats.replied || 0;
  const responseRate = data?.stats.sent ? `${((replies / data.stats.sent) * 100).toFixed(1)}%` : "0%";
  const activeMonthlyLimits = (data?.campaigns || []).filter((campaign) => campaign.status === "active").map(monthlyLimitForCampaignPreview).filter((limit): limit is number => typeof limit === "number" && Number.isFinite(limit));
  const monthlyLimit = activeMonthlyLimits.length ? Math.max(activeMonthlyLimits.reduce((sum, limit) => sum + limit, 0), data?.stats.monthlySent || 1) : null;
  const warmup = data ? warmupLimitForPreview(data.campaigns, t) : { configured: false, detail: t.noData };
  const dayLabel = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" });
  const activitySeries = useMemo(() => {
    if (data?.chartData?.length) return data.chartData;
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return date;
    });

    return days.map((day) => {
      const key = day.toISOString().slice(0, 10);
      const sent = (data?.messages || []).filter((message) => (message.sent_at || message.created_at || "").slice(0, 10) === key).length;
      const leads = (data?.leads || []).filter((lead) => (lead.created_at || "").slice(0, 10) === key).length;
      return { label: dayLabel.format(day).replace(".", ""), value: sent, secondary: leads };
    });
  }, [data, dayLabel]);
  const leadSegments = useMemo(() => [
    { label: language === "pl" ? "Wysłane leady" : "Sent leads", value: (data?.leads || []).filter((lead) => lead.status === "sent").length, color: "#39c070" },
  ], [data]);

  async function logout() {
    await fetch("/api/client-portal/logout", { method: "POST" }).catch(() => undefined);
    // replace() zamiast href: strona panelu nie zostaje w historii,
    // więc przycisk Wstecz nie wraca do danych po wylogowaniu.
    window.location.replace("/client/login");
  }

  async function addMailboxCheckout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/client-portal/add-mailbox-checkout", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t.paymentError);
      if (payload.url) window.location.href = payload.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : t.paymentFallback);
    } finally {
      setBusy(false);
    }
  }

  async function cancelSubscription() {
    const confirmed = window.confirm(t.cancelConfirm);
    if (!confirmed) return;
    setBusy(true);
    try {
      const response = await fetch("/api/client-portal/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t.cancelError);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.cancelFallback);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="login-page"><Panel><EmptyState>{t.loading}</EmptyState></Panel></main>;
  }

  if (error) {
    return <main className="login-page"><Notice tone="danger">{error}</Notice></main>;
  }

  if (!data) return null;

  return (
    <DashboardShell
      className="client-shell"
      sidebar={
        <Sidebar
          title="FluxBase"
          subtitle="BotSeller"
          items={currentNavItems}
          activeId={view}
          onSelect={(id) => setView(id as ClientView)}
          cta={
            <>
              <span>{t.ctaSmall}</span>
              <strong>{t.ctaStrong}</strong>
              <button className="button primary span" type="button" onClick={() => { window.location.href = "/botseller"; }}>
                {t.ctaButton}
              </button>
            </>
          }
          footer={
            <>
              <span>{data.client.company_name}</span>
              <button className="button logout-button" type="button" onClick={() => void logout()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
                {t.logout}
              </button>
              <small className="sidebar-security-note">{t.logoutNote}</small>
            </>
          }
        />
      }
    >
      <ScreenHeader
        title={view === "overview" ? currentNavItems[0].label : currentNavItems.find((item) => item.id === view)?.label || t.titleFallback}
        subtitle={t.subtitle(data.client.company_name)}
        action={
          <div className="header-actions">
            <LanguageSwitcher compact />
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
            <button className="button" type="button" onClick={() => void load()}>{t.refresh}</button>
          </div>
        }
      />
      <Notice tone="info">{t.notice}</Notice>

      {view === "overview" ? (
        <>
          <div className="metrics-grid">
            <MetricCard label={t.metrics.active} value={activeCampaigns.length} detail={`${data.stats.campaigns} ${t.metrics.total}`} icon="✦" tone="green" />
            <MetricCard label={t.metrics.sentDelivered} value={data.stats.delivered.toLocaleString(locale)} detail={`${data.stats.sent} ${t.metrics.sent}`} icon="✉" tone="blue" />
            <MetricCard label={t.metrics.opened} value={data.stats.opened.toLocaleString(locale)} detail={`${responseRate} ${t.metrics.repliesDetail}`} icon="◎" tone="violet" />
            <MetricCard label={t.metrics.replies} value={replies.toLocaleString(locale)} detail={t.metrics.repliesReceived} icon="↻" tone="amber" />
            <MetricCard label={t.metrics.bounce} value={data.stats.bounced.toLocaleString(locale)} detail={t.metrics.bounceDetail} icon="!" tone="amber" />
            <MetricCard label={t.metrics.spam} value={data.stats.spam.toLocaleString(locale)} detail={t.metrics.spamDetail} icon="⊘" tone="blue" />
            <MetricCard label={t.metrics.followups} value={data.stats.followUpSent.toLocaleString(locale)} detail={t.metrics.followupsDetail} icon="⤴" tone="green" />
            <MetricCard label={t.metrics.monthly} value={`${data.stats.monthlySent}/${monthlyLimit ?? t.metrics.none}`} detail={`${t.metrics.warmup}: ${warmup.detail}`} icon="#" tone="blue" />
          </div>
          <div className="dashboard-grid">
            <ChartCard title={t.charts.history} subtitle={t.charts.last7}>
              <LineChart points={activitySeries} primaryLabel={t.charts.messages} secondaryLabel={t.charts.leads} />
            </ChartCard>
            <ChartCard title={t.charts.pipeline} subtitle={t.charts.statuses}>
              <DonutChart segments={leadSegments} center={<><strong>{data.stats.leads}</strong><span>{t.charts.leadCount}</span></>} />
            </ChartCard>
            <Panel eyebrow={t.charts.activity} title={t.charts.latest}>
              {latestMessages.length ? (
                <div className="compact-list activity-list">
                  {latestMessages.slice(0, 5).map((message) => (
                    <div className="compact-row" key={message.id}>
                      <div><strong>{message.leads?.company_name || t.common.lead}</strong><span>{message.subject || t.common.noSubject} · {formatDate(message.sent_at || message.created_at, locale)}</span></div>
                      <StatusBadge status={message.status}>{getStatusLabel(language, message.status)}</StatusBadge>
                    </div>
                  ))}
                </div>
              ) : <EmptyState>{t.common.noMessages}</EmptyState>}
            </Panel>
          </div>
          <div className="two-column">
            <CampaignsPanel campaigns={activeCampaigns} />
            <SubscriptionPanel data={data} cancelReason={cancelReason} setCancelReason={setCancelReason} busy={busy} onCancel={() => void cancelSubscription()} onAddMailbox={() => void addMailboxCheckout()} />
          </div>
        </>
      ) : null}

      {view === "campaigns" ? <CampaignsPanel campaigns={data.campaigns} /> : null}
      {view === "leads" ? <LeadsPanel leads={latestLeads} /> : null}
      {view === "messages" ? <MessagesPanel messages={latestMessages} approvalMessages={approvalMessages} onReload={() => void load()} /> : null}
      {view === "subscription" ? <SubscriptionPanel data={data} cancelReason={cancelReason} setCancelReason={setCancelReason} busy={busy} onCancel={() => void cancelSubscription()} onAddMailbox={() => void addMailboxCheckout()} /> : null}

      <SessionGuard timeoutMinutes={60} warningMinutes={2} onLogout={logout} panelLabel={language === "pl" ? "panelu klienta" : "client panel"} />
    </DashboardShell>
  );
}

function CampaignsPanel({ campaigns }: { campaigns: PortalData["campaigns"] }) {
  const { language, locale } = useLanguage();
  const t = portalCopy[language];
  return (
    <Panel eyebrow={t.campaigns.eyebrow} title={t.campaigns.title}>
      <div className="compact-list separated">
        {campaigns.map((campaign) => (
          <div className="compact-row" key={campaign.id}>
            <div><strong>{campaign.name}</strong><span>{t.campaigns.auto} · {campaign.follow_ups_enabled ? `follow-up ${campaign.follow_up_delay_days ?? 2} ${t.campaigns.days} · ${t.campaigns.max} ${campaign.max_follow_ups ?? 1}` : t.campaigns.off} · {t.campaigns.next}: {formatDate(campaign.next_run_at, locale)}</span></div>
            <StatusBadge status={campaign.status}>{getStatusLabel(language, campaign.status)}</StatusBadge>
          </div>
        ))}
        {!campaigns.length ? <EmptyState>{t.common.noCampaigns}</EmptyState> : null}
      </div>
    </Panel>
  );
}

function LeadsPanel({ leads }: { leads: PortalData["leads"] }) {
  const { language } = useLanguage();
  const t = portalCopy[language];
  return (
    <Panel eyebrow={t.leads.eyebrow} title={t.leads.title(leads.length)}>
      <div className="compact-list separated">
        {leads.map((lead) => (
          <div className="compact-row" key={lead.id}>
            <div>
              <strong>{lead.company_name}</strong>
              <span>{lead.industry || "-"} · {lead.city || "-"} · score {lead.score ?? 0}/10</span>
              <span>{t.leads.email}: {lead.email || t.common.noEmail} · {t.leads.phone}: {lead.phone || t.common.noEmail}</span>
            </div>
            <StatusBadge status={lead.status}>{getStatusLabel(language, lead.status)}</StatusBadge>
          </div>
        ))}
        {!leads.length ? <EmptyState>{t.common.noLeads}</EmptyState> : null}
      </div>
    </Panel>
  );
}

function MessagesPanel({ messages, approvalMessages, onReload }: { messages: PortalData["messages"]; approvalMessages: PortalData["messages"]; onReload: () => void }) {
  const { language, locale } = useLanguage();
  const t = portalCopy[language];
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewMessage, setPreviewMessage] = useState<PortalData["messages"][number] | null>(null);

  async function decide(messageId: string, action: "approve" | "reject") {
    setBusyId(messageId);
    try {
      await fetch(`/api/client-portal/messages/${messageId}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      onReload();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Panel eyebrow={t.approvals.eyebrow} title={t.approvals.title}>
        <div className="compact-list separated">
          {approvalMessages.map((message) => (
            <div className="approval-card" key={message.id}>
              <div className="approval-card__header">
                <div>
                  <strong>{message.leads?.company_name || t.common.lead}</strong>
                  <span>{t.approvals.to}: {message.email_to || t.common.missingAddress} · {t.approvals.prepared} {formatDate(message.created_at, locale)}</span>
                </div>
                <StatusBadge status={message.status}>{getStatusLabel(language, message.status)}</StatusBadge>
              </div>
              <div className="approval-card__subject">{message.subject || t.common.noSubject}</div>
              <pre className="approval-card__body">{message.body || t.common.noBody}</pre>
              <div className="row-actions approval-card__actions">
                <button className="button small primary-soft" type="button" disabled={busyId === message.id} onClick={() => void decide(message.id, "approve")}>{t.approvals.approve}</button>
                <button className="button small danger" type="button" disabled={busyId === message.id} onClick={() => void decide(message.id, "reject")}>{t.approvals.reject}</button>
              </div>
            </div>
          ))}
          {!approvalMessages.length ? <EmptyState>{t.approvals.empty}</EmptyState> : null}
        </div>
      </Panel>
      {previewMessage ? (
        <Panel eyebrow={t.approvals.full} title={previewMessage.subject || t.common.noSubject}>
          <div className="message-full-meta">
            <span>{t.common.lead}: {previewMessage.leads?.company_name || t.common.lead}</span>
            <span>{t.approvals.to}: {previewMessage.email_to || "-"}</span>
            <span>{t.approvals.status}: {getStatusLabel(language, previewMessage.status)}</span>
            <span>{t.approvals.date}: {formatDate(previewMessage.sent_at || previewMessage.created_at, locale)}</span>
          </div>
          <pre className="approval-card__body message-full-body">{previewMessage.body || t.common.noBody}</pre>
          <div className="row-actions message-full-actions">
            <button className="button small" type="button" onClick={() => setPreviewMessage(null)}>{t.approvals.close}</button>
          </div>
        </Panel>
      ) : null}
      <Panel eyebrow={t.charts.messages} title={t.approvals.messagesTitle(messages.length)}>
        <div className="compact-list separated">
          {messages.map((message) => (
            <div className="compact-row" key={message.id}>
              <div><strong>{message.leads?.company_name || t.common.lead}</strong><span>{message.subject || t.common.noSubject} · {formatDate(message.sent_at || message.created_at, locale)}</span></div>
              <div className="row-actions">
                <button className="button small primary-soft" type="button" onClick={() => setPreviewMessage(message)}>{t.approvals.full}</button>
                <StatusBadge status={message.status}>{getStatusLabel(language, message.status)}</StatusBadge>
              </div>
            </div>
          ))}
          {!messages.length ? <EmptyState>{t.common.noMessages}</EmptyState> : null}
        </div>
      </Panel>
    </>
  );
}
