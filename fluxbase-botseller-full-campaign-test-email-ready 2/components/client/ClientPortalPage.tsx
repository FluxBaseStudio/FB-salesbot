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
import { defaultDateRange, type DateRangeValue } from "@/lib/dateRange";
import { ADDITIONAL_MAILBOX_DAILY_EMAILS, ADDITIONAL_MAILBOX_PRICE_PLN } from "@/lib/pricing";

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
  campaigns: Array<{ id: string; name: string; status: string; daily_limit?: number | null; monthly_limit?: number | null; warmup_daily_limits?: number[] | null; send_on_weekends?: boolean | null; auto_send_enabled?: boolean | null; follow_up_delay_days?: number | null; max_follow_ups?: number | null; last_run_at: string | null; next_run_at: string | null; created_at?: string | null }>;
  leads: Array<{ id: string; company_name: string; industry: string | null; city: string | null; email: string | null; score: number | null; status: string; created_at: string }>;
  messages: Array<{ id: string; email_to?: string | null; subject: string | null; body?: string | null; status: string; sent_at: string | null; delivered_at?: string | null; opened_at?: string | null; replied_at?: string | null; bounced_at?: string | null; spam_at?: string | null; follow_up_count?: number | null; sequence_step?: number | null; created_at: string; leads?: { company_name?: string } | null }>;
  stats: { campaigns: number; leads: number; sent: number; monthlySent: number; delivered: number; opened: number; replied: number; bounced: number; spam: number; followUpSent: number };
  chartData?: Array<{ label: string; value: number; secondary?: number }>;
  dateRange?: { dateFrom: string; dateTo: string };
};

type ClientView = "overview" | "campaigns" | "leads" | "messages" | "subscription";

const statusLabels: Record<string, string> = {
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
};

const navItems: Array<{ id: ClientView; label: string; icon: string }> = [
  { id: "overview", label: "Przegląd", icon: "⌂" },
  { id: "campaigns", label: "Kampanie", icon: "✦" },
  { id: "leads", label: "Leady", icon: "◌" },
  { id: "messages", label: "Wiadomości", icon: "✉" },
  { id: "subscription", label: "Subskrypcja", icon: "▣" },
];

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function statusLabel(value?: string | null) {
  return statusLabels[value || ""] || value || "-";
}


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

function warmupLimitForPreview(campaigns: PortalData["campaigns"]) {
  const active = campaigns.filter((campaign) => campaign.status === "active");
  const configured = active
    .map((campaign) => {
      const current = dailyLimitForCampaignPreview(campaign);
      const target = targetDailyLimitForCampaignPreview(campaign);
      return current && target ? { current, target } : null;
    })
    .filter((item): item is { current: number; target: number } => Boolean(item));

  if (!active.length) return { configured: false, detail: "Brak aktywnych kampanii" };
  if (!configured.length) return { configured: false, detail: "Brak konfiguracji limitu" };

  const current = configured.reduce((sum, item) => sum + item.current, 0);
  const target = configured.reduce((sum, item) => sum + item.target, 0);
  return { configured: true, detail: `${current}/${target} maili dziś` };
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
  const locked = data.client.subscription_status === "cancel_requested" || data.client.subscription_status === "cancelled";
  const activeMonthlyLimits = data.campaigns
    .filter((campaign) => campaign.status === "active")
    .map(monthlyLimitForCampaignPreview)
    .filter((limit): limit is number => typeof limit === "number" && Number.isFinite(limit));
  const monthlyLimit = activeMonthlyLimits.length
    ? Math.max(activeMonthlyLimits.reduce((sum, limit) => sum + limit, 0), data.stats.monthlySent || 1)
    : null;

  return (
    <Panel eyebrow="Subskrypcja" title="Plan i użycie">
      <div className="subscription-card">
        <div className="plan-chip">Pro</div>
        <div>
          <strong>{data.client.subscription_price ? `${data.client.subscription_price.toLocaleString("pl-PL")} zł netto / mies.` : "Plan aktywny"}</strong>
          <span>Email kontaktowy: {data.client.contact_email || "-"}</span>
        </div>
        <StatusBadge status={data.client.subscription_status}>{statusLabel(data.client.subscription_status)}</StatusBadge>
      </div>
      <div className="usage-stack">
        <ProgressBar label="Wiadomości miesięcznie" value={data.stats.monthlySent} max={Math.max(monthlyLimit ?? data.client.monthly_email_limit ?? data.stats.monthlySent, 1)} tone="blue" />
        <ProgressBar label="Dostarczone" value={data.stats.delivered} max={Math.max(data.stats.sent, 1)} tone="green" />
        <ProgressBar label="Otwarte" value={data.stats.opened} max={Math.max(data.stats.delivered, 1)} tone="violet" />
      </div>
      <div className="subscription-card addon-card">
        <div className="plan-chip">+{ADDITIONAL_MAILBOX_DAILY_EMAILS}</div>
        <div>
          <strong>Dodaj drugą skrzynkę wysyłkową</strong>
          <span>+{ADDITIONAL_MAILBOX_DAILY_EMAILS} maili dziennie za {ADDITIONAL_MAILBOX_PRICE_PLN} zł netto/mies. SalesBot rozdzieli wysyłkę na dwie skrzynki, a odpowiedzi mogą trafiać na jeden główny adres.</span>
        </div>
        <button className="button primary" type="button" onClick={onAddMailbox} disabled={busy || locked}>
          Dodaj za {ADDITIONAL_MAILBOX_PRICE_PLN} zł netto
        </button>
      </div>
      {data.client.subscription_status === "cancel_requested" ? (
        <Notice tone="warning">Prośba o anulowanie została wysłana do administratora. Kampanie zostały wstrzymane do czasu kontaktu.</Notice>
      ) : null}
      <label className="field">
        <span>Powód anulowania</span>
        <textarea
          className="input textarea"
          placeholder="Opcjonalnie: powód anulowania"
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          disabled={locked}
        />
      </label>
      <button className="button danger" type="button" onClick={onCancel} disabled={busy || locked}>
        {busy ? "Wysyłanie zgłoszenia..." : "Zgłoś anulowanie subskrypcji"}
      </button>
    </Panel>
  );
}

export default function ClientPortalPage() {
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
      if (!response.ok) throw new Error(payload.error || "Nie udało się pobrać danych.");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd panelu klienta.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [dateRange.dateFrom, dateRange.dateTo]);

  const latestMessages = useMemo(() => (data?.messages || []).filter((message) => message.status !== "draft").slice(0, 20), [data]);
  const approvalMessages = useMemo(() => (data?.messages || []).filter((message) => message.status === "draft"), [data]);
  const latestLeads = useMemo(() => (data?.leads || []).slice(0, 20), [data]);
  const activeCampaigns = useMemo(() => (data?.campaigns || []).filter((campaign) => campaign.status === "active"), [data]);
  const replies = data?.stats.replied || 0;
  const responseRate = data?.stats.sent ? `${((replies / data.stats.sent) * 100).toFixed(1)}%` : "0%";
  const activeMonthlyLimits = (data?.campaigns || []).filter((campaign) => campaign.status === "active").map(monthlyLimitForCampaignPreview).filter((limit): limit is number => typeof limit === "number" && Number.isFinite(limit));
  const monthlyLimit = activeMonthlyLimits.length ? Math.max(activeMonthlyLimits.reduce((sum, limit) => sum + limit, 0), data?.stats.monthlySent || 1) : null;
  const warmup = data ? warmupLimitForPreview(data.campaigns) : { configured: false, detail: "Brak danych" };
  const dayLabel = new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "short" });
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
    { label: "Wysłane leady", value: (data?.leads || []).filter((lead) => lead.status === "sent").length, color: "#39c070" },
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
      if (!response.ok) throw new Error(payload.error || "Nie udało się utworzyć płatności za dodatkową skrzynkę.");
      if (payload.url) window.location.href = payload.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd płatności za dodatkową skrzynkę.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelSubscription() {
    const confirmed = window.confirm("Czy na pewno chcesz zgłosić anulowanie subskrypcji? Kampanie zostaną zatrzymane, a admin otrzyma status: anulowanie zgłoszone.");
    if (!confirmed) return;
    setBusy(true);
    try {
      const response = await fetch("/api/client-portal/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Nie udało się anulować subskrypcji.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd anulowania subskrypcji.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="login-page"><Panel><EmptyState>Ładowanie panelu klienta...</EmptyState></Panel></main>;
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
          items={navItems}
          activeId={view}
          onSelect={(id) => setView(id as ClientView)}
          cta={
            <>
              <span>Załóż własnego SalesBota</span>
              <strong>Nowa kampania</strong>
              <button className="button primary span" type="button" onClick={() => { window.location.href = "/botseller"; }}>
                Rozpocznij teraz
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
                Wyloguj
              </button>
              <small className="sidebar-security-note">Dla bezpieczeństwa wyloguj się po zakończeniu pracy.</small>
            </>
          }
        />
      }
    >
      <ScreenHeader
        title={view === "overview" ? "Przegląd" : navItems.find((item) => item.id === view)?.label || "Panel klienta"}
        subtitle={`Witaj z powrotem. Podsumowanie aktywności dla ${data.client.company_name}.`}
        action={
          <div className="header-actions">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
            <button className="button" type="button" onClick={() => void load()}>Odśwież</button>
          </div>
        }
      />
      <Notice tone="info">Bot wysyła wiadomości stopniowo w godzinach pracy, żeby chronić dostarczalność.</Notice>

      {view === "overview" ? (
        <>
          <div className="metrics-grid">
            <MetricCard label="Aktywne kampanie" value={activeCampaigns.length} detail={`${data.stats.campaigns} łącznie`} icon="✦" tone="green" />
            <MetricCard label="Wysłane / dostarczone" value={data.stats.delivered.toLocaleString("pl-PL")} detail={`${data.stats.sent} wysłanych`} icon="✉" tone="blue" />
            <MetricCard label="Otwarte" value={data.stats.opened.toLocaleString("pl-PL")} detail={`${responseRate} odpowiedzi`} icon="◎" tone="violet" />
            <MetricCard label="Odpowiedzi" value={replies.toLocaleString("pl-PL")} detail="odebrane od leadów" icon="↻" tone="amber" />
            <MetricCard label="Bounce" value={data.stats.bounced.toLocaleString("pl-PL")} detail="niedostarczone" icon="!" tone="amber" />
            <MetricCard label="Spam" value={data.stats.spam.toLocaleString("pl-PL")} detail="zgłoszenia spam" icon="⊘" tone="blue" />
            <MetricCard label="Follow-upy" value={data.stats.followUpSent.toLocaleString("pl-PL")} detail="wysłane sekwencje" icon="⤴" tone="green" />
            <MetricCard label="Limit miesięczny" value={`${data.stats.monthlySent}/${monthlyLimit ?? "brak"}`} detail={`Warm-up: ${warmup.detail}`} icon="#" tone="blue" />
          </div>
          <div className="dashboard-grid">
            <ChartCard title="Historia kampanii" subtitle="Ostatnie 7 dni">
              <LineChart points={activitySeries} primaryLabel="Wiadomości" secondaryLabel="Leady" />
            </ChartCard>
            <ChartCard title="Leady w pipeline" subtitle="Statusy">
              <DonutChart segments={leadSegments} center={<><strong>{data.stats.leads}</strong><span>leadów</span></>} />
            </ChartCard>
            <Panel eyebrow="Aktywność" title="Ostatnie wysyłki">
              {latestMessages.length ? (
                <div className="compact-list activity-list">
                  {latestMessages.slice(0, 5).map((message) => (
                    <div className="compact-row" key={message.id}>
                      <div><strong>{message.leads?.company_name || "Lead"}</strong><span>{message.subject || "Bez tematu"} · {formatDate(message.sent_at || message.created_at)}</span></div>
                      <StatusBadge status={message.status}>{statusLabel(message.status)}</StatusBadge>
                    </div>
                  ))}
                </div>
              ) : <EmptyState>Brak wiadomości.</EmptyState>}
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

      <SessionGuard timeoutMinutes={60} warningMinutes={2} onLogout={logout} panelLabel="panelu klienta" />
    </DashboardShell>
  );
}

function CampaignsPanel({ campaigns }: { campaigns: PortalData["campaigns"] }) {
  return (
    <Panel eyebrow="Kampanie" title="Aktywne kampanie">
      <div className="compact-list separated">
        {campaigns.map((campaign) => (
          <div className="compact-row" key={campaign.id}>
            <div><strong>{campaign.name}</strong><span>Auto-wysyłka · follow-up {campaign.follow_up_delay_days ?? 2} dni · Następny: {formatDate(campaign.next_run_at)}</span></div>
            <StatusBadge status={campaign.status}>{statusLabel(campaign.status)}</StatusBadge>
          </div>
        ))}
        {!campaigns.length ? <EmptyState>Brak kampanii.</EmptyState> : null}
      </div>
    </Panel>
  );
}

function LeadsPanel({ leads }: { leads: PortalData["leads"] }) {
  return (
    <Panel eyebrow="Leady" title="Ostatnio znalezione">
      <div className="compact-list separated">
        {leads.map((lead) => (
          <div className="compact-row" key={lead.id}>
            <div><strong>{lead.company_name}</strong><span>{lead.industry || "-"} · {lead.city || "-"} · score {lead.score ?? 0}/10</span></div>
            <StatusBadge status={lead.status}>{statusLabel(lead.status)}</StatusBadge>
          </div>
        ))}
        {!leads.length ? <EmptyState>Brak leadów.</EmptyState> : null}
      </div>
    </Panel>
  );
}

function MessagesPanel({ messages, approvalMessages, onReload }: { messages: PortalData["messages"]; approvalMessages: PortalData["messages"]; onReload: () => void }) {
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
      <Panel eyebrow="Akceptacja" title="Maile do akceptacji">
        <div className="compact-list separated">
          {approvalMessages.map((message) => (
            <div className="approval-card" key={message.id}>
              <div className="approval-card__header">
                <div>
                  <strong>{message.leads?.company_name || "Lead"}</strong>
                  <span>Do: {message.email_to || "brak adresu"} · przygotowany {formatDate(message.created_at)}</span>
                </div>
                <StatusBadge status={message.status}>{statusLabel(message.status)}</StatusBadge>
              </div>
              <div className="approval-card__subject">{message.subject || "Bez tematu"}</div>
              <pre className="approval-card__body">{message.body || "Brak treści wiadomości."}</pre>
              <div className="row-actions approval-card__actions">
                <button className="button small primary-soft" type="button" disabled={busyId === message.id} onClick={() => void decide(message.id, "approve")}>Akceptuj</button>
                <button className="button small danger" type="button" disabled={busyId === message.id} onClick={() => void decide(message.id, "reject")}>Odrzuć</button>
              </div>
            </div>
          ))}
          {!approvalMessages.length ? <EmptyState>Brak maili czekających na akceptację.</EmptyState> : null}
        </div>
      </Panel>
      {previewMessage ? (
        <Panel eyebrow="Pełna treść" title={previewMessage.subject || "Bez tematu"}>
          <div className="message-full-meta">
            <span>Lead: {previewMessage.leads?.company_name || "Lead"}</span>
            <span>Do: {previewMessage.email_to || "-"}</span>
            <span>Status: {statusLabel(previewMessage.status)}</span>
            <span>Data: {formatDate(previewMessage.sent_at || previewMessage.created_at)}</span>
          </div>
          <pre className="approval-card__body message-full-body">{previewMessage.body || "Brak treści wiadomości."}</pre>
          <div className="row-actions message-full-actions">
            <button className="button small" type="button" onClick={() => setPreviewMessage(null)}>Zamknij podgląd</button>
          </div>
        </Panel>
      ) : null}
      <Panel eyebrow="Wiadomości" title="Ostatnie wysyłki">
        <div className="compact-list separated">
          {messages.map((message) => (
            <div className="compact-row" key={message.id}>
              <div><strong>{message.leads?.company_name || "Lead"}</strong><span>{message.subject || "Bez tematu"} · {formatDate(message.sent_at || message.created_at)}</span></div>
              <div className="row-actions">
                <button className="button small primary-soft" type="button" onClick={() => setPreviewMessage(message)}>Pełna treść</button>
                <StatusBadge status={message.status}>{statusLabel(message.status)}</StatusBadge>
              </div>
            </div>
          ))}
          {!messages.length ? <EmptyState>Brak wiadomości.</EmptyState> : null}
        </div>
      </Panel>
    </>
  );
}
