"use client";

import type { FormEvent, ReactNode } from "react";
import { useState } from "react";

import { AdminStatsCards } from "@/components/admin/AdminStatsCards";
import DateRangeFilter from "@/components/admin/DateRangeFilter";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  ChartCard,
  DonutChart,
  EmptyState,
  InputField,
  LineChart,
  MetricCard,
  Notice as NoticeBox,
  Panel,
  ProgressBar,
  ScreenHeader,
  SelectField,
  StatusBadge,
  TableCard,
  TextAreaField,
} from "@/components/admin/ui";
import { dateRangeLabel, type DateRangeValue } from "@/lib/dateRange";
import { ADDITIONAL_MAILBOX_DAILY_EMAILS, ADDITIONAL_MAILBOX_PRICE_PLN, BOTSELLER_PLANS } from "@/lib/pricing";
import { LOCATION_SCOPE_LABELS } from "@/lib/locationOptions";
import {
  CAMPAIGN_STATUSES,
  LEAD_STATUSES,
  SECRET_PROVIDERS,
  SUBSCRIPTION_STATUSES,
  type AdminData,
  type Bot,
  type Campaign,
  type CampaignAttachment,
  type ClientAccount,
  type Lead,
  type Message,
  type SecretSummary,
  type SignupOrder,
} from "@/lib/types";
import {
  AttachmentPicker,
  CampaignAttachmentList,
  CampaignSchedulePreview,
  DetailItem,
  FilterCheck,
  GmailAppPasswordHelp,
  LocationPicker,
  MiniStat,
  PersonaSignatureFields,
  TargetSearchPrecisionFields,
  WarmupScheduleFields,
  VISIBLE_LEAD_FILTER_STATUSES,
  VISIBLE_MESSAGE_FILTER_STATUSES,
  applyPlanToOrderForm,
  formatDate,
  formatPrice,
  formFromCampaign,
  generatePortalPassword,
  initialCampaignForm,
  initialClientForm,
  initialLeadFilters,
  initialLeadForm,
  initialMessageFilters,
  initialOrderEditForm,
  initialSecretForm,
  initialSuppressionForm,
  isDeliveredLike,
  isSentLike,
  joinList,
  statusLabel,
  type ClientDetails,
  type DnsCheckResult,
  type TabId,
} from "@/components/admin/adminShared";


function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function SmtpSecretDisplay({ value, fallback, disabled, onReveal }: { value?: string | null; fallback: string; disabled?: boolean; onReveal: () => void }) {
  return (
    <div className="secret-row">
      <code>{value || fallback}</code>
      <button className="eye-button" type="button" disabled={disabled} onClick={onReveal} title={value ? "Odśwież podgląd SMTP" : "Pokaż hasło SMTP"} aria-label="Pokaż hasło SMTP">
        <EyeIcon />
      </button>
    </div>
  );
}

function DnsCheckPanel({ result, onCheck }: { result?: DnsCheckResult; onCheck: () => void }) {
  const cls = (status: string) => status === "ok" ? "dns-ok" : status === "warning" ? "dns-warn" : "dns-bad";
  return (
    <div className="dns-check-card span">
      <div className="row-actions">
        <div>
          <strong>Kontroler DNS</strong>
          <p className="muted-small">Sprawdza MX, SPF, DMARC oraz popularne i własne selectory DKIM dla domeny nadawcy.</p>
        </div>
        <button className="button small" type="button" onClick={onCheck}>Sprawdź DNS</button>
      </div>
      {result ? (
        <div className="dns-check-grid">
          <p className="muted-small">Domena: <strong>{result.domain}</strong> · {formatDate(result.checkedAt)}{result.dkimSelectorsChecked?.length ? ` · DKIM: ${result.dkimSelectorsChecked.join(", ")}` : ""}</p>
          {result.checks.map((item) => (
            <div className="dns-check-row" key={item.key}>
              <div><strong>{item.label}</strong><br />{item.message}</div>
              <span className={cls(item.status)}>{item.status === "ok" ? "OK" : item.status === "warning" ? "Do poprawy" : "Brak"}</span>
            </div>
          ))}
        </div>
      ) : <p className="muted-small">Kliknij „Sprawdź DNS”, żeby ocenić gotowość domeny przed startem kampanii.</p>}
    </div>
  );
}

function TestEmailPreview({ form, client }: { form: typeof initialCampaignForm; client?: ClientAccount | null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; body: string; text?: string; score?: number; aiSummary?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generatePreview() {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Brakuje konfiguracji Supabase w przeglądarce.");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sesja admina wygasła. Zaloguj się ponownie.");
      const response = await fetch("/api/admin/preview-email", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ campaign: form }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; subject?: string; body?: string; text?: string; score?: number; aiSummary?: string };
      if (!response.ok) throw new Error(payload.error || "Nie udało się wygenerować podglądu.");
      setPreview({ subject: payload.subject || "Bez tematu", body: payload.body || "", text: payload.text, score: payload.score, aiSummary: payload.aiSummary });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nie udało się wygenerować podglądu.");
    } finally {
      setLoading(false);
    }
  }

  const persona = [form.bot_first_name || client?.bot_first_name, form.bot_last_name || client?.bot_last_name].filter(Boolean).join(" ") || client?.sender_name || client?.contact_name || "Jan Kowalski";
  const role = form.bot_role || client?.bot_role || "Business Development";
  const company = form.signature_company || client?.signature_company || client?.company_name || "Twoja firma";
  const website = form.signature_website || client?.signature_website || client?.website || "twojastrona.pl";
  const target = form.target_audience_niche || form.target_industries || "wybranych firm";
  const service = form.promoted_service || form.offer_description || "naszej usługi";
  const cta = form.call_to_action || "Czy możemy przesłać krótką propozycję?";
  const fallbackSubject = `Krótka propozycja dla ${target.toString().split(",")[0] || "Państwa firmy"}`;
  const fallbackBody = `Dzień dobry,

trafiłem na Państwa firmę i chciałem krótko zapytać, czy temat ${service} może być dla Państwa aktualny.

${cta}

Pozdrawiam,
${persona}
${role}
${company}
${website}`;
  const shownSubject = preview?.subject || fallbackSubject;
  const shownBody = preview?.text || preview?.body || fallbackBody;

  return (
    <div className="mail-preview-card span">
      <div className="row-actions">
        <div>
          <strong>Przykładowy mail testowy AI</strong>
          <p className="muted-small">Generuje prawdziwy podgląd przez AI bez wysyłki. Służy do kontroli tonu, CTA, targetu i podpisu.</p>
        </div>
        <button className="button small" type="button" onClick={open && preview ? () => setOpen((value) => !value) : generatePreview} disabled={loading || !form.client_id}>
          {loading ? "Generuję..." : open && preview ? "Ukryj" : "Wygeneruj AI"}
        </button>
      </div>
      {error ? <p className="danger-text">{error}</p> : null}
      {open ? (
        <pre><strong>Temat:</strong> {shownSubject}
{preview?.score !== undefined ? `
Score AI: ${preview.score}/10
` : ""}{preview?.aiSummary ? `
Analiza: ${preview.aiSummary}
` : ""}
{shownBody}</pre>
      ) : <p className="muted-small">Podgląd nie wysyła wiadomości. Jeśli OpenAI nie jest ustawione, endpoint użyje bezpiecznego fallbacku.</p>}
    </div>
  );
}


function CampaignTestEmailSender({
  form,
  campaignId,
}: {
  form: typeof initialCampaignForm;
  campaignId?: string | null;
}) {
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger" | "info"; text: string } | null>(null);

  async function sendTestEmail() {
    setLoading(true);
    setMessage({ tone: "info", text: "Generuję pełną wiadomość AI i wysyłam ją przez SMTP klienta..." });
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error("Brakuje konfiguracji Supabase w przeglądarce.");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sesja admina wygasła. Zaloguj się ponownie.");

      const response = await fetch("/api/admin/send-test-email", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ campaign: form, campaignId, to }),
      });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Nie udało się wysłać testowego maila.");
      setMessage({ tone: "success", text: `Pełny testowy mail kampanii został wysłany na ${to}. Sprawdź HTML, treść, podpis, stopkę i załączniki.` });
    } catch (caught) {
      setMessage({ tone: "danger", text: caught instanceof Error ? caught.message : "Nie udało się wysłać testowego maila." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mail-preview-card span">
      <div className="row-actions">
        <div>
          <strong>Wyślij pełny test kampanii</strong>
          <p className="muted-small">System wygeneruje wiadomość AI tak jak dla realnego leada, z HTML, podpisem, stopką i załącznikami, a potem wyśle ją na adres testowy przez SMTP klienta.</p>
        </div>
      </div>
      <div className="form-grid compact-grid">
        <InputField label="Adres testowy" value={to} onChange={setTo} type="email" placeholder="np. twoj@email.pl" help="Tutaj wpisz, gdzie ma dotrzeć testowy mail." />
        <label className="field">
          <span>&nbsp;</span>
          <button className="button primary" type="button" onClick={sendTestEmail} disabled={loading || !to.trim() || !form.client_id}>
            {loading ? "Generuję i wysyłam..." : "Wyślij pełny test"}
          </button>
          <small className="field-help">Nie zapisuje leada i nie wysyła do prawdziwych firm.</small>
        </label>
      </div>
      {message ? <p className={message.tone === "danger" ? "danger-text" : message.tone === "success" ? "success-text" : "muted-small"}>{message.text}</p> : null}
    </div>
  );
}

function CampaignProgrammingFields({ form, setForm }: { form: typeof initialCampaignForm; setForm: (value: typeof initialCampaignForm) => void }) {
  return (
    <>
      <div className="span section-divider">Programowanie bota</div>
      <InputField
        label="Jakich firm szukamy?"
        value={form.target_industries}
        onChange={(value) => setForm({ ...form, target_industries: value, target_audience_niche: value, exact_target_business_type: value, search_keywords: value })}
        placeholder="Np. kluby sportowe, akademie piłkarskie, szkoły, organizacje sportowe"
        help="Najważniejsze pole. Wpisz wyłącznie potencjalnych kupujących, np. kluby sportowe, akademie piłkarskie, szkoły. Nie wpisuj tu tego, co sprzedajesz, np. odzież sportowa albo koszulki."
        required
        span
      />
      <TextAreaField
        label="Czym zajmują się te firmy?"
        value={form.target_business_activities}
        onChange={(value) => setForm({ ...form, target_business_activities: value, target_customer_description: value, customer_pain_points: value })}
        placeholder="Np. prowadzą treningi, organizują mecze i kompletują stroje dla drużyn."
        help="To pole pomaga AI ocenić leady i pisać maile, ale nie jest używane jako główne zapytanie Google. Dzięki temu bot nie szuka producentów produktu, który sprzedajesz."
        span
      />
      <TextAreaField
        label="Czym my się zajmujemy?"
        value={form.client_business_description}
        onChange={(value) => setForm({ ...form, client_business_description: value })}
        placeholder="Np. produkujemy personalizowaną odzież sportową dla klubów i akademii."
        help="Opis firmy, z której bot będzie wysyłał kampanię."
        span
      />
      <TextAreaField
        label="Jaką ofertę proponujemy?"
        value={form.offer_description}
        onChange={(value) => setForm({ ...form, offer_description: value, promoted_service: value, value_proposition: value })}
        placeholder="Np. bezpłatna wizualizacja, wycena i produkcja kompletów meczowych z logo."
        help="Konkretna propozycja, którą bot ma przedstawić w mailu."
        required
        span
      />
      <TextAreaField
        label="Przykładowy mail"
        value={form.sample_email_style}
        onChange={(value) => setForm({ ...form, sample_email_style: value })}
        placeholder={"Dzień dobry,\n\nreprezentuję ...\n\nCzy mogę przesłać więcej informacji?\n\nPozdrawiam"}
        help="Bot skopiuje z niego styl, długość, ton i sposób zakończenia."
        span
      />
      <TextAreaField
        label="Czego bot ma unikać?"
        value={form.avoid_in_messages}
        onChange={(value) => setForm({ ...form, avoid_in_messages: value, lead_disqualification_rules: value, excluded_company_types: value })}
        placeholder="Np. nie pisać agresywnie, nie obiecywać wyników, nie kontaktować sieciówek ani producentów odzieży."
        help="Opcjonalnie. Zasady bezpieczeństwa i typy firm, których bot ma nie ruszać. Twarde słowa wykluczające możesz dopisać niżej w ustawieniach zaawansowanych."
        span
      />
    </>
  );
}



type LiveBotState = {
  status: "running" | "processing" | "waiting_approval" | "waiting_send" | "waiting_run" | "weekend" | "after_hours" | "stopped" | "paused" | "no_bot" | "idle" | "error";
  label: string;
  detail: string;
  badge: string;
  sort: number;
};

function isWeekendInTimezone(date: Date, timezone?: string | null) {
  if (!timezone) return false;
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: timezone }).format(date);
  return weekday === "Sat" || weekday === "Sun";
}

function hourInTimezone(date: Date, timezone?: string | null) {
  if (!timezone) return Number.NaN;
  const value = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: timezone }).format(date);
  return Number(value);
}

function zonedDateLabelAtHour(base: Date, hour: number, timezone: string) {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const datePart = formatter.format(base);
  return `${datePart} ${String(hour).padStart(2, "0")}:00 (${timezone})`;
}

function nextBusinessWindowLabel(startHour: number, timezone: string) {
  const now = new Date();
  for (let offset = 0; offset < 8; offset += 1) {
    const candidate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    if (offset === 0 && hourInTimezone(now, timezone) >= startHour) continue;
    if (!isWeekendInTimezone(candidate, timezone)) return zonedDateLabelAtHour(candidate, startHour, timezone);
  }
  return `najbliższy dzień roboczy, ${startHour}:00 (${timezone})`;
}

function shortRelativeTime(value?: string | null) {
  if (!value) return "brak terminu";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);
  const diffMs = date.getTime() - Date.now();
  const absMinutes = Math.max(Math.round(Math.abs(diffMs) / 60000), 1);
  if (absMinutes < 60) return diffMs >= 0 ? `za ${absMinutes} min` : `${absMinutes} min temu`;
  const hours = Math.round(absMinutes / 60);
  if (hours < 48) return diffMs >= 0 ? `za ${hours} h` : `${hours} h temu`;
  const days = Math.round(hours / 24);
  return diffMs >= 0 ? `za ${days} dni` : `${days} dni temu`;
}

function latestCampaignLog(campaignId: string, logs: AdminData["runLogs"]) {
  return logs.find((log) => log.campaign_id === campaignId) || null;
}

function nextWorkWindowText(campaign: Campaign) {
  if (campaign.next_run_at) return formatDate(campaign.next_run_at);
  const timezone = campaign.sending_timezone || "";
  if (!timezone) return "brak strefy czasu";
  if (campaign.workday_start_hour === null || campaign.workday_start_hour === undefined) return "brak konfiguracji godziny startu";
  const startHour = Number(campaign.workday_start_hour);
  return nextBusinessWindowLabel(startHour, timezone);
}

function liveStateForCampaign(campaign: Campaign, data: Pick<AdminData, "bots" | "campaignRuns" | "sendQueue" | "runLogs">): LiveBotState {
  const bot = data.bots.find((item) => item.id === campaign.bot_id) || null;
  const runningRun = data.campaignRuns.find((run) => run.campaign_id === campaign.id && run.status === "running" && !run.finished_at);
  const processingQueue = data.sendQueue.find((item) => item.campaign_id === campaign.id && item.status === "processing");
  const waitingApproval = data.sendQueue.filter((item) => item.campaign_id === campaign.id && item.status === "awaiting_approval");
  const pendingQueue = data.sendQueue.filter((item) => item.campaign_id === campaign.id && item.status === "pending").sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const failedQueue = data.sendQueue.find((item) => item.campaign_id === campaign.id && item.status === "failed");
  const lastLog = latestCampaignLog(campaign.id, data.runLogs);
  const now = new Date();
  const timezone = campaign.sending_timezone || "";
  const hasTimezone = Boolean(timezone);
  const hasWorkWindow = campaign.workday_start_hour !== null && campaign.workday_start_hour !== undefined && campaign.workday_end_hour !== null && campaign.workday_end_hour !== undefined;
  const startHour = hasWorkWindow ? Number(campaign.workday_start_hour) : null;
  const endHour = hasWorkWindow ? Number(campaign.workday_end_hour) : null;
  const currentHour = hasTimezone ? hourInTimezone(now, timezone) : Number.NaN;
  const isWeekend = hasTimezone ? isWeekendInTimezone(now, timezone) : false;
  const outsideHours = startHour !== null && endHour !== null ? currentHour < startHour || currentHour >= endHour : false;

  if (campaign.status !== "active") {
    return { status: "paused", label: "Kampania wstrzymana", detail: campaign.paused_reason || "Bot nie pracuje, bo kampania nie jest aktywna.", badge: "warning", sort: 80 };
  }
  if (!campaign.bot_id || !bot) {
    return { status: "no_bot", label: "Brak przypisanego bota", detail: "Wybierz bota w ustawieniach kampanii, żeby mogła ruszyć automatycznie.", badge: "danger", sort: 10 };
  }
  if (bot.status === "paused") {
    return { status: "stopped", label: "Bot zatrzymany ręcznie", detail: "Kliknij Wznów w zakładce Boty, żeby kampania mogła pracować.", badge: "warning", sort: 20 };
  }
  if (bot.status === "maintenance") {
    return { status: "stopped", label: "Bot w serwisie", detail: "Kampanie przypisane do tego bota są zatrzymane do czasu wznowienia.", badge: "warning", sort: 21 };
  }
  if (!hasTimezone) {
    return { status: "error", label: "Brak strefy czasu", detail: "Uzupełnij sending_timezone w kampanii. System nie podstawia domyślnej strefy czasu.", badge: "danger", sort: 22 };
  }
  if (!hasWorkWindow || startHour === null || endHour === null) {
    return { status: "error", label: "Brak godzin pracy", detail: "Uzupełnij godzinę startu i końca w ustawieniach kampanii. System nie podstawia domyślnego okna pracy.", badge: "danger", sort: 23 };
  }
  if (runningRun) {
    const stageText = lastLog?.stage ? `Ostatni etap: ${lastLog.stage}` : "Aktualnie trwa run kampanii.";
    return { status: "running", label: "Szuka leadów", detail: `${stageText}${lastLog?.message ? ` · ${lastLog.message}` : ""}`, badge: "info", sort: 1 };
  }
  if (processingQueue) {
    return { status: "processing", label: "Wysyła", detail: `Wysyłka do ${processingQueue.email_to || "odbiorcy"}.`, badge: "info", sort: 2 };
  }
  if (waitingApproval.length) {
    return { status: "waiting_approval", label: "Czeka na akceptację maili", detail: `${waitingApproval.length} wiadomości czeka na zatwierdzenie klienta.`, badge: "warning", sort: 3 };
  }
  if (failedQueue) {
    return { status: "error", label: "Błąd w kolejce", detail: failedQueue.last_error || "Sprawdź kolejkę wysyłki i SMTP.", badge: "danger", sort: 4 };
  }
  if (isWeekend && campaign.send_on_weekends === false) {
    return { status: "weekend", label: "Jest weekend", detail: `Wysyłka i szukanie są wyłączone. Następne okno pracy: ${nextWorkWindowText(campaign)}.`, badge: "warning", sort: 30 };
  }
  if (outsideHours) {
    return { status: "after_hours", label: "Poza godzinami pracy", detail: `Okno pracy: ${startHour}:00-${endHour}:00 (${timezone}). Następne okno pracy: ${nextWorkWindowText(campaign)}.`, badge: "warning", sort: 31 };
  }
  if (pendingQueue.length) {
    return { status: "waiting_send", label: "Czeka na następną wysyłkę", detail: `Najbliższy mail ${shortRelativeTime(pendingQueue[0].scheduled_at)} (${formatDate(pendingQueue[0].scheduled_at)}). W kolejce: ${pendingQueue.length}.`, badge: "info", sort: 40 };
  }
  if (campaign.next_run_at) {
    const nextRun = new Date(campaign.next_run_at);
    if (!Number.isNaN(nextRun.getTime()) && nextRun.getTime() > now.getTime()) {
      return { status: "waiting_run", label: "Czeka na następne okno pracy", detail: `Następne szukanie 1 leada ${shortRelativeTime(campaign.next_run_at)} (${formatDate(campaign.next_run_at)}).`, badge: "info", sort: 50 };
    }
  }
  return { status: "idle", label: "Gotowy do pracy", detail: `Bot czeka na cron. Okno pracy: ${startHour}:00-${endHour}:00 (${timezone}).`, badge: "success", sort: 60 };
}

function botLiveState(bot: Bot, data: Pick<AdminData, "campaigns" | "bots" | "campaignRuns" | "sendQueue" | "runLogs">) {
  const campaigns = data.campaigns.filter((campaign) => campaign.bot_id === bot.id && campaign.status === "active");
  if (bot.status === "paused") return { label: "Bot zatrzymany ręcznie", detail: "Nie szuka leadów i nie wysyła wiadomości.", badge: "warning", sort: 20 };
  if (bot.status === "maintenance") return { label: "Bot w serwisie", detail: "Wstrzymany do czasu wznowienia.", badge: "warning", sort: 21 };
  if (!campaigns.length) return { label: "Wolny", detail: "Nie ma przypisanej aktywnej kampanii.", badge: "success", sort: 70 };
  const states = campaigns
    .map((campaign) => ({ campaign, state: liveStateForCampaign(campaign, data) }))
    .sort((a, b) => a.state.sort - b.state.sort);
  const first = states[0];
  return { label: first.state.label, detail: `${first.campaign.name || "Kampania"}: ${first.state.detail}`, badge: first.state.badge, sort: first.state.sort };
}

function planScopeFromPlanId(planId?: string | null) {
  return BOTSELLER_PLANS.find((plan) => plan.id === planId)?.scope;
}


type AdminHealthPayload = {
  ok?: boolean;
  generatedAt?: string;
  checks?: any;
  recentLogs?: { ok: boolean; items?: Array<{ id: string; level: string; stage: string; message: string; created_at: string }> };
};

type AdminReportPayload = {
  ok?: boolean;
  generatedAt?: string;
  periodDays?: number;
  summary?: Record<string, number>;
  byClient?: Array<Record<string, any>>;
  byCampaign?: Array<Record<string, any>>;
  bestIndustries?: Array<Record<string, any>>;
  bestLocations?: Array<Record<string, any>>;
  recommendation?: string;
};

async function adminJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Brakuje konfiguracji Supabase w przeglądarce.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sesja admina wygasła. Zaloguj się ponownie.");
  const headers = { Authorization: `Bearer ${token}`, ...(options.headers || {}) } as Record<string, string>;
  const response = await fetch(path, { ...options, headers });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(payload.error || "Serwer zwrócił błąd.");
  return payload as T;
}

export function OperationsView({ data, onOpenTab }: { data: AdminData; onOpenTab?: (tab: TabId) => void }) {
  const [health, setHealth] = useState<AdminHealthPayload | null>(null);
  const [report, setReport] = useState<AdminReportPayload | null>(null);
  const [testCampaignId, setTestCampaignId] = useState(data.campaigns.find((campaign) => campaign.status === "active")?.id || "");
  const [testResult, setTestResult] = useState<any | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runHealth() {
    setBusy("health");
    setError(null);
    try {
      setHealth(await adminJson<AdminHealthPayload>("/api/admin/health"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nie udało się pobrać health check.");
    } finally {
      setBusy(null);
    }
  }

  async function runReport(days = 7) {
    setBusy(`report-${days}`);
    setError(null);
    try {
      setReport(await adminJson<AdminReportPayload>(`/api/admin/report?days=${days}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nie udało się pobrać raportu.");
    } finally {
      setBusy(null);
    }
  }

  async function runCampaignTest() {
    if (!testCampaignId) return;
    setBusy("campaign-test");
    setError(null);
    try {
      setTestResult(await adminJson<any>("/api/admin/campaign-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: testCampaignId }),
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nie udało się wykonać testu kampanii.");
    } finally {
      setBusy(null);
    }
  }

  async function runCampaignLiveTest() {
    if (!testCampaignId) return;
    setBusy("campaign-live-test");
    setError(null);
    try {
      setTestResult(await adminJson<any>("/api/admin/campaign-live-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: testCampaignId }),
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nie udało się wykonać realnego testu leada.");
    } finally {
      setBusy(null);
    }
  }

  const invalidActive = data.campaigns.filter((campaign) => campaign.status === "active" && (!campaign.bot_id || campaign.daily_limit === null || campaign.workday_start_hour === null || campaign.workday_end_hour === null || !campaign.sending_timezone));
  const draftMessages = data.messages.filter((message) => message.status === "draft");
  const failedQueue = data.sendQueue.filter((item) => item.status === "failed");

  return (
    <>
      <ScreenHeader
        title="Operacje"
        subtitle="Kokpit techniczny: health check, testy kampanii, alerty, raporty i gotowość systemu do pracy."
        action={
          <div className="header-actions">
            <button className="button" type="button" onClick={runHealth}>{busy === "health" ? "Sprawdzam..." : "Health check"}</button>
            <button className="button" type="button" onClick={() => void runReport(7)}>{busy === "report-7" ? "Raport..." : "Raport 7 dni"}</button>
            <button className="button" type="button" onClick={() => void runReport(30)}>{busy === "report-30" ? "Raport..." : "Raport 30 dni"}</button>
          </div>
        }
      />
      {error ? <NoticeBox tone="danger">{error}</NoticeBox> : null}

      <div className="metrics-grid">
        <MetricCard label="Aktywne kampanie" value={data.campaigns.filter((campaign) => campaign.status === "active").length} />
        <MetricCard label="Błędy konfiguracji" value={invalidActive.length} detail="Brak bota, limitu, godzin lub timezone" />
        <MetricCard label="Maile do akceptacji" value={draftMessages.length} detail="Manual approval" />
        <MetricCard label="Failed queue" value={failedQueue.length} detail="Wymaga reakcji" />
        <MetricCard label="Pending queue" value={data.sendQueueSummary.pending} detail={data.sendQueueSummary.nextSendAt ? `Następna: ${formatDate(data.sendQueueSummary.nextSendAt)}` : "Brak"} />
      </div>

      <Panel eyebrow="Health" title="Status systemu">
        {health ? (
          <div className="detail-grid wide">
            <DetailItem label="Status" value={health.ok ? "OK" : "Problem"} />
            <DetailItem label="Wygenerowano" value={formatDate(health.generatedAt)} />
            <DetailItem label="Kampanie aktywne" value={health.checks?.database?.activeCampaigns?.count ?? "-"} />
            <DetailItem label="Źle skonfigurowane" value={health.checks?.schedulerConfig?.invalidActiveCampaigns ?? "-"} />
            <DetailItem label="Pending queue" value={health.checks?.sendQueue?.pending ?? "-"} />
            <DetailItem label="Failed queue" value={health.checks?.sendQueue?.failed ?? "-"} />
          </div>
        ) : <EmptyState>Kliknij „Health check”, żeby sprawdzić env, Supabase, kolejkę, crony i konfigurację kampanii.</EmptyState>}
        {health?.recentLogs?.items?.length ? (
          <div className="compact-list separated" style={{ marginTop: 14 }}>
            {health.recentLogs.items.slice(0, 6).map((log) => (
              <div className="compact-row" key={log.id}>
                <strong>{log.stage} · {log.level}</strong>
                <span>{log.message} · {formatDate(log.created_at)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </Panel>

      <Panel eyebrow="Dry-run" title="Test kampanii bez wysyłki">
        <div className="filters-grid">
          <SelectField label="Kampania" value={testCampaignId} onChange={setTestCampaignId}>
            <option value="">Wybierz kampanię</option>
            {data.campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name} · {statusLabel(campaign.status)}</option>)}
          </SelectField>
          <button className="button primary" type="button" disabled={!testCampaignId || busy === "campaign-test"} onClick={runCampaignTest}>{busy === "campaign-test" ? "Testuję..." : "Przetestuj konfigurację"}</button>
          <button className="button" type="button" disabled={!testCampaignId || busy === "campaign-live-test"} onClick={runCampaignLiveTest}>{busy === "campaign-live-test" ? "Szukam..." : "Znajdź 1 leada testowo"}</button>
        </div>
        {testResult ? <pre>{JSON.stringify(testResult, null, 2)}</pre> : <p className="muted-small">Test konfiguracji nie odpala Google/OpenAI/SMTP. Test leada odpala Google Places, email finder i OpenAI, ale nie wysyła maila oraz nie zapisuje send_queue.</p>}
      </Panel>

      <Panel eyebrow="Raport" title="Efekty i rekomendacje">
        {report ? (
          <>
            <div className="mini-stats">
              <MiniStat label="Leady" value={report.summary?.leads ?? 0} />
              <MiniStat label="Wysłane" value={report.summary?.sent ?? 0} />
              <MiniStat label="Otwarcia" value={`${report.summary?.openRate ?? 0}%`} />
              <MiniStat label="Odpowiedzi" value={`${report.summary?.replyRate ?? 0}%`} />
              <MiniStat label="Bounce" value={`${report.summary?.bounceRate ?? 0}%`} />
            </div>
            <p className="notes-box"><strong>Rekomendacja:</strong> {report.recommendation}</p>
            <div className="two-column">
              <div className="compact-list separated">
                <strong>Najlepsze kampanie</strong>
                {report.byCampaign?.slice(0, 5).map((item) => <div className="compact-row" key={item.campaignId}><span>{item.name}</span><strong>{item.sent} wysł. · {item.replyRate}% odp.</strong></div>)}
              </div>
              <div className="compact-list separated">
                <strong>Najlepsze branże</strong>
                {report.bestIndustries?.slice(0, 5).map((item) => <div className="compact-row" key={item.industry}><span>{item.industry}</span><strong>{item.leads} leadów · score {item.avgScore}</strong></div>)}
              </div>
            </div>
          </>
        ) : <EmptyState>Kliknij „Raport 7 dni” albo „Raport 30 dni”, żeby wygenerować podsumowanie wyników dla klientów.</EmptyState>}
      </Panel>

      <Panel eyebrow="Priorytety" title="Następne kroki operacyjne">
        <div className="admin-alert-list">
          {invalidActive.length ? <button className="admin-alert-row danger" type="button" onClick={() => onOpenTab?.("campaigns")}><div><strong>Popraw konfigurację kampanii</strong><span>{invalidActive.length} aktywnych kampanii ma braki wymagane przez scheduler.</span></div><StatusBadge status="danger">Pilne</StatusBadge></button> : null}
          {draftMessages.length ? <button className="admin-alert-row warning" type="button" onClick={() => onOpenTab?.("messages")}><div><strong>Zatwierdź wiadomości</strong><span>{draftMessages.length} maili czeka na akceptację przed wysyłką.</span></div><StatusBadge status="warning">Akceptacja</StatusBadge></button> : null}
          {failedQueue.length ? <button className="admin-alert-row danger" type="button" onClick={() => onOpenTab?.("queue")}><div><strong>Napraw failed queue</strong><span>{failedQueue.length} rekordów wysyłki ma błąd.</span></div><StatusBadge status="danger">SMTP/API</StatusBadge></button> : null}
          {!invalidActive.length && !draftMessages.length && !failedQueue.length ? <EmptyState>Brak pilnych działań. System wygląda spokojnie.</EmptyState> : null}
        </div>
      </Panel>
    </>
  );
}

export function Dashboard({
  data,
  stats,
  loading,
  onRefresh,
  dateRange,
  onDateRangeChange,
  onOpenTab,
}: {
  data: AdminData;
  stats: { clients: number; campaigns: number; leads: number; messages: number; approved: number; sent: number; delivered: number; opened: number; replied: number; bounced: number; spam: number; followUps: number };
  loading: boolean;
  onRefresh: () => void;
  dateRange: DateRangeValue;
  onDateRangeChange: (value: DateRangeValue) => void;
  onOpenTab?: (tab: TabId) => void;
}) {
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const activeCampaigns = data.campaigns.filter((campaign) => campaign.status === "active").slice(0, 6);
  const liveCampaignStates = data.campaigns
    .filter((campaign) => campaign.status === "active")
    .map((campaign) => ({ campaign, state: liveStateForCampaign(campaign, data) }))
    .sort((a, b) => a.state.sort - b.state.sort)
    .slice(0, 8);
  const liveBotStates = data.bots
    .map((bot) => ({ bot, state: botLiveState(bot, data) }))
    .sort((a, b) => a.state.sort - b.state.sort)
    .slice(0, 6);
  const latestLeads = data.leads.slice(0, 6);
  const latestActivity = [
    ...data.messages.slice(0, 3).map((message) => ({
      id: `message-${message.id}`,
      title: message.subject || "Wiadomość bez tematu",
      subtitle: message.leads?.company_name || message.client_accounts?.company_name || "Wiadomość",
      status: message.status,
      time: formatDate(message.sent_at || message.created_at),
    })),
    ...data.campaignRuns.slice(0, 3).map((run) => ({
      id: `run-${run.id}`,
      title: run.campaigns?.name || "Run kampanii",
      subtitle: `${run.inserted_leads || 0} leadów · ${run.sent_emails || 0} wysłanych`,
      status: run.status,
      time: formatDate(run.started_at),
    })),
  ].slice(0, 5);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
  const dayLabel = new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "short" });
  const fallbackActivitySeries = days.map((day) => {
    const key = day.toISOString().slice(0, 10);
    const sent = data.messages.filter((message) => (message.sent_at || message.created_at || "").slice(0, 10) === key).length;
    const replies = data.messages.filter((message) => message.status === "replied" && (message.sent_at || message.created_at || "").slice(0, 10) === key).length;
    return { label: dayLabel.format(day).replace(".", ""), value: sent, secondary: replies };
  });
  const activitySeries = data.chartData?.length ? data.chartData : fallbackActivitySeries;
  const pipelineSegments = [
    { label: "Wysłane leady", value: data.leads.filter((lead) => lead.status === "sent").length, color: "#39c070" },
  ];
  const campaignUsage = data.usageSummary;
  const hasCampaignTargets = campaignUsage.totalDailyTarget > 0 || campaignUsage.totalMonthlyTarget > 0;

  return (
    <>
      <ScreenHeader
        title="Przegląd"
        subtitle="Witaj w panelu FluxBase BotSeller. Tu widać klientów, kampanie, leady, wiadomości i ostatnią aktywność AI."
        action={
          <div className="header-actions">
            <DateRangeFilter value={dateRange} onChange={onDateRangeChange} />
            <button className="button" onClick={onRefresh} type="button">
              {loading ? "Odświeżanie..." : "Odśwież"}
            </button>
          </div>
        }
      />
      <AdminStatsCards stats={stats} activeCampaignCount={activeCampaigns.length} trends={data.trends} />

      <Panel eyebrow="Centrum pracy" title="Najkrótsza ścieżka obsługi kampanii">
        <div className="admin-alert-list">
          {[
            { tab: "orders" as TabId, title: "1. Zamówienia", message: `${data.signupOrders.length} zamówień do sprawdzenia, konwersji lub odrzucenia.` },
            { tab: "campaigns" as TabId, title: "2. Kampanie", message: `${data.campaigns.filter((campaign) => campaign.status === "active").length} aktywnych kampanii. Tu ustawiasz target, ofertę, warm-up i bota.` },
            { tab: "bots" as TabId, title: "3. Boty", message: `${data.bots.filter((bot) => bot.status === "active").length}/${data.bots.length} botów aktywnych. Tu zatrzymujesz, wznawiasz i przypisujesz API key.` },
            { tab: "runs" as TabId, title: "4. Runy", message: `${data.campaignRuns.length} runów. Tu sprawdzasz, dlaczego bot znalazł mniej leadów niż cel.` },
            { tab: "queue" as TabId, title: "5. Kolejka", message: `${data.sendQueueSummary.pending} oczekujących, ${data.sendQueueSummary.failed} błędów. Tu widać realną wysyłkę.` },
          ].map((item) => (
            <button className="admin-alert-row info" key={item.tab} type="button" onClick={() => onOpenTab?.(item.tab)}>
              <div>
                <strong>{item.title}</strong>
                <span>{item.message}</span>
              </div>
              <StatusBadge status="info">Otwórz</StatusBadge>
            </button>
          ))}
        </div>
      </Panel>

      <Panel eyebrow="Live" title="Co boty robią teraz">
        <div className="admin-alert-list">
          {liveCampaignStates.length ? liveCampaignStates.map(({ campaign, state }) => (
            <button className={`admin-alert-row ${state.badge}`} key={campaign.id} type="button" onClick={() => onOpenTab?.("campaigns")}>
              <div>
                <strong>{campaign.name}</strong>
                <span>{state.label} · {state.detail}</span>
              </div>
              <StatusBadge status={state.badge}>{state.label}</StatusBadge>
            </button>
          )) : <EmptyState>Brak aktywnych kampanii. Aktywuj kampanię i przypisz bota, żeby zobaczyć status pracy.</EmptyState>}
        </div>
        {liveBotStates.length ? (
          <div className="compact-list separated" style={{ marginTop: 14 }}>
            {liveBotStates.map(({ bot, state }) => (
              <div className="compact-row" key={bot.id}>
                <strong>{bot.name}</strong>
                <span>{state.label} · {state.detail}</span>
              </div>
            ))}
          </div>
        ) : null}
      </Panel>

      <Panel eyebrow="Alerty" title="Powiadomienia admina">
        {data.adminNotifications?.length ? (
          <div className="admin-alert-list">
            {data.adminNotifications.map((item) => (
              <div className={`admin-alert-row ${item.tone}`} key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.message}</span>
                </div>
                <StatusBadge status={item.tone}>{item.tone === "danger" ? "Pilne" : item.tone === "warning" ? "Uwaga" : item.tone === "success" ? "OK" : "Info"}</StatusBadge>
              </div>
            ))}
          </div>
        ) : <EmptyState>Brak powiadomień.</EmptyState>}
      </Panel>

      <div className="dashboard-grid">
        <ChartCard title="Wyniki kampanii" subtitle={dateRangeLabel(dateRange)}>
          <LineChart points={activitySeries} primaryLabel="Wiadomości" secondaryLabel="Odpowiedzi" />
        </ChartCard>
        <ChartCard title="Leady w pipeline" subtitle="Statusy">
          <DonutChart
            segments={pipelineSegments}
            center={<><strong>{stats.leads}</strong><span>leadów</span></>}
          />
        </ChartCard>
        <Panel eyebrow="AI" title="Ostatnia aktywność">
          {latestActivity.length ? (
            <div className="compact-list activity-list">
              {latestActivity.map((item) => (
                <div className="compact-row" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.subtitle}</span>
                  </div>
                  <div className="activity-meta">
                    <StatusBadge status={item.status}>{statusLabel(item.status)}</StatusBadge>
                    <span>{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>Brak ostatniej aktywności.</EmptyState>
          )}
        </Panel>
      </div>

      <div className="two-column">
        <Panel eyebrow="Skuteczność" title="Klienci i kampanie">
          {data.clients.length ? (
            <div className="compact-list separated">
              {data.clients.map((client) => {
                const isOpen = expandedClientId === client.id;
                const clientLeads = data.leads.filter((lead) => lead.client_id === client.id);
                const clientMessages = data.messages.filter((message) => message.client_id === client.id);
                const clientCampaigns = data.campaigns.filter((campaign) => campaign.client_id === client.id);
                return (
                  <div key={client.id} className="client-overview-card">
                    <button className="client-overview-button" type="button" onClick={() => setExpandedClientId(isOpen ? null : client.id)}>
                      <strong>{client.company_name}</strong>
                      <span>{clientCampaigns.length} kampanii · {clientLeads.length} leadów · {clientMessages.filter(isSentLike).length} wysłanych</span>
                    </button>
                    {isOpen ? (
                      <div className="client-overview-details">
                        <div className="mini-stats">
                          <MiniStat label="Kampanie" value={clientCampaigns.length} />
                          <MiniStat label="Leady" value={clientLeads.length} />
                          <MiniStat label="Dostarczone" value={clientMessages.filter(isDeliveredLike).length} />
                          <MiniStat label="Otwarte" value={clientMessages.filter((message) => Boolean(message.opened_at) || ["opened", "replied"].includes(message.status)).length} />
                          <MiniStat label="Spam" value={clientMessages.filter((message) => message.status === "spam" || Boolean(message.spam_at)).length} />
                        </div>
                        <p className="notes-box">
                          Nadawca: {client.sender_email || client.smtp_user || "brak"} · SMTP: {client.smtp_host ? `${client.smtp_host}:${client.smtp_port || 465}` : "brak"}
                        </p>
                        <div className="compact-list">
                          {clientCampaigns.slice(0, 4).map((campaign) => (
                            <div className="compact-row" key={campaign.id}>
                              <div>
                                <strong>{campaign.name}</strong>
                                <span>automat · follow-up {campaign.follow_up_delay_days ?? 2} dni · następny start {formatDate(campaign.next_run_at)}</span>
                              </div>
                              <StatusBadge status={campaign.status}>{statusLabel(campaign.status)}</StatusBadge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState>Brak klientów.</EmptyState>
          )}
        </Panel>
        <Panel eyebrow="Subskrypcja i użycie" title="Limity kampanii">
          <div className="usage-stack">
            {hasCampaignTargets ? (
              <>
                <ProgressBar label="Wysłane w tym miesiącu" value={campaignUsage.sentThisMonth} max={Math.max(campaignUsage.totalMonthlyTarget, campaignUsage.sentThisMonth, 1)} tone="blue" />
                <ProgressBar label="Wysłane dzisiaj" value={campaignUsage.sentToday} max={Math.max(campaignUsage.totalDailyTarget, campaignUsage.sentToday, 1)} tone="green" />
                <div className="limit-summary-grid">
                  <MiniStat label="Zostało dzisiaj" value={`${campaignUsage.dailyRemaining.toLocaleString("pl-PL")} maili`} />
                  <MiniStat label="Zostało w miesiącu" value={`${campaignUsage.monthlyRemaining.toLocaleString("pl-PL")} maili`} />
                  <MiniStat label="Aktywne kampanie" value={campaignUsage.activeCampaignsWithLimits} />
                  <MiniStat label="Brak konfiguracji" value={campaignUsage.campaignsMissingLimits} />
                </div>
              </>
            ) : (
              <div className="notes-box">
                Brak skonfigurowanych limitów aktywnych kampanii. Uzupełnij warm-up, cel dzienny oraz godziny pracy w kampanii.
              </div>
            )}
          </div>
        </Panel>
      </div>

      <div className="two-column">
        <Panel eyebrow="Kampanie" title="Aktywne">
          {activeCampaigns.length ? (
            <div className="compact-list">
              {activeCampaigns.map((campaign) => (
                <div key={campaign.id} className="compact-row">
                  <div>
                    <strong>{campaign.name}</strong>
                    <span>{campaign.client_accounts?.company_name || "-"}</span>
                  </div>
                  <StatusBadge status={campaign.status}>{statusLabel(campaign.status)}</StatusBadge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>Brak aktywnych kampanii.</EmptyState>
          )}
        </Panel>
        <Panel eyebrow="Leady" title="Najnowsze">
          {latestLeads.length ? (
            <div className="compact-list">
              {latestLeads.map((lead) => (
                <div key={lead.id} className="compact-row">
                  <div>
                    <strong>{lead.company_name}</strong>
                    <span>{lead.client_accounts?.company_name || lead.email || "-"}</span>
                  </div>
                  <StatusBadge status={lead.status}>{statusLabel(lead.status)}</StatusBadge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>Brak leadów.</EmptyState>
          )}
        </Panel>
      </div>
    </>
  );
}


export function BotsView({
  bots,
  campaigns,
  liveData,
  form,
  setForm,
  onSubmit,
  editingBotId,
  editForm,
  setEditForm,
  onEdit,
  onSave,
  onCancelEdit,
  onDelete,
  onStatus,
}: {
  bots: Bot[];
  campaigns: Campaign[];
  liveData: Pick<AdminData, "campaigns" | "bots" | "campaignRuns" | "sendQueue" | "runLogs">;
  form: { name: string; status: string; provider: string; model: string; max_parallel_campaigns: string; api_key: string; api_key_action: string; notes: string };
  setForm: (form: any) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  editingBotId: string | null;
  editForm: { name: string; status: string; provider: string; model: string; max_parallel_campaigns: string; api_key: string; api_key_action: string; notes: string };
  setEditForm: (form: any) => void;
  onEdit: (bot: Bot) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onCancelEdit: () => void;
  onDelete: (bot: Bot) => void;
  onStatus: (id: string, status: "active" | "paused" | "maintenance") => void;
}) {
  const campaignsForBot = (botId: string) => campaigns.filter((campaign) => campaign.bot_id === botId);

  return (
    <>
      <ScreenHeader title="Boty" subtitle="Boty mogą działać równolegle. Kampanie z różnymi botami nie blokują się wzajemnie." />
      <Panel eyebrow="Dodaj bota" title="Nowy bot wysyłkowy">
        <form className="form-grid compact-form" onSubmit={onSubmit}>
          <InputField label="Nazwa bota" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
          <SelectField label="Status" value={form.status} onChange={(value) => setForm({ ...form, status: value })}>
            <option value="active">Aktywny</option>
            <option value="paused">Pauza</option>
            <option value="maintenance">Serwis</option>
          </SelectField>
          <InputField label="Provider" value={form.provider} onChange={(value) => setForm({ ...form, provider: value })} />
          <InputField label="Model" value={form.model} onChange={(value) => setForm({ ...form, model: value })} />
          <InputField label="API key bota" value={form.api_key} onChange={(value) => setForm({ ...form, api_key: value, api_key_action: value ? "replace" : form.api_key_action })} placeholder="sk-... / pusty = użyj globalnego OPENAI_API_KEY" />
          <InputField label="Limit aktywnych kampanii" value={form.max_parallel_campaigns} onChange={(value) => setForm({ ...form, max_parallel_campaigns: value })} inputMode="numeric" />
          <TextAreaField label="Notatki" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} span />
          <button className="button primary span" type="submit">Dodaj bota</button>
        </form>
      </Panel>
      <TableCard
        rows={bots}
        empty="Brak botów. Dodaj pierwszego bota przed tworzeniem wielu kampanii."
        columns={["Bot", "Status", "Co robi teraz", "Kampanie", "Obciążenie", "Akcje"]}
        render={(bot) => {
          const botCampaigns = campaignsForBot(bot.id);
          const activeCount = botCampaigns.filter((campaign) => campaign.status === "active").length;
          const live = botLiveState(bot, liveData);
          return (
            <tr key={bot.id}>
              <td><strong>{bot.name}</strong><span>{bot.provider || "openai"} · {bot.model || "model domyślny"} · API {bot.has_api_key ? `••••${bot.api_key_last4 || ""}` : "globalne"}</span></td>
              <td><StatusBadge status={bot.status}>{statusLabel(bot.status)}</StatusBadge></td>
              <td><strong>{live.label}</strong><span>{live.detail}</span></td>
              <td>{botCampaigns.length ? botCampaigns.map((campaign) => campaign.name).join(", ") : "Nieprzypisany"}</td>
              <td><strong>{activeCount}/{bot.max_parallel_campaigns || 1}</strong><span>{bot.status !== "active" ? "zatrzymany ręcznie" : activeCount ? "obsługuje aktywne kampanie" : "wolny"}</span></td>
              <td>
                <div className="row-actions">
                  <button className="button small" type="button" onClick={() => onStatus(bot.id, bot.status === "active" ? "paused" : "active")}>
                    {bot.status === "active" ? "Zatrzymaj" : "Wznów"}
                  </button>
                  <button className="button small" type="button" onClick={() => onEdit(bot)}>Edytuj</button>
                  <button className="button small danger" type="button" onClick={() => onDelete(bot)}>Usuń</button>
                </div>
              </td>
            </tr>
          );
        }}
      />
      {editingBotId ? (
        <Panel eyebrow="Edycja" title="Edytuj bota">
          <form className="form-grid compact-form" onSubmit={onSave}>
            <InputField label="Nazwa bota" value={editForm.name} onChange={(value) => setEditForm({ ...editForm, name: value })} required />
            <SelectField label="Status" value={editForm.status} onChange={(value) => setEditForm({ ...editForm, status: value })}>
              <option value="active">Aktywny</option>
              <option value="paused">Pauza</option>
              <option value="maintenance">Serwis</option>
            </SelectField>
            <InputField label="Provider" value={editForm.provider} onChange={(value) => setEditForm({ ...editForm, provider: value })} />
            <InputField label="Model" value={editForm.model} onChange={(value) => setEditForm({ ...editForm, model: value })} />
            <InputField label="Nowy API key bota" value={editForm.api_key} onChange={(value) => setEditForm({ ...editForm, api_key: value, api_key_action: value ? "replace" : editForm.api_key_action })} placeholder="Zostaw puste, żeby zachować obecny" />
            <SelectField label="Akcja dla API key" value={editForm.api_key_action} onChange={(value) => setEditForm({ ...editForm, api_key_action: value, api_key: value === "clear" ? "" : editForm.api_key })}>
              <option value="preserve">Zachowaj obecny</option>
              <option value="replace">Podmień na wpisany</option>
              <option value="clear">Usuń API key bota</option>
            </SelectField>
            <InputField label="Limit aktywnych kampanii" value={editForm.max_parallel_campaigns} onChange={(value) => setEditForm({ ...editForm, max_parallel_campaigns: value })} inputMode="numeric" />
            <TextAreaField label="Notatki" value={editForm.notes} onChange={(value) => setEditForm({ ...editForm, notes: value })} span />
            <div className="row-actions span"><button className="button primary" type="submit">Zapisz</button><button className="button" type="button" onClick={onCancelEdit}>Anuluj</button></div>
          </form>
        </Panel>
      ) : null}
    </>
  );
}

export function ClientsView({
  clients,
  campaigns,
  leads,
  messages,
  campaignAttachments,
  form,
  setForm,
  onSubmit,
  onStatus,
  onOpen,
  selectedClientId,
  selectedDetails,
  panelLoading,
  mode,
  setMode,
  editForm,
  setEditForm,
  onSave,
  onDelete,
  campaignDraft,
  setCampaignDraft,
  campaignFiles,
  setCampaignFiles,
  onAddCampaign,
  editingCampaignId,
  campaignEditForm,
  setCampaignEditForm,
  campaignEditFiles,
  setCampaignEditFiles,
  onEditCampaign,
  onSaveCampaign,
  onCancelCampaignEdit,
  onCampaignStatus,
  onRunCampaign,
  runningCampaignId,
  onTestSmtp,
  onCampaignDetails,
  revealedSmtpPasses,
  onRevealSmtpPass,
  dnsChecks,
  onCheckDns,
  onToggleAttachment,
  onDeleteAttachment,
}: {
  clients: ClientAccount[];
  bots: Bot[];
  campaigns: Campaign[];
  leads: Lead[];
  messages: Message[];
  campaignAttachments: CampaignAttachment[];
  form: typeof initialClientForm;
  setForm: (value: typeof initialClientForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStatus: (id: string, status: string) => void;
  onOpen: (client: ClientAccount) => void;
  selectedClientId: string | null;
  selectedDetails: ClientDetails | null;
  panelLoading: boolean;
  mode: "view" | "edit";
  setMode: (mode: "view" | "edit") => void;
  editForm: typeof initialClientForm;
  setEditForm: (value: typeof initialClientForm) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: (client: ClientAccount) => void;
  campaignDraft: typeof initialCampaignForm;
  setCampaignDraft: (value: typeof initialCampaignForm) => void;
  campaignFiles: File[];
  setCampaignFiles: (files: File[]) => void;
  onAddCampaign: (event: FormEvent<HTMLFormElement>) => void;
  editingCampaignId: string | null;
  campaignEditForm: typeof initialCampaignForm;
  setCampaignEditForm: (value: typeof initialCampaignForm) => void;
  campaignEditFiles: File[];
  setCampaignEditFiles: (files: File[]) => void;
  onEditCampaign: (campaign: Campaign) => void;
  onSaveCampaign: (event: FormEvent<HTMLFormElement>) => void;
  onCancelCampaignEdit: () => void;
  onCampaignStatus: (id: string, status: string) => void;
  onRunCampaign: (campaignId: string) => void;
  runningCampaignId: string | null;
  onTestSmtp: (clientId: string) => void;
  onCampaignDetails: (campaignId: string) => void;
  revealedSmtpPasses: Record<string, string>;
  onRevealSmtpPass: (clientId: string) => void;
  dnsChecks: Record<string, DnsCheckResult>;
  onCheckDns: (clientId: string) => void;
  onToggleAttachment: (attachment: CampaignAttachment) => void;
  onDeleteAttachment: (attachment: CampaignAttachment) => void;
}) {
  const selectedClient = selectedDetails?.client || clients.find((client) => client.id === selectedClientId) || null;
  const clientCampaigns = selectedDetails?.campaigns || campaigns.filter((campaign) => campaign.client_id === selectedClientId);
  const clientLeads = selectedDetails?.leads || leads.filter((lead) => lead.client_id === selectedClientId);
  const clientMessages = selectedDetails?.messages || messages.filter((message) => message.client_id === selectedClientId);

  return (
    <>
      <ScreenHeader title="Klienci" subtitle="Firmy z abonamentem FluxBase BotSeller i pełnym zarządzaniem z panelu." />
      <div className="client-layout">
        <div>
          <div className="two-column">
            <Panel eyebrow="Klient" title="Nowy klient">
              <form className="form-grid" onSubmit={onSubmit}>
                <InputField label="Nazwa firmy" value={form.company_name} onChange={(value) => setForm({ ...form, company_name: value })} required />
                <InputField label="Osoba kontaktowa" value={form.contact_name} onChange={(value) => setForm({ ...form, contact_name: value })} />
                <InputField label="Email klienta" value={form.contact_email} onChange={(value) => setForm({ ...form, contact_email: value })} type="email" />
                <InputField label="Telefon" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
                <InputField label="Strona" value={form.website} onChange={(value) => setForm({ ...form, website: value })} placeholder="https://firma.pl" />
                <InputField
                  label="Abonament netto PLN/mies."
                  value={form.subscription_price}
                  onChange={(value) => setForm({ ...form, subscription_price: value })}
                  inputMode="decimal"
                />
                <SelectField label="Status" value={form.subscription_status} onChange={(value) => setForm({ ...form, subscription_status: value })}>
                  {SUBSCRIPTION_STATUSES.map((status) => (
                    <option value={status} key={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </SelectField>
                <TextAreaField label="Notatki" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} />
                <div className="span section-divider">Wysyłka maili klienta</div>
                <InputField label="Nazwa nadawcy" value={form.sender_name} onChange={(value) => setForm({ ...form, sender_name: value })} />
                <InputField label="Email nadawcy" value={form.sender_email} onChange={(value) => setForm({ ...form, sender_email: value })} type="email" />
                <InputField label="SMTP host" value={form.smtp_host} onChange={(value) => setForm({ ...form, smtp_host: value })} />
                <InputField label="SMTP port" value={form.smtp_port} onChange={(value) => setForm({ ...form, smtp_port: value })} inputMode="numeric" />
                <FilterCheck label="SMTP secure / SSL" checked={form.smtp_secure} onChange={(checked) => setForm({ ...form, smtp_secure: checked })} />
                <InputField label="SMTP user" value={form.smtp_user} onChange={(value) => setForm({ ...form, smtp_user: value })} />
                <InputField label="SMTP pass / hasło aplikacji Gmail" value={form.smtp_pass} onChange={(value) => setForm({ ...form, smtp_pass: value })} type="password" />
                <GmailAppPasswordHelp />
                <InputField label="From" value={form.smtp_from} onChange={(value) => setForm({ ...form, smtp_from: value })} placeholder="Nazwa <mail@firma.pl>" />
                <InputField label="Reply-To" value={form.smtp_reply_to} onChange={(value) => setForm({ ...form, smtp_reply_to: value })} type="email" />
                <InputField label="DKIM selector" value={form.dkim_selector} onChange={(value) => setForm({ ...form, dkim_selector: value })} placeholder="google / selector1 / własny" help="Opcjonalnie. Przy niestandardowym DKIM wpisz selector z panelu poczty." />
                <PersonaSignatureFields form={form} setForm={setForm} />
                <div className="span section-divider">Panel klienta</div>
                <InputField label="Login klienta" value={form.portal_email} onChange={(value) => setForm({ ...form, portal_email: value })} type="email" />
                <InputField label="Hasło klienta" value={form.portal_password} onChange={(value) => setForm({ ...form, portal_password: value })} type="text" />
                <button
                  className="button span"
                  type="button"
                  onClick={() => setForm({ ...form, portal_email: form.portal_email || form.contact_email, portal_password: generatePortalPassword() })}
                >
                  Wygeneruj login i hasło klienta
                </button>
                <button className="button primary span" type="submit">
                  Dodaj klienta
                </button>
              </form>
            </Panel>
            <Panel eyebrow="Portfel" title="Status abonamentów">
              <div className="mini-stats">
                <MiniStat label="Aktywni" value={clients.filter((client) => client.subscription_status === "active").length} />
                <MiniStat label="Pauza" value={clients.filter((client) => client.subscription_status === "paused").length} />
                <MiniStat label="Anulowanie" value={clients.filter((client) => client.subscription_status === "cancel_requested").length} />
              </div>
            </Panel>
          </div>
          <TableCard
            rows={clients}
            empty="Brak klientów."
            columns={["Firma", "Kontakt", "Abonament", "Status", "Powiązania", "Akcje"]}
            render={(client) => (
              <tr key={client.id} className={client.id === selectedClientId ? "selected-row" : ""}>
                <td>
                  <strong>{client.company_name}</strong>
                  <span>{client.website || "Brak strony"}</span>
                </td>
                <td>
                  {client.contact_name || "-"}
                  <span>{client.contact_email || "Brak emaila"}</span>
                </td>
                <td>{formatPrice(client.subscription_price)}</td>
                <td>
                  <StatusBadge status={client.subscription_status}>{statusLabel(client.subscription_status)}</StatusBadge>
                </td>
                <td>
                  {campaigns.filter((campaign) => campaign.client_id === client.id).length} kampanii
                  <span>{leads.filter((lead) => lead.client_id === client.id).length} leadów</span>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="button small" onClick={() => onOpen(client)} type="button">
                      Szczegóły
                    </button>
                    <button className="button small primary-soft" onClick={() => { void onOpen(client); setMode("edit"); }} type="button">
                      Edytuj
                    </button>
                    <button className="button small" onClick={() => onStatus(client.id, "active")} type="button">
                      Aktywuj
                    </button>
                    <button className="button small" onClick={() => onStatus(client.id, "paused")} type="button">
                      Pauza
                    </button>
                  </div>
                </td>
              </tr>
            )}
          />
        </div>
        <ClientDetailPanel
          client={selectedClient}
          campaigns={clientCampaigns}
          leads={clientLeads}
          messages={clientMessages}
          campaignAttachments={campaignAttachments}
          loading={panelLoading}
          mode={mode}
          setMode={setMode}
          editForm={editForm}
          setEditForm={setEditForm}
          onSave={onSave}
          onDelete={onDelete}
          campaignDraft={campaignDraft}
          setCampaignDraft={setCampaignDraft}
          campaignFiles={campaignFiles}
          setCampaignFiles={setCampaignFiles}
          onAddCampaign={onAddCampaign}
          editingCampaignId={editingCampaignId}
          campaignEditForm={campaignEditForm}
          setCampaignEditForm={setCampaignEditForm}
          campaignEditFiles={campaignEditFiles}
          setCampaignEditFiles={setCampaignEditFiles}
          onEditCampaign={onEditCampaign}
          onSaveCampaign={onSaveCampaign}
          onCancelCampaignEdit={onCancelCampaignEdit}
          onCampaignStatus={onCampaignStatus}
          onRunCampaign={onRunCampaign}
          runningCampaignId={runningCampaignId}
          onTestSmtp={onTestSmtp}
          onCampaignDetails={onCampaignDetails}
          revealedSmtpPasses={revealedSmtpPasses}
          onRevealSmtpPass={onRevealSmtpPass}
          dnsCheck={selectedClient ? dnsChecks[selectedClient.id] : undefined}
          onCheckDns={onCheckDns}
          onToggleAttachment={onToggleAttachment}
          onDeleteAttachment={onDeleteAttachment}
        />
      </div>
    </>
  );
}

export function ClientDetailPanel({
  client,
  campaigns,
  leads,
  messages,
  campaignAttachments,
  loading,
  mode,
  setMode,
  editForm,
  setEditForm,
  onSave,
  onDelete,
  campaignDraft,
  setCampaignDraft,
  campaignFiles,
  setCampaignFiles,
  onAddCampaign,
  editingCampaignId,
  campaignEditForm,
  setCampaignEditForm,
  campaignEditFiles,
  setCampaignEditFiles,
  onEditCampaign,
  onSaveCampaign,
  onCancelCampaignEdit,
  onCampaignStatus,
  onRunCampaign,
  runningCampaignId,
  onTestSmtp,
  onCampaignDetails,
  revealedSmtpPasses,
  onRevealSmtpPass,
  dnsCheck,
  onCheckDns,
  onToggleAttachment,
  onDeleteAttachment,
}: {
  client: ClientAccount | null;
  campaigns: Campaign[];
  leads: Lead[];
  messages: Message[];
  campaignAttachments: CampaignAttachment[];
  loading: boolean;
  mode: "view" | "edit";
  setMode: (mode: "view" | "edit") => void;
  editForm: typeof initialClientForm;
  setEditForm: (value: typeof initialClientForm) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: (client: ClientAccount) => void;
  campaignDraft: typeof initialCampaignForm;
  setCampaignDraft: (value: typeof initialCampaignForm) => void;
  campaignFiles: File[];
  setCampaignFiles: (files: File[]) => void;
  onAddCampaign: (event: FormEvent<HTMLFormElement>) => void;
  editingCampaignId: string | null;
  campaignEditForm: typeof initialCampaignForm;
  setCampaignEditForm: (value: typeof initialCampaignForm) => void;
  campaignEditFiles: File[];
  setCampaignEditFiles: (files: File[]) => void;
  onEditCampaign: (campaign: Campaign) => void;
  onSaveCampaign: (event: FormEvent<HTMLFormElement>) => void;
  onCancelCampaignEdit: () => void;
  onCampaignStatus: (id: string, status: string) => void;
  onRunCampaign: (campaignId: string) => void;
  runningCampaignId: string | null;
  onTestSmtp: (clientId: string) => void;
  onCampaignDetails: (campaignId: string) => void;
  revealedSmtpPasses: Record<string, string>;
  onRevealSmtpPass: (clientId: string) => void;
  dnsCheck?: DnsCheckResult;
  onCheckDns: (clientId: string) => void;
  onToggleAttachment: (attachment: CampaignAttachment) => void;
  onDeleteAttachment: (attachment: CampaignAttachment) => void;
}) {
  if (!client) {
    return (
      <aside className="detail-sidebar">
        <Panel eyebrow="Szczegóły" title="Wybierz klienta">
          <EmptyState>Kliknij „Szczegóły” przy kliencie, aby zobaczyć dane, kampanie, leady i wiadomości.</EmptyState>
        </Panel>
      </aside>
    );
  }

  const latestLeads = leads.slice(0, 6);
  const latestMessages = messages.slice(0, 6);
  const revealedClientSmtp = revealedSmtpPasses[`clients:${client.id}`];

  return (
    <aside className="detail-sidebar">
      <Panel
        eyebrow="Klient"
        title={client.company_name}
        footer={
          <div className="row-actions">
            {mode === "view" ? (
              <button className="button" onClick={() => setMode("edit")} type="button">
                Edytuj klienta
              </button>
            ) : (
              <button className="button ghost" onClick={() => setMode("view")} type="button">
                Anuluj
              </button>
            )}
            <button className="button" onClick={() => onTestSmtp(client.id)} type="button">
              Test SMTP
            </button>
            <button className="button danger" onClick={() => onDelete(client)} type="button">
              Usuń klienta
            </button>
          </div>
        }
      >
        {loading ? <EmptyState>Ładowanie szczegółów...</EmptyState> : null}
        {mode === "edit" ? (
          <form className="form-grid compact-form" onSubmit={onSave}>
            <InputField label="Nazwa firmy" value={editForm.company_name} onChange={(value) => setEditForm({ ...editForm, company_name: value })} required span />
            <InputField label="Osoba kontaktowa" value={editForm.contact_name} onChange={(value) => setEditForm({ ...editForm, contact_name: value })} />
            <InputField label="Email" value={editForm.contact_email} onChange={(value) => setEditForm({ ...editForm, contact_email: value })} type="email" />
            <InputField label="Telefon" value={editForm.phone} onChange={(value) => setEditForm({ ...editForm, phone: value })} />
            <InputField label="Strona" value={editForm.website} onChange={(value) => setEditForm({ ...editForm, website: value })} />
            <InputField
              label="Abonament"
              value={editForm.subscription_price}
              onChange={(value) => setEditForm({ ...editForm, subscription_price: value })}
              inputMode="decimal"
            />
            <SelectField label="Status" value={editForm.subscription_status} onChange={(value) => setEditForm({ ...editForm, subscription_status: value })}>
              {SUBSCRIPTION_STATUSES.map((status) => (
                <option value={status} key={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </SelectField>
            <TextAreaField label="Notatki" value={editForm.notes} onChange={(value) => setEditForm({ ...editForm, notes: value })} />
            <div className="span section-divider">Wysyłka maili klienta</div>
            <InputField label="Nazwa nadawcy" value={editForm.sender_name} onChange={(value) => setEditForm({ ...editForm, sender_name: value })} />
            <InputField label="Email nadawcy" value={editForm.sender_email} onChange={(value) => setEditForm({ ...editForm, sender_email: value })} type="email" />
            <InputField label="SMTP host" value={editForm.smtp_host} onChange={(value) => setEditForm({ ...editForm, smtp_host: value })} />
            <InputField label="SMTP port" value={editForm.smtp_port} onChange={(value) => setEditForm({ ...editForm, smtp_port: value })} inputMode="numeric" />
            <FilterCheck label="SMTP secure / SSL" checked={editForm.smtp_secure} onChange={(checked) => setEditForm({ ...editForm, smtp_secure: checked })} />
            <InputField label="SMTP user" value={editForm.smtp_user} onChange={(value) => setEditForm({ ...editForm, smtp_user: value })} />
            <InputField label={client.smtp_pass_last4 ? `SMTP pass - ustawione ****${client.smtp_pass_last4}` : "SMTP pass / hasło aplikacji Gmail"} value={editForm.smtp_pass} onChange={(value) => setEditForm({ ...editForm, smtp_pass: value })} type="password" />
            <GmailAppPasswordHelp />
            <InputField label="From" value={editForm.smtp_from} onChange={(value) => setEditForm({ ...editForm, smtp_from: value })} placeholder="Nazwa <mail@firma.pl>" />
            <InputField label="Reply-To" value={editForm.smtp_reply_to} onChange={(value) => setEditForm({ ...editForm, smtp_reply_to: value })} type="email" />
            <InputField label="DKIM selector" value={editForm.dkim_selector} onChange={(value) => setEditForm({ ...editForm, dkim_selector: value })} placeholder="google / selector1 / własny" help="Opcjonalnie. Kontroler DNS sprawdzi też ten selector." />
            <PersonaSignatureFields form={editForm} setForm={setEditForm} />
            <div className="span section-divider">Panel klienta</div>
            <InputField label="Login klienta" value={editForm.portal_email} onChange={(value) => setEditForm({ ...editForm, portal_email: value })} type="email" />
            <InputField label={client.portal_password_last4 ? `Hasło klienta - ustawione ****${client.portal_password_last4}` : "Hasło klienta"} value={editForm.portal_password} onChange={(value) => setEditForm({ ...editForm, portal_password: value })} type="text" />
            <button
              className="button span"
              type="button"
              onClick={() => setEditForm({ ...editForm, portal_email: editForm.portal_email || editForm.contact_email, portal_password: generatePortalPassword() })}
            >
              Wygeneruj nowe hasło klienta
            </button>
            <button className="button primary span" type="submit">
              Zapisz
            </button>
          </form>
        ) : (
          <>
            <div className="detail-grid">
              <DetailItem label="Osoba kontaktowa" value={client.contact_name} />
              <DetailItem label="Email" value={client.contact_email} />
              <DetailItem label="Telefon" value={client.phone} />
              <DetailItem label="Strona www" value={client.website} />
              <DetailItem label="Nadawca" value={client.sender_email || client.smtp_user} />
              <DetailItem label="SMTP" value={client.smtp_host ? `${client.smtp_host}:${client.smtp_port || 465}` : "Brak"} />
              <DetailItem label="DKIM selector" value={client.dkim_selector || "Automatycznie"} />
              <DetailItem label="SMTP pass" value={client.smtp_pass_last4 ? `Zaszyfrowane · ****${client.smtp_pass_last4}` : "Brak"} />
              <DetailItem label="Login panelu klienta" value={client.portal_email || "Brak"} />
              <DetailItem label="Hasło panelu klienta" value={client.portal_password_last4 ? `****${client.portal_password_last4}` : "Brak"} />
              <DetailItem label="Cena abonamentu" value={formatPrice(client.subscription_price)} />
              <DetailItem label="Anulowanie zgłoszone" value={formatDate(client.cancel_requested_at)} />
              <DetailItem label="Powód anulowania" value={client.cancel_reason} />
              <DetailItem label="Utworzono" value={formatDate(client.created_at)} />
            </div>
            <div className="detail-status">
              <StatusBadge status={client.subscription_status}>{statusLabel(client.subscription_status)}</StatusBadge>
            </div>
            <SmtpSecretDisplay
              value={revealedClientSmtp}
              fallback={client.smtp_pass_last4 ? `Zaszyfrowane w bazie · ****${client.smtp_pass_last4}` : "Brak zapisanego hasła SMTP"}
              disabled={!client.smtp_pass_last4}
              onReveal={() => onRevealSmtpPass(client.id)}
            />
            <DnsCheckPanel result={dnsCheck} onCheck={() => onCheckDns(client.id)} />
            <p className="notes-box">{client.notes || "Brak notatek."}</p>
          </>
        )}
      </Panel>

      <div className="metrics-grid compact-metrics">
        <MetricCard label="Kampanie" value={campaigns.length} />
        <MetricCard label="Leady" value={leads.length} />
        <MetricCard label="Wiadomości" value={messages.length} />
      </div>

      <Panel eyebrow="Kampanie klienta" title="Zarządzanie kampaniami">
        <form className="form-grid compact-form" onSubmit={onAddCampaign}>
          <InputField label="Nazwa" value={campaignDraft.name} onChange={(value) => setCampaignDraft({ ...campaignDraft, name: value })} required span />
          <LocationPicker
            scope={campaignDraft.location_scope}
            locations={campaignDraft.target_locations}
            planScope={planScopeFromPlanId(client.plan_id)}
            onChange={(next) => setCampaignDraft({ ...campaignDraft, ...next })}
          />
          <CampaignProgrammingFields form={campaignDraft} setForm={setCampaignDraft} />
          <InputField label="Call to action" value={campaignDraft.call_to_action} onChange={(value) => setCampaignDraft({ ...campaignDraft, call_to_action: value })} placeholder="Np. Czy mogę przesłać przykładowe realizacje?" span />
          <div className="span section-divider">Harmonogram wysyłki dziennej</div>
          <PersonaSignatureFields form={campaignDraft} setForm={setCampaignDraft} />
          <WarmupScheduleFields form={campaignDraft} setForm={setCampaignDraft} />
          <InputField label="Limit miesięczny kampanii (opcjonalny)" value={campaignDraft.monthly_limit} onChange={(value) => setCampaignDraft({ ...campaignDraft, monthly_limit: value })} inputMode="numeric" />
          <InputField label="Godzina startu" value={campaignDraft.workday_start_hour} onChange={(value) => setCampaignDraft({ ...campaignDraft, workday_start_hour: value })} inputMode="numeric" />
          <InputField label="Godzina końca" value={campaignDraft.workday_end_hour} onChange={(value) => setCampaignDraft({ ...campaignDraft, workday_end_hour: value })} inputMode="numeric" />
          <InputField label="Strefa czasu" value={campaignDraft.sending_timezone} onChange={(value) => setCampaignDraft({ ...campaignDraft, sending_timezone: value })} placeholder="Europe/Warsaw" />
          <CampaignSchedulePreview form={campaignDraft} client={client} />
          <TestEmailPreview form={campaignDraft} client={client} />
          <CampaignTestEmailSender form={campaignDraft} />
          <InputField label="Follow-up po ilu dniach" value={campaignDraft.follow_up_delay_days} onChange={(value) => setCampaignDraft({ ...campaignDraft, follow_up_delay_days: value })} inputMode="numeric" />
          <InputField label="Maks. follow-upów" value={campaignDraft.max_follow_ups} onChange={(value) => setCampaignDraft({ ...campaignDraft, max_follow_ups: value })} inputMode="numeric" />
          <FilterCheck label="Tryb testowy, maksymalnie 3 wysyłki" checked={campaignDraft.test_mode} onChange={(checked) => setCampaignDraft({ ...campaignDraft, test_mode: checked })} />
          <FilterCheck label="Automat: szukaj 1 leada w wyliczonych oknach pracy" checked={campaignDraft.auto_run_enabled} onChange={(checked) => setCampaignDraft({ ...campaignDraft, auto_run_enabled: checked })} />
          <FilterCheck label="Przed wysyłką poproś klienta o akceptację" checked={campaignDraft.requires_approval_before_send} onChange={(checked) => setCampaignDraft({ ...campaignDraft, requires_approval_before_send: checked })} />
          <FilterCheck label="Bot może pracować w weekendy" checked={campaignDraft.send_on_weekends} onChange={(checked) => setCampaignDraft({ ...campaignDraft, send_on_weekends: checked })} />
          <AttachmentPicker files={campaignFiles} onChange={setCampaignFiles} />
          <button className="button primary span" type="submit">
            Dodaj kampanię
          </button>
        </form>
        <div className="compact-list separated">
          {campaigns.length ? (
            campaigns.map((campaign) =>
              editingCampaignId === campaign.id ? (
                <form className="inline-edit" key={campaign.id} onSubmit={onSaveCampaign}>
                  <InputField label="Nazwa" value={campaignEditForm.name} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, name: value })} required span />
                  <LocationPicker
                    scope={campaignEditForm.location_scope}
                    locations={campaignEditForm.target_locations}
                    planScope={planScopeFromPlanId(client.plan_id)}
                    onChange={(next) => setCampaignEditForm({ ...campaignEditForm, ...next })}
                  />
                  <CampaignProgrammingFields form={campaignEditForm} setForm={setCampaignEditForm} />
                  <InputField label="Call to action" value={campaignEditForm.call_to_action} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, call_to_action: value })} placeholder="Np. Czy mogę przesłać przykładowe realizacje?" span />
            <div className="span section-divider">Harmonogram wysyłki dziennej</div>
            <PersonaSignatureFields form={campaignEditForm} setForm={setCampaignEditForm} />
            <WarmupScheduleFields form={campaignEditForm} setForm={setCampaignEditForm} />
            <InputField label="Limit miesięczny kampanii (opcjonalny)" value={campaignEditForm.monthly_limit} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, monthly_limit: value })} inputMode="numeric" />
            <InputField label="Godzina startu" value={campaignEditForm.workday_start_hour} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, workday_start_hour: value })} inputMode="numeric" />
            <InputField label="Godzina końca" value={campaignEditForm.workday_end_hour} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, workday_end_hour: value })} inputMode="numeric" />
            <InputField label="Strefa czasu" value={campaignEditForm.sending_timezone} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, sending_timezone: value })} />
            <CampaignSchedulePreview form={campaignEditForm} client={client} />
                  <TestEmailPreview form={campaignEditForm} client={client} />
                  <CampaignTestEmailSender form={campaignEditForm} campaignId={campaign.id} />
                  <SelectField label="Status" value={campaignEditForm.status} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, status: value })}>
                    {CAMPAIGN_STATUSES.map((status) => (
                      <option value={status} key={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </SelectField>
                  <InputField label="Follow-up po dniach" value={campaignEditForm.follow_up_delay_days} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, follow_up_delay_days: value })} inputMode="numeric" />
                  <InputField label="Maks. follow-upów" value={campaignEditForm.max_follow_ups} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, max_follow_ups: value })} inputMode="numeric" />
                  <FilterCheck label="Tryb testowy" checked={campaignEditForm.test_mode} onChange={(checked) => setCampaignEditForm({ ...campaignEditForm, test_mode: checked })} />
                  <FilterCheck label="Automat: szukaj 1 leada w wyliczonych oknach pracy" checked={campaignEditForm.auto_run_enabled} onChange={(checked) => setCampaignEditForm({ ...campaignEditForm, auto_run_enabled: checked })} />
                  <FilterCheck label="Przed wysyłką poproś klienta o akceptację" checked={campaignEditForm.requires_approval_before_send} onChange={(checked) => setCampaignEditForm({ ...campaignEditForm, requires_approval_before_send: checked })} />
                  <FilterCheck label="Bot może pracować w weekendy" checked={campaignEditForm.send_on_weekends} onChange={(checked) => setCampaignEditForm({ ...campaignEditForm, send_on_weekends: checked })} />
                  <InputField label="Ton" value={campaignEditForm.tone} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, tone: value })} span />
                  <AttachmentPicker files={campaignEditFiles} onChange={setCampaignEditFiles} label="Dodaj nowe załączniki" />
                  <div className="span">
                    <CampaignAttachmentList
                      attachments={campaignAttachments.filter((attachment) => attachment.campaign_id === campaign.id)}
                      onToggle={onToggleAttachment}
                      onDelete={onDeleteAttachment}
                    />
                  </div>
                  <div className="row-actions span">
                    <button className="button primary small" type="submit">
                      Zapisz
                    </button>
                    <button className="button small" type="button" onClick={onCancelCampaignEdit}>
                      Anuluj
                    </button>
                  </div>
                </form>
              ) : (
                <div key={campaign.id} className="compact-row">
                  <div>
                    <strong>{campaign.name}</strong>
                    <span>{joinList(campaign.target_industries)} · {joinList(campaign.target_locations)}</span>
                  </div>
                  <div className="row-actions">
                    <StatusBadge status={campaign.status}>{statusLabel(campaign.status)}</StatusBadge>
                    <button className="button small" type="button" onClick={() => onEditCampaign(campaign)}>
                      Edytuj
                    </button>
                    <button className="button small" type="button" onClick={() => onCampaignStatus(campaign.id, campaign.status === "active" ? "paused" : "active")}>
                      {campaign.status === "active" ? "Pauza" : "Aktywuj"}
                    </button>
                    <button className="button small primary-soft" type="button" disabled={runningCampaignId === campaign.id || campaign.status !== "active"} onClick={() => onRunCampaign(campaign.id)}>
                      {runningCampaignId === campaign.id ? "Bot pracuje..." : "Uruchom bota"}
                    </button>
                    <button className="button small" type="button" onClick={() => onCampaignDetails(campaign.id)}>
                      Szczegóły
                    </button>
                  </div>
                  <div className="campaign-attachments-inline">
                    Załączniki: {campaignAttachments.filter((attachment) => attachment.campaign_id === campaign.id && attachment.is_active).length}
                  </div>
                </div>
              ),
            )
          ) : (
            <EmptyState>Ten klient nie ma jeszcze kampanii.</EmptyState>
          )}
        </div>
      </Panel>

      <Panel eyebrow="Leady" title="Ostatnie leady klienta">
        {latestLeads.length ? (
          <div className="compact-list">
            {latestLeads.map((lead) => (
              <div className="compact-row" key={lead.id}>
                <div>
                  <strong>{lead.company_name}</strong>
                  <span>{lead.email || "Brak emaila"} · score {lead.score ?? 0}/10</span>
                </div>
                <StatusBadge status={lead.status}>{statusLabel(lead.status)}</StatusBadge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Brak leadów klienta.</EmptyState>
        )}
      </Panel>

      <Panel eyebrow="Wiadomości" title="Ostatnie wiadomości klienta">
        {latestMessages.length ? (
          <div className="compact-list">
            {latestMessages.map((message) => (
              <div className="compact-row" key={message.id}>
                <div>
                  <strong>{message.subject || "Bez tematu"}</strong>
                  <span>{message.leads?.company_name || "-"} · {formatDate(message.created_at)}</span>
                </div>
                <StatusBadge status={message.status}>{statusLabel(message.status)}</StatusBadge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Brak wiadomości klienta.</EmptyState>
        )}
      </Panel>
    </aside>
  );
}

export function CampaignsView({
  clients,
  bots,
  campaigns,
  attachments,
  liveData,
  form,
  setForm,
  campaignFiles,
  setCampaignFiles,
  onSubmit,
  onStatus,
  onRunCampaign,
  runningCampaignId,
  selectedCampaignId,
  setSelectedCampaignId,
  editingCampaignId,
  campaignEditForm,
  setCampaignEditForm,
  campaignEditFiles,
  setCampaignEditFiles,
  onEditCampaign,
  onSaveCampaign,
  onCancelCampaignEdit,
  onToggleAttachment,
  onDeleteAttachment,
}: {
  clients: ClientAccount[];
  bots: Bot[];
  campaigns: Campaign[];
  attachments: CampaignAttachment[];
  liveData: Pick<AdminData, "bots" | "campaignRuns" | "sendQueue" | "runLogs">;
  form: typeof initialCampaignForm;
  setForm: (value: typeof initialCampaignForm) => void;
  campaignFiles: File[];
  setCampaignFiles: (files: File[]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStatus: (id: string, status: string) => void;
  onRunCampaign: (campaignId: string) => void;
  runningCampaignId: string | null;
  selectedCampaignId: string | null;
  setSelectedCampaignId: (id: string | null) => void;
  editingCampaignId: string | null;
  campaignEditForm: typeof initialCampaignForm;
  setCampaignEditForm: (value: typeof initialCampaignForm) => void;
  campaignEditFiles: File[];
  setCampaignEditFiles: (files: File[]) => void;
  onEditCampaign: (campaign: Campaign) => void;
  onSaveCampaign: (event: FormEvent<HTMLFormElement>) => void;
  onCancelCampaignEdit: () => void;
  onToggleAttachment: (attachment: CampaignAttachment) => void;
  onDeleteAttachment: (attachment: CampaignAttachment) => void;
}) {
  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) || null;
  const selectedCampaignAttachments = selectedCampaign ? attachments.filter((attachment) => attachment.campaign_id === selectedCampaign.id) : [];

  return (
    <>
      <ScreenHeader title="Kampanie" subtitle="Targety, oferta, limity i ton wiadomości. Bot szuka 1 leada przed każdą wysyłką." />
      {selectedCampaign ? (
        <Panel
          eyebrow="Szczegóły kampanii"
          title={selectedCampaign.name}
          footer={
            <div className="row-actions">
              <button className="button small primary-soft" type="button" disabled={runningCampaignId === selectedCampaign.id || selectedCampaign.status !== "active"} onClick={() => onRunCampaign(selectedCampaign.id)}>
                {runningCampaignId === selectedCampaign.id ? "Bot pracuje..." : "Uruchom bota"}
              </button>
              <button className="button small" type="button" onClick={() => onEditCampaign(selectedCampaign)}>
                Edytuj
              </button>
              <button className="button small" type="button" onClick={() => setSelectedCampaignId(null)}>
                Zamknij
              </button>
            </div>
          }
        >
          <div className="detail-grid wide">
            <DetailItem label="Klient" value={selectedCampaign.client_accounts?.company_name} />
            <DetailItem label="Status" value={statusLabel(selectedCampaign.status)} />
            <DetailItem label="Co bot robi teraz" value={`${liveStateForCampaign(selectedCampaign, liveData).label} · ${liveStateForCampaign(selectedCampaign, liveData).detail}`} />
            <DetailItem label="Jakich firm szukamy" value={joinList(selectedCampaign.target_industries)} />
            <DetailItem label="Lokalizacje" value={joinList(selectedCampaign.target_locations)} />
            <DetailItem label="Tryb automatyczny" value={selectedCampaign.auto_run_enabled === false ? "Wyłączony" : "Włączony, cron sprawdza kampanie co minutę i uruchamia tylko te, których indywidualne okno właśnie nadeszło"} />
            <DetailItem label="Bot" value={bots.find((bot) => bot.id === selectedCampaign.bot_id)?.name || "Nieprzypisany"} />
            <DetailItem label="Tryb wysyłki" value={selectedCampaign.requires_approval_before_send ? "Klient akceptuje przed wysyłką" : "Automatyczny"} />
            <DetailItem label="Weekendy" value={selectedCampaign.send_on_weekends ? "Włączone" : "Wyłączone"} />
            <DetailItem label="Cel dzienny" value={selectedCampaign.daily_limit ? `${selectedCampaign.daily_limit} maili` : "Nie ustawiono w panelu"} />
            <DetailItem label="Schedule warm-upu" value={Array.isArray(selectedCampaign.warmup_daily_limits) && selectedCampaign.warmup_daily_limits.length ? selectedCampaign.warmup_daily_limits.join(" → ") : "Brak schedule warm-upu"} />
            <DetailItem label="Limit miesięczny kampanii" value={selectedCampaign.monthly_limit ? `${selectedCampaign.monthly_limit} maili` : "Auto: miesiąc kalendarzowy minus weekendy, jeśli wyłączone"} />
            <DetailItem label="Okno wysyłki" value={selectedCampaign.workday_start_hour !== null && selectedCampaign.workday_start_hour !== undefined && selectedCampaign.workday_end_hour !== null && selectedCampaign.workday_end_hour !== undefined ? `${selectedCampaign.workday_start_hour}:00-${selectedCampaign.workday_end_hour}:00` : "Nie ustawiono w panelu"} />
            <DetailItem label="Szacowany odstęp" value={selectedCampaign.daily_limit && selectedCampaign.workday_start_hour !== null && selectedCampaign.workday_start_hour !== undefined && selectedCampaign.workday_end_hour !== null && selectedCampaign.workday_end_hour !== undefined ? `około co ${Math.max(Math.round(((selectedCampaign.workday_end_hour - selectedCampaign.workday_start_hour) * 60) / Math.max(Number(selectedCampaign.daily_limit), 1)), 1)} min, ale zawsze 1 lead przed 1 wysyłką` : "Uzupełnij cel dzienny oraz godziny pracy"} />
            <DetailItem label="Follow-up" value={`${selectedCampaign.follow_up_delay_days ?? 2} dni · maks. ${selectedCampaign.max_follow_ups ?? 1}`} />
            <DetailItem label="Następny start" value={formatDate(selectedCampaign.next_run_at)} />
            <DetailItem label="Utworzono" value={formatDate(selectedCampaign.created_at)} />
          </div>
          <p className="notes-box"><strong>Oferta:</strong> {selectedCampaign.offer_description || "Brak opisu oferty."}</p>
          <div className="detail-grid wide">
            <DetailItem label="Czym my się zajmujemy" value={selectedCampaign.client_business_description} />
            <DetailItem label="Promowana usługa" value={selectedCampaign.promoted_service} />
            <DetailItem label="Dlaczego warto" value={selectedCampaign.value_proposition} />
            <DetailItem label="Docelowa grupa / nisza" value={selectedCampaign.target_audience_niche} />
            <DetailItem label="Osoba decyzyjna" value={selectedCampaign.decision_maker_roles} />
            <DetailItem label="Model biznesu targetu" value={selectedCampaign.target_business_model} />
            <DetailItem label="Etap rozwoju" value={selectedCampaign.target_company_stage} />
            <DetailItem label="Segment cenowy" value={selectedCampaign.target_price_segment} />
            <DetailItem label="Najlepszy target" value={selectedCampaign.target_customer_description} />
            <DetailItem label="Problemy targetu" value={selectedCampaign.customer_pain_points} />
            <DetailItem label="Sygnały online" value={selectedCampaign.required_online_signals} />
            <DetailItem label="Zasady kwalifikacji" value={selectedCampaign.lead_qualification_rules} />
            <DetailItem label="Zasady dyskwalifikacji" value={selectedCampaign.lead_disqualification_rules} />
            <DetailItem label="Czego bot ma unikać" value={selectedCampaign.avoid_in_messages} />
            <DetailItem label="CTA" value={selectedCampaign.call_to_action} />
            <DetailItem label="Przykładowy mail" value={selectedCampaign.sample_email_style} />
          </div>
          <div className="section-divider">Załączniki wysyłane przez bota</div>
          <CampaignAttachmentList attachments={selectedCampaignAttachments} onToggle={onToggleAttachment} onDelete={onDeleteAttachment} />
        </Panel>
      ) : null}
      <div className="two-column">
        <Panel eyebrow="Kampania" title="Nowa kampania">
          <form className="form-grid" onSubmit={onSubmit}>
            <SelectField label="Klient" value={form.client_id} onChange={(value) => setForm({ ...form, client_id: value })} required span>
              <option value="">{clients.length ? "Wybierz klienta" : "Brak klientów"}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company_name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Bot" value={form.bot_id} onChange={(value) => setForm({ ...form, bot_id: value })} help="Gdy masz wiele kampanii, przypisz osobnego bota do każdej aktywnej kampanii.">
              <option value="">Bez przypisanego bota</option>
              {bots.map((bot) => (
                <option key={bot.id} value={bot.id}>{bot.name} · {statusLabel(bot.status)}</option>
              ))}
            </SelectField>
            <InputField label="Nazwa" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required span />
            <LocationPicker
              scope={form.location_scope}
              locations={form.target_locations}
              planScope={planScopeFromPlanId(clients.find((client) => client.id === form.client_id)?.plan_id)}
              onChange={(next) => setForm({ ...form, ...next })}
            />
            <CampaignProgrammingFields form={form} setForm={setForm} />
            <InputField label="Call to action" value={form.call_to_action} onChange={(value) => setForm({ ...form, call_to_action: value })} placeholder="Np. Czy mogę przesłać przykładowe realizacje?" span />
            <div className="span section-divider">Harmonogram i limity</div>
            <PersonaSignatureFields form={form} setForm={setForm} />
            <WarmupScheduleFields form={form} setForm={setForm} />
            <InputField label="Limit miesięczny kampanii (opcjonalny)" value={form.monthly_limit} onChange={(value) => setForm({ ...form, monthly_limit: value })} inputMode="numeric" help="Zostaw puste, aby system policzył limit automatycznie z aktualnego miesiąca. Gdy weekendy są wyłączone, soboty i niedziele są odejmowane." />
            <InputField label="Godzina startu" value={form.workday_start_hour} onChange={(value) => setForm({ ...form, workday_start_hour: value })} inputMode="numeric" />
            <InputField label="Godzina końca" value={form.workday_end_hour} onChange={(value) => setForm({ ...form, workday_end_hour: value })} inputMode="numeric" />
            <InputField label="Strefa czasu" value={form.sending_timezone} onChange={(value) => setForm({ ...form, sending_timezone: value })} />
            <CampaignSchedulePreview form={form} client={clients.find((client) => client.id === form.client_id)} />
            <TestEmailPreview form={form} client={clients.find((client) => client.id === form.client_id)} />
            <CampaignTestEmailSender form={form} />
            <InputField label="Follow-up po ilu dniach" value={form.follow_up_delay_days} onChange={(value) => setForm({ ...form, follow_up_delay_days: value })} inputMode="numeric" />
            <InputField label="Maks. follow-upów" value={form.max_follow_ups} onChange={(value) => setForm({ ...form, max_follow_ups: value })} inputMode="numeric" />
            <FilterCheck label="Automat: szukaj 1 leada w wyliczonych oknach pracy" checked={form.auto_run_enabled} onChange={(checked) => setForm({ ...form, auto_run_enabled: checked })} />
            <FilterCheck label="Przed wysyłką poproś klienta o akceptację" checked={form.requires_approval_before_send} onChange={(checked) => setForm({ ...form, requires_approval_before_send: checked })} />
            <FilterCheck label="Bot może pracować w weekendy" checked={form.send_on_weekends} onChange={(checked) => setForm({ ...form, send_on_weekends: checked })} />
            <FilterCheck label="Tryb testowy, maksymalnie 3 wysyłki" checked={form.test_mode} onChange={(checked) => setForm({ ...form, test_mode: checked })} />
            <InputField label="Ton wiadomości" value={form.tone} onChange={(value) => setForm({ ...form, tone: value })} span />
            <AttachmentPicker files={campaignFiles} onChange={setCampaignFiles} />
            <button className="button primary span" type="submit" disabled={!clients.length}>
              Dodaj kampanię
            </button>
          </form>
        </Panel>
        <Panel eyebrow="Konfiguracja" title="Limity">
          <div className="mini-stats">
            <MiniStat label="Aktywne" value={campaigns.filter((campaign) => campaign.status === "active").length} />
            <MiniStat label="Wstrzymane" value={campaigns.filter((campaign) => campaign.status === "paused").length} />
          </div>
        </Panel>
      </div>
      {editingCampaignId ? (
        <Panel eyebrow="Edycja" title="Edytuj kampanię">
          <form className="form-grid" onSubmit={onSaveCampaign}>
            <SelectField label="Klient" value={campaignEditForm.client_id} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, client_id: value })} required span>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company_name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Bot" value={campaignEditForm.bot_id} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, bot_id: value })}>
              <option value="">Bez przypisanego bota</option>
              {bots.map((bot) => (
                <option key={bot.id} value={bot.id}>{bot.name} · {statusLabel(bot.status)}</option>
              ))}
            </SelectField>
            <InputField label="Nazwa" value={campaignEditForm.name} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, name: value })} required />
            <SelectField label="Status" value={campaignEditForm.status} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, status: value })}>
              {CAMPAIGN_STATUSES.map((status) => (
                <option value={status} key={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </SelectField>
            <LocationPicker
              scope={campaignEditForm.location_scope}
              locations={campaignEditForm.target_locations}
              planScope={planScopeFromPlanId(clients.find((client) => client.id === campaignEditForm.client_id)?.plan_id)}
              onChange={(next) => setCampaignEditForm({ ...campaignEditForm, ...next })}
            />
            <CampaignProgrammingFields form={campaignEditForm} setForm={setCampaignEditForm} />
            <InputField label="Call to action" value={campaignEditForm.call_to_action} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, call_to_action: value })} placeholder="Np. Czy mogę przesłać przykładowe realizacje?" span />
            <div className="span section-divider">Harmonogram i limity</div>
            <PersonaSignatureFields form={campaignEditForm} setForm={setCampaignEditForm} />
            <WarmupScheduleFields form={campaignEditForm} setForm={setCampaignEditForm} />
            <InputField label="Limit miesięczny kampanii (opcjonalny)" value={campaignEditForm.monthly_limit} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, monthly_limit: value })} inputMode="numeric" help="Zostaw puste, aby system policzył limit automatycznie z liczby dni w miesiącu, warm-upu i ustawienia weekendów." />
            <InputField label="Godzina startu" value={campaignEditForm.workday_start_hour} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, workday_start_hour: value })} inputMode="numeric" />
            <InputField label="Godzina końca" value={campaignEditForm.workday_end_hour} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, workday_end_hour: value })} inputMode="numeric" />
            <InputField label="Strefa czasu" value={campaignEditForm.sending_timezone} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, sending_timezone: value })} />
            <CampaignSchedulePreview form={campaignEditForm} client={clients.find((client) => client.id === campaignEditForm.client_id)} />
            <TestEmailPreview form={campaignEditForm} client={clients.find((client) => client.id === campaignEditForm.client_id)} />
            <CampaignTestEmailSender form={campaignEditForm} campaignId={editingCampaignId} />
            <InputField label="Follow-up po dniach" value={campaignEditForm.follow_up_delay_days} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, follow_up_delay_days: value })} inputMode="numeric" />
            <InputField label="Maks. follow-upów" value={campaignEditForm.max_follow_ups} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, max_follow_ups: value })} inputMode="numeric" />
            <FilterCheck label="Automat: szukaj 1 leada w wyliczonych oknach pracy" checked={campaignEditForm.auto_run_enabled} onChange={(checked) => setCampaignEditForm({ ...campaignEditForm, auto_run_enabled: checked })} />
            <FilterCheck label="Przed wysyłką poproś klienta o akceptację" checked={campaignEditForm.requires_approval_before_send} onChange={(checked) => setCampaignEditForm({ ...campaignEditForm, requires_approval_before_send: checked })} />
            <FilterCheck label="Bot może pracować w weekendy" checked={campaignEditForm.send_on_weekends} onChange={(checked) => setCampaignEditForm({ ...campaignEditForm, send_on_weekends: checked })} />
            <FilterCheck label="Tryb testowy" checked={campaignEditForm.test_mode} onChange={(checked) => setCampaignEditForm({ ...campaignEditForm, test_mode: checked })} />
            <InputField label="Ton" value={campaignEditForm.tone} onChange={(value) => setCampaignEditForm({ ...campaignEditForm, tone: value })} span />
            <AttachmentPicker files={campaignEditFiles} onChange={setCampaignEditFiles} label="Dodaj nowe załączniki" />
            <div className="span">
              <div className="section-divider">Aktualne załączniki kampanii</div>
              <CampaignAttachmentList
                attachments={attachments.filter((attachment) => attachment.campaign_id === editingCampaignId)}
                onToggle={onToggleAttachment}
                onDelete={onDeleteAttachment}
              />
            </div>
            <div className="row-actions span">
              <button className="button primary" type="submit">
                Zapisz
              </button>
              <button className="button" type="button" onClick={onCancelCampaignEdit}>
                Anuluj
              </button>
            </div>
          </form>
        </Panel>
      ) : null}
      <TableCard
        rows={campaigns}
        empty="Brak kampanii."
        columns={["Kampania", "Klient", "Target", "Tryb", "Co robi bot", "Status", "Akcje"]}
        render={(campaign) => (
          <tr key={campaign.id} className={campaign.id === selectedCampaignId ? "selected-row" : ""}>
            <td>
              <strong>{campaign.name}</strong>
              <span>{campaign.offer_description || "-"}</span>
            </td>
            <td>{campaign.client_accounts?.company_name || "-"}</td>
            <td>
              {joinList(campaign.target_industries)}
              <span>{joinList(campaign.target_locations)}</span>
            </td>
            <td>
              Automat
              <span>bot {bots.find((bot) => bot.id === campaign.bot_id)?.name || "brak"} · {campaign.requires_approval_before_send ? "akceptacja klienta" : "auto wysyłka"} · {campaign.send_on_weekends ? "weekendy ON" : "weekendy OFF"} · follow-up {campaign.follow_up_delay_days ?? 2} dni · maks. {campaign.max_follow_ups ?? 1} · załączniki {attachments.filter((attachment) => attachment.campaign_id === campaign.id && attachment.is_active).length}</span>
            </td>
            <td>
              <strong>{liveStateForCampaign(campaign, liveData).label}</strong>
              <span>{liveStateForCampaign(campaign, liveData).detail}</span>
            </td>
            <td>
              <StatusBadge status={campaign.status}>{statusLabel(campaign.status)}</StatusBadge>
            </td>
            <td>
              <div className="row-actions">
                <button className="button small" onClick={() => setSelectedCampaignId(campaign.id)} type="button">
                  Szczegóły
                </button>
                <button className="button small" onClick={() => onEditCampaign(campaign)} type="button">
                  Edytuj
                </button>
                <button className="button small" onClick={() => onStatus(campaign.id, campaign.status === "active" ? "paused" : "active")} type="button">
                  {campaign.status === "active" ? "Pauza" : "Aktywuj"}
                </button>
                <button className="button small primary-soft" onClick={() => onRunCampaign(campaign.id)} disabled={runningCampaignId === campaign.id || campaign.status !== "active"} type="button">
                  {runningCampaignId === campaign.id ? "Bot pracuje..." : "Uruchom bota"}
                </button>
              </div>
            </td>
          </tr>
        )}
      />
    </>
  );
}

export function LeadsView({
  clients,
  campaigns,
  leads,
  form,
  setForm,
  onSubmit,
  onStatus,
  filters,
  setFilters,
  editingLeadId,
  editForm,
  setEditForm,
  onEdit,
  onSave,
  onCancelEdit,
  onDelete,
}: {
  clients: ClientAccount[];
  campaigns: Campaign[];
  leads: Lead[];
  form: typeof initialLeadForm;
  setForm: (value: typeof initialLeadForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStatus: (id: string, status: string) => void;
  filters: typeof initialLeadFilters;
  setFilters: (value: typeof initialLeadFilters) => void;
  editingLeadId: string | null;
  editForm: typeof initialLeadForm;
  setEditForm: (value: typeof initialLeadForm) => void;
  onEdit: (lead: Lead) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onCancelEdit: () => void;
  onDelete: (lead: Lead) => void;
}) {
  const campaignOptions = campaigns.filter((campaign) => !form.client_id || campaign.client_id === form.client_id);
  const filterCampaignOptions = campaigns.filter((campaign) => !filters.clientId || campaign.client_id === filters.clientId);
  const filteredLeads = leads.filter((lead) => {
    if (filters.clientId && lead.client_id !== filters.clientId) return false;
    if (filters.campaignId && lead.campaign_id !== filters.campaignId) return false;
    if (filters.status && lead.status !== filters.status) return false;
    if (filters.minScore && (lead.score ?? 0) < Number(filters.minScore)) return false;
    if (filters.sent && lead.status !== "sent") return false;
    return true;
  });

  return (
    <>
      <ScreenHeader title="Leady" subtitle="Firmy przypisane do klienta i kampanii, z filtrami operacyjnymi." />
      <Panel eyebrow="Filtry" title="Widok leadów">
        <div className="filters-grid">
          <SelectField label="Klient" value={filters.clientId} onChange={(value) => setFilters({ ...filters, clientId: value, campaignId: "" })}>
            <option value="">Wszyscy klienci</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.company_name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Kampania" value={filters.campaignId} onChange={(value) => setFilters({ ...filters, campaignId: value })}>
            <option value="">Wszystkie kampanie</option>
            {filterCampaignOptions.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Status" value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })}>
            <option value="">Dowolny</option>
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </SelectField>
          <InputField label="Minimalny score" value={filters.minScore} onChange={(value) => setFilters({ ...filters, minScore: value })} inputMode="numeric" min={0} max={10} />
          <FilterCheck label="Wysłane" checked={filters.sent} onChange={(checked) => setFilters({ ...filters, sent: checked })} />
          <button className="button" type="button" onClick={() => setFilters(initialLeadFilters)}>
            Wyczyść filtry
          </button>
        </div>
      </Panel>
      <div className="two-column">
        <Panel eyebrow="Lead" title="Dodaj ręcznie">
          <form className="form-grid" onSubmit={onSubmit}>
            <SelectField label="Klient" value={form.client_id} onChange={(value) => setForm({ ...form, client_id: value, campaign_id: "" })}>
              <option value="">Brak</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company_name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Kampania" value={form.campaign_id} onChange={(value) => setForm({ ...form, campaign_id: value })}>
              <option value="">Brak</option>
              {campaignOptions.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </SelectField>
            <InputField label="Firma" value={form.company_name} onChange={(value) => setForm({ ...form, company_name: value })} required />
            <InputField label="Branża" value={form.industry} onChange={(value) => setForm({ ...form, industry: value })} />
            <InputField label="Miasto" value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
            <InputField label="Email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} type="email" />
            <InputField label="Telefon" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
            <InputField label="Strona" value={form.website} onChange={(value) => setForm({ ...form, website: value })} />
            <InputField label="Google Maps URL" value={form.google_maps_url} onChange={(value) => setForm({ ...form, google_maps_url: value })} />
            <InputField label="Score" value={form.score} onChange={(value) => setForm({ ...form, score: value })} inputMode="numeric" min={0} max={10} />
            <button className="button primary span" type="submit">
              Dodaj lead
            </button>
          </form>
        </Panel>
        <Panel eyebrow="Pipeline" title="Statusy leadów">
          <div className="mini-stats">
            <MiniStat label="Widoczne" value={filteredLeads.length} />
            <MiniStat label="Wysłane" value={filteredLeads.filter((lead) => lead.status === "sent").length} />
          </div>
        </Panel>
      </div>
      {editingLeadId ? (
        <Panel eyebrow="Edycja" title="Edytuj wybranego leada">
          <form className="form-grid" onSubmit={onSave}>
            <SelectField label="Klient" value={editForm.client_id} onChange={(value) => setEditForm({ ...editForm, client_id: value, campaign_id: "" })}>
              <option value="">Brak</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.company_name}</option>
              ))}
            </SelectField>
            <SelectField label="Kampania" value={editForm.campaign_id} onChange={(value) => setEditForm({ ...editForm, campaign_id: value })}>
              <option value="">Brak</option>
              {campaigns.filter((campaign) => !editForm.client_id || campaign.client_id === editForm.client_id).map((campaign) => (
                <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
              ))}
            </SelectField>
            <InputField label="Firma" value={editForm.company_name} onChange={(value) => setEditForm({ ...editForm, company_name: value })} required />
            <InputField label="Branża" value={editForm.industry} onChange={(value) => setEditForm({ ...editForm, industry: value })} />
            <InputField label="Miasto" value={editForm.city} onChange={(value) => setEditForm({ ...editForm, city: value })} />
            <InputField label="Email" value={editForm.email} onChange={(value) => setEditForm({ ...editForm, email: value })} type="email" />
            <InputField label="Telefon" value={editForm.phone} onChange={(value) => setEditForm({ ...editForm, phone: value })} />
            <InputField label="Strona" value={editForm.website} onChange={(value) => setEditForm({ ...editForm, website: value })} />
            <InputField label="Google Maps URL" value={editForm.google_maps_url} onChange={(value) => setEditForm({ ...editForm, google_maps_url: value })} />
            <InputField label="Źródło" value={editForm.source} onChange={(value) => setEditForm({ ...editForm, source: value })} />
            <InputField label="Score" value={editForm.score} onChange={(value) => setEditForm({ ...editForm, score: value })} inputMode="numeric" min={0} max={10} />
            <SelectField label="Status" value={editForm.status} onChange={(value) => setEditForm({ ...editForm, status: value })}>
              {VISIBLE_LEAD_FILTER_STATUSES.map((status) => <option value={status} key={status}>{statusLabel(status)}</option>)}
            </SelectField>
            <InputField label="Główny problem" value={editForm.main_problem} onChange={(value) => setEditForm({ ...editForm, main_problem: value })} span />
            <TextAreaField label="Analiza AI" value={editForm.ai_summary} onChange={(value) => setEditForm({ ...editForm, ai_summary: value })} />
            <InputField label="Temat maila" value={editForm.generated_subject} onChange={(value) => setEditForm({ ...editForm, generated_subject: value })} span />
            <TextAreaField label="Treść maila" value={editForm.generated_email} onChange={(value) => setEditForm({ ...editForm, generated_email: value })} />
            <div className="row-actions span">
              <button className="button primary" type="submit">Zapisz leada</button>
              <button className="button" type="button" onClick={onCancelEdit}>Anuluj</button>
            </div>
          </form>
        </Panel>
      ) : null}
      <TableCard
        rows={filteredLeads}
        empty="Brak leadów dla wybranych filtrów."
        columns={["Firma", "Klient", "Kampania", "Kontakt", "Score", "Status", "Akcje"]}
        render={(lead) => (
          <tr key={lead.id}>
            <td>
              <strong>{lead.company_name}</strong>
              <span>
                {lead.industry || "-"} · {lead.city || "-"}
              </span>
            </td>
            <td>{lead.client_accounts?.company_name || "-"}</td>
            <td>{lead.campaigns?.name || "-"}</td>
            <td>
              {lead.email || "Brak emaila"}
              <span>{lead.phone || lead.website || "-"}</span>
            </td>
            <td>{lead.score ?? 0}/10</td>
            <td>
              <StatusBadge status={lead.status}>{statusLabel(lead.status)}</StatusBadge>
            </td>
            <td>
              <div className="row-actions">
                <button className="button small" onClick={() => onEdit(lead)} type="button">
                  Edytuj
                </button>
                <button className="button small" onClick={() => onStatus(lead.id, "sent")} type="button">
                  Wysłany
                </button>
                <button className="button small danger" onClick={() => onStatus(lead.id, "do_not_contact")} type="button">
                  DNC
                </button>
                <button className="button small danger" onClick={() => onDelete(lead)} type="button">
                  Usuń
                </button>
              </div>
            </td>
          </tr>
        )}
      />
    </>
  );
}

export function MessagesView({
  clients,
  campaigns,
  messages,
  filters,
  setFilters,
  onStatus,
  onDelete,
}: {
  clients: ClientAccount[];
  campaigns: Campaign[];
  messages: Message[];
  filters: typeof initialMessageFilters;
  setFilters: (value: typeof initialMessageFilters) => void;
  onStatus: (id: string, status: string) => void;
  onDelete: (message: Message) => void;
}) {
  const [approvalBusyId, setApprovalBusyId] = useState<string | null>(null);
  const [previewMessage, setPreviewMessage] = useState<Message | null>(null);
  const campaignOptions = campaigns.filter((campaign) => !filters.clientId || campaign.client_id === filters.clientId);
  const filteredMessages = messages.filter((message) => {
    if (filters.clientId && message.client_id !== filters.clientId) return false;
    if (filters.campaignId && message.campaign_id !== filters.campaignId) return false;
    if (filters.status && message.status !== filters.status) return false;
    return true;
  });

  async function approveDraft(messageId: string, action: "approve" | "reject") {
    setApprovalBusyId(messageId);
    try {
      await adminJson(`/api/admin/messages/${messageId}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (typeof window !== "undefined") window.alert(action === "approve" ? "Wiadomość zatwierdzona i dodana do kolejki." : "Wiadomość odrzucona.");
    } catch (caught) {
      if (typeof window !== "undefined") window.alert(caught instanceof Error ? caught.message : "Błąd akceptacji wiadomości.");
    } finally {
      setApprovalBusyId(null);
    }
  }

  return (
    <>
      <ScreenHeader title="Wiadomości" subtitle="Wiadomości wysłane oraz szkice oczekujące na akceptację." />
      <Panel eyebrow="Filtry" title="Widok wiadomości">
        <div className="filters-grid">
          <SelectField label="Klient" value={filters.clientId} onChange={(value) => setFilters({ ...filters, clientId: value, campaignId: "" })}>
            <option value="">Wszyscy klienci</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.company_name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Kampania" value={filters.campaignId} onChange={(value) => setFilters({ ...filters, campaignId: value })}>
            <option value="">Wszystkie kampanie</option>
            {campaignOptions.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Status" value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })}>
            <option value="">Dowolny</option>
            {VISIBLE_MESSAGE_FILTER_STATUSES.map((status) => (
              <option value={status} key={status}>
                {statusLabel(status)}
              </option>
            ))}
          </SelectField>
          <button className="button" type="button" onClick={() => setFilters(initialMessageFilters)}>
            Wyczyść filtry
          </button>
        </div>
      </Panel>
      {previewMessage ? (
        <Panel eyebrow="Pełna treść" title={previewMessage.subject || "Bez tematu"}>
          <div className="message-full-meta">
            <span>Lead: {previewMessage.leads?.company_name || "-"}</span>
            <span>Do: {previewMessage.email_to || "-"}</span>
            <span>Klient: {previewMessage.client_accounts?.company_name || "-"}</span>
            <span>Kampania: {previewMessage.campaigns?.name || "-"}</span>
            <span>Status: {statusLabel(previewMessage.status)}</span>
            <span>Utworzono: {formatDate(previewMessage.created_at)}</span>
          </div>
          <pre className="approval-card__body message-full-body">{previewMessage.body || "Brak treści wiadomości."}</pre>
          <div className="row-actions message-full-actions">
            <button className="button small" type="button" onClick={() => setPreviewMessage(null)}>Zamknij podgląd</button>
          </div>
        </Panel>
      ) : null}
      <TableCard
        rows={filteredMessages}
        empty="Brak wiadomości dla wybranych filtrów."
        columns={["Lead", "Klient", "Kampania", "Temat i treść", "Status", "Daty", "Akcje"]}
        render={(message) => {
          return (
            <tr key={message.id}>
              <td>{message.leads?.company_name || "-"}</td>
              <td>{message.client_accounts?.company_name || "-"}</td>
              <td>{message.campaigns?.name || "-"}</td>
              <td>
                <strong>{message.subject || "Bez tematu"}</strong>
                <span>{message.body ? `${message.body.slice(0, 160)}${message.body.length > 160 ? "..." : ""}` : "-"}</span>
              </td>
              <td>
                <StatusBadge status={message.status}>{statusLabel(message.status)}</StatusBadge>
              </td>
              <td>
                {formatDate(message.created_at)}
                <span>{message.sent_at ? `Wysłano ${formatDate(message.sent_at)}` : "Nie wysłano"}</span>
                <span>{message.opened_at ? `Otwarto ${formatDate(message.opened_at)}` : (message.delivered_at || message.sent_at) ? `Dostarczono ${formatDate(message.delivered_at || message.sent_at)}` : ""}</span>
              </td>
              <td>
                <div className="row-actions">
                  <button className="button small primary-soft" onClick={() => setPreviewMessage(message)} type="button">Pełna treść</button>
                  {message.status === "draft" ? <button className="button small primary-soft" disabled={approvalBusyId === message.id} onClick={() => void approveDraft(message.id, "approve")} type="button">Akceptuj</button> : null}
                  {message.status === "draft" ? <button className="button small danger" disabled={approvalBusyId === message.id} onClick={() => void approveDraft(message.id, "reject")} type="button">Odrzuć</button> : null}
                  <button className="button small" onClick={() => onStatus(message.id, "delivered")} type="button">
                    Dostarczona
                  </button>
                  <button className="button small" onClick={() => onStatus(message.id, "replied")} type="button">
                    Odpowiedź
                  </button>
                  <button className="button small" onClick={() => onStatus(message.id, "bounced")} type="button">
                    Bounce
                  </button>
                  <button className="button small" onClick={() => onStatus(message.id, "spam")} type="button">
                    Spam
                  </button>
                  <button className="button small danger" onClick={() => onDelete(message)} type="button">
                    Usuń
                  </button>
                </div>
              </td>
            </tr>
          );
        }}
      />
    </>
  );
}


export function QueueView({
  items,
  summary,
  onRetry,
  onCancel,
}: {
  items: AdminData["sendQueue"];
  summary: AdminData["sendQueueSummary"];
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const pending = summary?.pending ?? items.filter((item) => item.status === "pending").length;
  const processing = summary?.processing ?? items.filter((item) => item.status === "processing").length;
  const sent = summary?.sent ?? items.filter((item) => item.status === "sent").length;
  const failed = summary?.failed ?? items.filter((item) => item.status === "failed").length;
  const showError = (item: AdminData["sendQueue"][number]) => {
    if (typeof window !== "undefined") window.alert(item.last_error || "Brak szczegółów błędu.");
  };

  return (
    <>
      <ScreenHeader title="Kolejka techniczna" subtitle="Ukryty rozkład wysyłki. Klient dalej widzi tylko wysłane leady i wiadomości." />
      <div className="metrics-grid">
        <MetricCard label="W kolejce" value={pending} />
        <MetricCard label="Wysyłane" value={processing} />
        <MetricCard label="Wysłane dziś" value={sent} />
        <MetricCard label="Błędy" value={failed} />
        <MetricCard label="Dziś w planie" value={summary?.todayTotal ?? items.length} detail={summary?.nextSendAt ? `Następna: ${formatDate(summary.nextSendAt)}` : "Brak pending"} />
      </div>
      <TableCard
        rows={items}
        empty="Brak technicznych rekordów kolejki."
        columns={["scheduled_at", "Klient", "Kampania", "Typ", "Email", "Status", "attempts", "Akcje"]}
        render={(item) => (
          <tr key={item.id}>
            <td>
              {formatDate(item.scheduled_at)}
              <span>{new Date(item.scheduled_at).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}</span>
              {item.locked_at ? <span>lock: {formatDate(item.locked_at)}</span> : null}
            </td>
            <td>{item.client_accounts?.company_name || "-"}</td>
            <td>{item.campaigns?.name || "-"}</td>
            <td>{item.kind === "follow_up" ? "Follow-up" : "Pierwszy mail"}</td>
            <td>{item.email_to}<span>{item.subject}</span></td>
            <td><StatusBadge status={item.status}>{statusLabel(item.status)}</StatusBadge>{item.last_error ? <span>{item.last_error}</span> : null}</td>
            <td>{item.attempts || 0}</td>
            <td>
              <div className="row-actions">
                {item.status === "failed" || item.status === "processing" ? <button className="button small" type="button" onClick={() => onRetry(item.id)}>Ponów</button> : null}
                {item.status === "pending" ? <button className="button small danger" type="button" onClick={() => onCancel(item.id)}>Anuluj</button> : null}
                {item.last_error ? <button className="button small" type="button" onClick={() => showError(item)}>Błąd</button> : null}
              </div>
            </td>
          </tr>
        )}
      />
    </>
  );
}

export function RunsView({ runs, logs, onDelete }: { runs: AdminData["campaignRuns"]; logs: AdminData["runLogs"]; onDelete: (id: string) => void }) {
  const latestLogs = logs.slice(0, 120);
  return (
    <>
      <ScreenHeader title="Runy bota" subtitle="Historia uruchomień kampanii, błędy i techniczne logi pracy bota." />
      <div className="metrics-grid">
        <MetricCard label="Runy" value={runs.length} />
        <MetricCard label="Zakończone" value={runs.filter((run) => run.status === "completed").length} />
        <MetricCard label="Częściowe" value={runs.filter((run) => run.status === "partial").length} />
        <MetricCard label="Błędy" value={runs.filter((run) => run.status === "failed").length} />
      </div>
      <TableCard
        rows={runs}
        empty="Brak uruchomień kampanii."
        columns={["Kampania", "Klient", "Status", "Wyniki", "Czas", "Akcje"]}
        render={(run) => (
          <tr key={run.id}>
            <td>{run.campaigns?.name || "-"}</td>
            <td>{run.client_accounts?.company_name || "-"}</td>
            <td><StatusBadge status={run.status}>{statusLabel(run.status)}</StatusBadge></td>
            <td>
              <strong>{run.inserted_leads || 0} leadów · {run.sent_emails || 0} wysłanych</strong>
              <span>{run.emails_found || 0} emaili · {run.send_failures || 0} błędów wysyłki</span>
            </td>
            <td>{formatDate(run.started_at)}<span>{run.finished_at ? `Koniec ${formatDate(run.finished_at)}` : "W trakcie"}</span></td>
            <td>
              <div className="row-actions">
                <button
                  className="button small danger"
                  type="button"
                  onClick={() => {
                    if (window.confirm("Usunąć ten run i jego logi techniczne? Ta operacja czyści tylko historię runa, nie usuwa leadów ani wiadomości.")) onDelete(run.id);
                  }}
                >
                  Usuń run
                </button>
              </div>
            </td>
          </tr>
        )}
      />
      <TableCard
        rows={latestLogs}
        empty="Brak logów technicznych."
        columns={["Poziom", "Etap", "Komunikat", "Kampania", "Data"]}
        render={(log) => (
          <tr key={log.id}>
            <td><StatusBadge status={log.level}>{log.level}</StatusBadge></td>
            <td>{log.stage}</td>
            <td>{log.message}</td>
            <td>{log.campaigns?.name || "-"}</td>
            <td>{formatDate(log.created_at)}</td>
          </tr>
        )}
      />
    </>
  );
}

export function SuppressionView({
  clients,
  items,
  form,
  setForm,
  onCreate,
  onDelete,
}: {
  clients: ClientAccount[];
  items: AdminData["suppressionList"];
  form: typeof initialSuppressionForm;
  setForm: (value: typeof initialSuppressionForm) => void;
  onCreate: (payload: typeof initialSuppressionForm) => void | Promise<void>;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <ScreenHeader title="Blacklist / Do-not-contact" subtitle="Globalna i klientowa lista adresów, domen oraz firm, do których bot nie ma pisać." />
      <Panel eyebrow="Blokada" title="Dodaj wpis do listy blokady">
        <form className="form-grid" onSubmit={(event) => { event.preventDefault(); void onCreate(form); }}>
          <SelectField label="Klient" value={form.client_id} onChange={(value) => setForm({ ...form, client_id: value })} span>
            <option value="">Globalnie dla wszystkich</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.company_name}</option>)}
          </SelectField>
          <InputField label="Email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
          <InputField label="Domena" value={form.domain} onChange={(value) => setForm({ ...form, domain: value })} placeholder="firma.pl" />
          <InputField label="Nazwa firmy" value={form.company_name} onChange={(value) => setForm({ ...form, company_name: value })} />
          <TextAreaField label="Powód" value={form.reason} onChange={(value) => setForm({ ...form, reason: value })} />
          <button className="button primary span" type="submit">Dodaj blokadę</button>
        </form>
      </Panel>
      <TableCard
        rows={items}
        empty="Brak wpisów na liście blokady."
        columns={["Klient", "Email", "Domena", "Firma", "Powód", "Akcje"]}
        render={(item) => (
          <tr key={item.id}>
            <td>{item.client_accounts?.company_name || "Globalnie"}</td>
            <td>{item.email || "-"}</td>
            <td>{item.domain || "-"}</td>
            <td>{item.company_name || "-"}</td>
            <td>{item.reason || "-"}</td>
            <td><button className="button small danger" type="button" onClick={() => onDelete(item.id)}>Usuń</button></td>
          </tr>
        )}
      />
    </>
  );
}

export function AuditView({ logs }: { logs: AdminData["auditLogs"] }) {
  return (
    <>
      <ScreenHeader title="Audyt zmian" subtitle="Kto, kiedy i co zmieniał w panelu administratora." />
      <TableCard
        rows={logs}
        empty="Brak logów audytu."
        columns={["Admin", "Akcja", "Zasób", "ID", "Data"]}
        render={(log) => (
          <tr key={log.id}>
            <td>{log.actor_email || "system"}</td>
            <td>{log.action}</td>
            <td>{log.resource || "-"}</td>
            <td>{log.resource_id || "-"}</td>
            <td>{formatDate(log.created_at)}</td>
          </tr>
        )}
      />
    </>
  );
}

export function BillingView({ clients, campaigns }: { clients: ClientAccount[]; campaigns: Campaign[] }) {
  const active = clients.filter((client) => client.subscription_status === "active");
  const monthly = active.reduce((sum, client) => sum + (Number(client.subscription_price) || 0), 0);
  return (
    <>
      <ScreenHeader title="Billing" subtitle="Pakiety abonamentowe, Stripe i statystyki przychodu." />
      <div className="metrics-grid">
        <MetricCard label="Aktywni klienci" value={active.length} />
        <MetricCard label="MRR ręczny" value={formatPrice(monthly)} />
        <MetricCard label="Kampanie" value={campaigns.length} />
        <MetricCard label="Anulowania" value={clients.filter((client) => client.subscription_status === "cancel_requested").length} />
      </div>
      <Panel eyebrow="Pakiety" title="Produkty i ceny do Stripe">
        <div className="compact-list separated">
          {BOTSELLER_PLANS.map((plan) => (
            <div className="compact-row" key={plan.id}>
              <strong>{plan.name}</strong>
              <span>{plan.dailyEmails} maili dziennie · {plan.priceLabel} · lookup: {plan.lookupKey}</span>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}


export function OrderSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="order-section">
      <h3>{title}</h3>
      <div className="detail-grid wide">{children}</div>
    </div>
  );
}

export function OrdersView({
  orders,
  orderAttachments,
  editingOrderId,
  editForm,
  setEditForm,
  onEdit,
  onSave,
  onCancelEdit,
  onDelete,
  onConvert,
  onReject,
  revealedSmtpPasses,
  onRevealSmtpPass,
}: {
  orders: AdminData["signupOrders"];
  orderAttachments: AdminData["signupOrderAttachments"];
  editingOrderId: string | null;
  editForm: typeof initialOrderEditForm;
  setEditForm: (value: typeof initialOrderEditForm) => void;
  onEdit: (order: SignupOrder) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onCancelEdit: () => void;
  onDelete: (order: SignupOrder) => void;
  onConvert: (id: string) => void;
  onReject: (id: string) => void;
  revealedSmtpPasses: Record<string, string>;
  onRevealSmtpPass: (orderId: string) => void;
}) {
  return (
    <>
      <ScreenHeader
        title="Zamówienia"
        subtitle="Pełny podgląd i edycja każdego zgłoszenia z /botseller. Hasło SMTP/Gmail możesz pokazać adminowi, zmienić, wyczyścić albo zostawić bez zmian."
      />
      <div className="metrics-grid compact-metrics">
        <MetricCard label="Wszystkie" value={orders.length} />
        <MetricCard label="Szkice" value={orders.filter((order) => order.status === "draft").length} />
        <MetricCard label="Oczekujące" value={orders.filter((order) => order.status === "pending" || order.status === "pending_payment").length} />
        <MetricCard label="Opłacone" value={orders.filter((order) => order.status === "paid").length} />
        <MetricCard label="Faktura VAT" value={orders.filter((order) => order.wants_vat_invoice).length} />
        <MetricCard label="Dodatkowa skrzynka" value={orders.filter((order) => order.additional_mailbox_requested).length} />
        <MetricCard label="Z załącznikami" value={orders.filter((order) => orderAttachments.some((attachment) => attachment.order_id === order.id)).length} />
      </div>

      {!orders.length ? <EmptyState>Brak zgłoszeń z publicznej strony.</EmptyState> : null}

      <div className="order-grid">
        {orders.map((order) => {
          const isEditing = editingOrderId === order.id;
          const revealedOrderSmtp = revealedSmtpPasses[`signup-orders:${order.id}`];
          const orderFiles = orderAttachments.filter((attachment) => attachment.order_id === order.id && attachment.is_active);
          return (
            <section className="order-card panel" key={order.id}>
              <div className="order-card-head">
                <div>
                  <p className="eyebrow">Zamówienie · {formatDate(order.created_at)}</p>
                  <h2>{order.company_name}</h2>
                  <p>{order.contact_email} · {order.phone || "brak telefonu"}</p>
                </div>
                <div className="order-head-actions">
                  <StatusBadge status={order.status}>{statusLabel(order.status)}</StatusBadge>
                  <div className="row-actions">
                    {isEditing ? null : <button className="button small" type="button" onClick={() => onEdit(order)}>Edytuj wszystko</button>}
                    {order.status === "paid" ? <button className="button small primary" type="button" onClick={() => onConvert(order.id)}>Aktywuj</button> : null}
                    {(order.status === "pending" || order.status === "pending_payment" || order.status === "payment_failed") ? <button className="button small danger" type="button" onClick={() => onReject(order.id)}>Odrzuć</button> : null}
                    <button className="button small danger" type="button" onClick={() => onDelete(order)}>Usuń</button>
                  </div>
                </div>
              </div>

              {isEditing ? (
                <form className="order-edit-form" onSubmit={onSave}>
                  <div className="section-divider span">Firma i kontakt</div>
                  <InputField label="Nazwa firmy" value={editForm.company_name} onChange={(value) => setEditForm({ ...editForm, company_name: value })} required />
                  <InputField label="NIP" value={editForm.nip} onChange={(value) => setEditForm({ ...editForm, nip: value })} />
                  <InputField label="Osoba kontaktowa" value={editForm.contact_name} onChange={(value) => setEditForm({ ...editForm, contact_name: value })} />
                  <InputField label="Email kontaktowy" value={editForm.contact_email} onChange={(value) => setEditForm({ ...editForm, contact_email: value })} type="email" required />
                  <InputField label="Telefon" value={editForm.phone} onChange={(value) => setEditForm({ ...editForm, phone: value })} />
                  <InputField label="WWW" value={editForm.website} onChange={(value) => setEditForm({ ...editForm, website: value })} />
                  <label className="small-check span">
                    <input type="checkbox" checked={editForm.wants_vat_invoice} onChange={(event) => setEditForm({ ...editForm, wants_vat_invoice: event.target.checked })} />
                    <span>Klient chce fakturę VAT</span>
                  </label>
                  <TextAreaField label="Dane do faktury" value={editForm.invoice_details} onChange={(value) => setEditForm({ ...editForm, invoice_details: value })} />

                  <div className="section-divider span">Pakiet, limity i status</div>
                  <SelectField label="Pakiet" value={editForm.plan_id} onChange={(value) => setEditForm(applyPlanToOrderForm(editForm, value))} required>
                    {BOTSELLER_PLANS.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                  </SelectField>
                  <InputField label="Nazwa pakietu" value={editForm.plan_name} onChange={(value) => setEditForm({ ...editForm, plan_name: value })} />
                  <InputField label="Cena netto PLN/mies." value={editForm.plan_price_pln} onChange={(value) => setEditForm({ ...editForm, plan_price_pln: value })} inputMode="decimal" />
                  <InputField label="Limit dzienny" value={editForm.daily_emails} onChange={(value) => setEditForm({ ...editForm, daily_emails: value })} inputMode="numeric" />
                  <InputField label="Limit miesięczny" value={editForm.monthly_emails} onChange={(value) => setEditForm({ ...editForm, monthly_emails: value })} inputMode="numeric" />
                  <SelectField label="Status zamówienia" value={editForm.status} onChange={(value) => setEditForm({ ...editForm, status: value })} required>
                    {['pending', 'pending_payment', 'paid', 'payment_failed', 'converted', 'rejected', 'cancelled'].map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                  </SelectField>

                  <div className="section-divider span">Kampania</div>
                  <LocationPicker
                    scope={editForm.location_scope}
                    locations={editForm.selected_locations}
                    planScope={planScopeFromPlanId(editForm.plan_id)}
                    onChange={(next) => setEditForm({ ...editForm, location_scope: next.location_scope, selected_locations: next.target_locations })}
                  />
                  <InputField label="Branże targetu" value={editForm.target_industries} onChange={(value) => setEditForm({ ...editForm, target_industries: value })} span required help="Po przecinku, np. restauracje, kawiarnie, biura." />
                  <TextAreaField label="Opis firmy klienta" value={editForm.company_description} onChange={(value) => setEditForm({ ...editForm, company_description: value })} required />
                  <TextAreaField label="Promowana usługa" value={editForm.promoted_service} onChange={(value) => setEditForm({ ...editForm, promoted_service: value })} required />
                  <TextAreaField label="Wartość oferty" value={editForm.value_proposition} onChange={(value) => setEditForm({ ...editForm, value_proposition: value })} />
                  <TargetSearchPrecisionFields form={editForm} setForm={setEditForm} />
                  <TextAreaField label="Czego AI ma unikać" value={editForm.avoid_in_messages} onChange={(value) => setEditForm({ ...editForm, avoid_in_messages: value })} />
                  <TextAreaField label="Call to action" value={editForm.call_to_action} onChange={(value) => setEditForm({ ...editForm, call_to_action: value })} />
                  <InputField label="Ton komunikacji" value={editForm.tone} onChange={(value) => setEditForm({ ...editForm, tone: value })} span />
                  <TextAreaField label="Przykładowy mail / styl komunikacji" value={editForm.sample_email_style} onChange={(value) => setEditForm({ ...editForm, sample_email_style: value })} help="Wklej mail klienta lub poprzednią wiadomość handlową. Bot użyje stylu, formalności, długości i podpisu." span />

                  <PersonaSignatureFields form={editForm} setForm={setEditForm} />
                  <div className="section-divider span">SMTP klienta</div>
                  <InputField label="SMTP host" value={editForm.smtp_host} onChange={(value) => setEditForm({ ...editForm, smtp_host: value })} required />
                  <InputField label="SMTP port" value={editForm.smtp_port} onChange={(value) => setEditForm({ ...editForm, smtp_port: value })} inputMode="numeric" required />
                  <label className="small-check">
                    <input type="checkbox" checked={editForm.smtp_secure} onChange={(event) => setEditForm({ ...editForm, smtp_secure: event.target.checked })} />
                    <span>SMTP secure / SSL</span>
                  </label>
                  <InputField label="SMTP user" value={editForm.smtp_user} onChange={(value) => setEditForm({ ...editForm, smtp_user: value })} type="email" required />
                  <InputField label="SMTP from" value={editForm.smtp_from} onChange={(value) => setEditForm({ ...editForm, smtp_from: value })} />
                  <InputField label="Reply-To" value={editForm.smtp_reply_to} onChange={(value) => setEditForm({ ...editForm, smtp_reply_to: value })} type="email" required />
                  <InputField label="Nowe SMTP pass / Gmail App Password" value={editForm.smtp_pass} onChange={(value) => setEditForm({ ...editForm, smtp_pass: value })} type="password" span help="Wklej 16-znakowe hasło aplikacji Gmail tylko gdy chcesz je zmienić. Puste pole nie nadpisuje aktualnego sekretu." />
                  <label className="small-check span">
                    <input type="checkbox" checked={editForm.smtp_pass_clear} onChange={(event) => setEditForm({ ...editForm, smtp_pass_clear: event.target.checked })} />
                    <span>Wyczyść zapisane hasło SMTP</span>
                  </label>
                  <GmailAppPasswordHelp />

                  <div className="section-divider span">Stripe i aktywacja</div>
                  <InputField label="Stripe Checkout Session ID" value={editForm.stripe_checkout_session_id} onChange={(value) => setEditForm({ ...editForm, stripe_checkout_session_id: value })} />
                  <InputField label="Stripe Customer ID" value={editForm.stripe_customer_id} onChange={(value) => setEditForm({ ...editForm, stripe_customer_id: value })} />
                  <InputField label="Stripe Subscription ID" value={editForm.stripe_subscription_id} onChange={(value) => setEditForm({ ...editForm, stripe_subscription_id: value })} />
                  <InputField label="Stripe Payment Status" value={editForm.stripe_payment_status} onChange={(value) => setEditForm({ ...editForm, stripe_payment_status: value })} />
                  <InputField label="Stripe Price ID" value={editForm.stripe_price_id} onChange={(value) => setEditForm({ ...editForm, stripe_price_id: value })} />
                  <InputField label="Stripe Product ID" value={editForm.stripe_product_id} onChange={(value) => setEditForm({ ...editForm, stripe_product_id: value })} />
                  <InputField label="Paid at / data płatności" value={editForm.paid_at} onChange={(value) => setEditForm({ ...editForm, paid_at: value })} help="Może być ISO, np. 2026-07-01T12:00:00Z." />
                  <InputField label="Converted client ID" value={editForm.converted_client_id} onChange={(value) => setEditForm({ ...editForm, converted_client_id: value })} />
                  <InputField label="Converted campaign ID" value={editForm.converted_campaign_id} onChange={(value) => setEditForm({ ...editForm, converted_campaign_id: value })} />
                  <TextAreaField label="Błąd płatności / notatka" value={editForm.payment_error} onChange={(value) => setEditForm({ ...editForm, payment_error: value })} />

                  <div className="row-actions span">
                    <button className="button primary" type="submit">Zapisz zamówienie</button>
                    <button className="button" type="button" onClick={onCancelEdit}>Anuluj edycję</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="order-detail-layout">
                    <OrderSection title="Postęp onboardingu">
                      <DetailItem label="Aktualny krok" value={order.onboarding_step_label || `Krok ${order.onboarding_step || 0}`} />
                      <DetailItem label="Numer kroku" value={order.onboarding_step} />
                      <DetailItem label="Formularz ukończony" value={order.onboarding_completed ? "Tak" : "Nie"} />
                      <DetailItem label="Ostatnia aktualizacja" value={order.updated_at ? formatDate(order.updated_at) : null} />
                    </OrderSection>
                    <OrderSection title="Firma i kontakt">
                      <DetailItem label="Firma" value={order.company_name} />
                      <DetailItem label="NIP" value={order.nip} />
                      <DetailItem label="Osoba" value={order.contact_name} />
                      <DetailItem label="Email" value={order.contact_email} />
                      <DetailItem label="Telefon" value={order.phone} />
                      <DetailItem label="Strona" value={order.website} />
                    </OrderSection>
                    <OrderSection title="Pakiet i płatność">
                      <DetailItem label="Pakiet" value={order.plan_name || order.plan_id} />
                      <DetailItem label="Cena" value={order.plan_price_pln ? `${order.plan_price_pln} zł netto/mies.` : null} />
                      <DetailItem label="Limit dzienny" value={order.daily_emails} />
                      <DetailItem label="Limit miesięczny" value={order.monthly_emails} />
                      <DetailItem label="Łączny limit dzienny" value={order.total_daily_emails || order.daily_emails} />
                      <DetailItem label="Dodatkowa skrzynka" value={order.additional_mailbox_requested ? `Tak · +${order.additional_mailbox_daily_emails || ADDITIONAL_MAILBOX_DAILY_EMAILS} maili/dzień · ${order.additional_mailbox_price_pln || ADDITIONAL_MAILBOX_PRICE_PLN} zł netto/mies.` : "Nie"} />
                      <DetailItem label="Stripe status" value={order.stripe_payment_status} />
                      <DetailItem label="Paid at" value={order.paid_at ? formatDate(order.paid_at) : null} />
                    </OrderSection>
                    <OrderSection title="Kampania">
                      <DetailItem label="Zasięg" value={LOCATION_SCOPE_LABELS[(order.location_scope as keyof typeof LOCATION_SCOPE_LABELS) || "custom"] || order.location_scope} />
                      <DetailItem label="Lokalizacje" value={joinList(order.selected_locations)} />
                      <DetailItem label="Branże" value={joinList(order.target_industries)} />
                      <DetailItem label="Usługa" value={order.promoted_service} />
                      <DetailItem label="CTA" value={order.call_to_action} />
                      <DetailItem label="Ton" value={order.tone} />
                    </OrderSection>
                    <OrderSection title="Załączniki klienta">
                      {orderFiles.length ? orderFiles.map((attachment) => (
                        <DetailItem
                          key={attachment.id}
                          label={attachment.file_name}
                          value={`${attachment.file_size_bytes ? `${Math.round(attachment.file_size_bytes / 1024)} KB` : "plik"}${attachment.storage_path ? " · Supabase Storage" : ""}`}
                        />
                      )) : <DetailItem label="Pliki" value="Brak załączników" />}
                    </OrderSection>
                    <OrderSection title="Konfiguracja skrzynki">
                      <DetailItem label="Tryb" value={order.mailbox_setup_mode === "fluxbase_setup" ? "FluxBase zakłada skrzynkę" : "Klient podłącza SMTP"} />
                      <DetailItem label="Preferowana nazwa" value={order.desired_mailbox_local_part} />
                      <DetailItem label="Główny email odpowiedzi" value={order.reply_destination_email || order.smtp_reply_to} />
                      <DetailItem label="Dodatkowa skrzynka" value={order.additional_mailbox_requested ? `Tak, płatna opcja ${ADDITIONAL_MAILBOX_PRICE_PLN} zł netto/mies.` : "Nie"} />
                    </OrderSection>
                    <OrderSection title="SMTP">
                      <DetailItem label="SMTP user" value={order.smtp_user} />
                      <DetailItem label="Host" value={`${order.smtp_host || "smtp.gmail.com"}:${order.smtp_port || 465}`} />
                      <DetailItem label="SSL" value={order.smtp_secure === false ? "Nie" : "Tak"} />
                      <DetailItem label="From" value={order.smtp_from} />
                      <DetailItem label="Reply-To" value={order.smtp_reply_to} />
                      <DetailItem label="SMTP pass" value={order.smtp_pass_provided ? `Zaszyfrowane · ${order.smtp_pass_last4 ? `****${order.smtp_pass_last4}` : "końcówka ukryta"}` : "Brak"} />
                      <SmtpSecretDisplay
                        value={revealedOrderSmtp}
                        fallback={order.smtp_pass_provided ? `Zaszyfrowane w bazie · ${order.smtp_pass_last4 ? `****${order.smtp_pass_last4}` : "końcówka ukryta"}` : "Brak zapisanego hasła SMTP"}
                        disabled={!order.smtp_pass_provided}
                        onReveal={() => onRevealSmtpPass(order.id)}
                      />
                    </OrderSection>
                    <OrderSection title="Stripe ID i aktywacja">
                      <DetailItem label="Checkout Session" value={order.stripe_checkout_session_id} />
                      <DetailItem label="Customer ID" value={order.stripe_customer_id} />
                      <DetailItem label="Subscription ID" value={order.stripe_subscription_id} />
                      <DetailItem label="Price ID" value={order.stripe_price_id} />
                      <DetailItem label="Client ID" value={order.converted_client_id} />
                      <DetailItem label="Campaign ID" value={order.converted_campaign_id} />
                    </OrderSection>
                  </div>
                  <div className="notes-box"><strong>Opis firmy:</strong> {order.company_description || "-"}</div>
                  <div className="notes-box"><strong>Wartość oferty:</strong> {order.value_proposition || "-"}</div>
                  <div className="notes-box"><strong>Klient docelowy:</strong> {order.target_customer_description || "-"}</div>
                  <div className="notes-box"><strong>Problemy:</strong> {order.customer_pain_points || "-"}</div>
                  <div className="notes-box"><strong>Unikać:</strong> {order.avoid_in_messages || "-"}</div>
                  <div className="notes-box"><strong>Przykładowy mail / styl:</strong> {order.sample_email_style || "-"}</div>
                  <div className="notes-box"><strong>Faktura:</strong> {order.wants_vat_invoice ? order.invoice_details || order.nip || "Tak, brak szczegółów" : "Nie"}</div>
                  {order.payment_error ? <div className="notes-box"><strong>Błąd/notatka płatności:</strong> {order.payment_error}</div> : null}
                </>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

export function SettingsView({
  secrets,
  form,
  setForm,
  onSubmit,
  onToggle,
  onDelete,
}: {
  secrets: SecretSummary[];
  form: typeof initialSecretForm;
  setForm: (value: typeof initialSecretForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggle: (secret: SecretSummary) => void;
  onDelete: (secret: SecretSummary) => void;
}) {
  return (
    <>
      <ScreenHeader title="Sekrety" subtitle="Klucze API i SMTP przechowywane wyłącznie po stronie serwera." />
      <div className="two-column">
        <Panel eyebrow="Sekret" title="Nowy sekret">
          <form className="form-grid" onSubmit={onSubmit}>
            <SelectField label="Typ" value={form.provider} onChange={(value) => setForm({ ...form, provider: value })} required span>
              {SECRET_PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </SelectField>
            <InputField label="Etykieta" value={form.label} onChange={(value) => setForm({ ...form, label: value })} span />
            <InputField label="Sekret" value={form.secret} onChange={(value) => setForm({ ...form, secret: value })} type="password" required span />
            <button className="button primary span" type="submit">
              Zapisz sekret
            </button>
          </form>
        </Panel>
        <Panel eyebrow="Dostęp" title="Widoczność">
          <EmptyState>Pełne wartości sekretów nie są zwracane do panelu.</EmptyState>
        </Panel>
      </div>
      <TableCard
        rows={secrets}
        empty="Brak sekretów."
        columns={["Typ", "Etykieta", "Wartość", "Status", "Utworzono", "Akcje"]}
        render={(secret) => (
          <tr key={secret.id}>
            <td>{secret.provider}</td>
            <td>{secret.label}</td>
            <td>****{secret.value_last4 || "????"}</td>
            <td>
              <StatusBadge status={secret.is_active ? "active" : "paused"}>{secret.is_active ? "Aktywny" : "Nieaktywny"}</StatusBadge>
            </td>
            <td>{formatDate(secret.created_at)}</td>
            <td>
              <div className="row-actions">
                <button className="button small" type="button" onClick={() => onToggle(secret)}>{secret.is_active ? "Dezaktywuj" : "Aktywuj"}</button>
                <button className="button small danger" type="button" onClick={() => onDelete(secret)}>Usuń</button>
              </div>
            </td>
          </tr>
        )}
      />
    </>
  );
}

