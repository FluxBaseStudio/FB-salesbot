"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import BotSellerLogo from "@/components/brand/BotSellerLogo";
import SessionGuard from "@/components/security/SessionGuard";
import {
  DashboardShell,
  EmptyState,
  InputField,
  Notice as NoticeBox,
  Panel,
  Sidebar,
} from "@/components/admin/ui";
import { defaultDateRange, type DateRangeValue } from "@/lib/dateRange";
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabaseClient";
import type {
  AdminData,
  AdminResource,
  Campaign,
  CampaignAttachment,
  ClientAccount,
  Bot,
  Lead,
  Message,
  SecretSummary,
  SignupOrder,
} from "@/lib/types";
import {
  validateBotPayload,
  validateCampaignPayload,
  validateClientPayload,
  validateLeadPayload,
  validateSecretPayload,
} from "@/lib/validation";
import {
  AiUsageView,
  AuditView,
  BillingView,
  BotsView,
  CampaignsView,
  ClientsView,
  Dashboard,
  LeadsView,
  MessagesView,
  OrdersView,
  OperationsView,
  QueueView,
  RunsView,
  SettingsView,
  SuppressionView,
} from "@/components/admin/adminSections";
import { useAdminData } from "@/components/admin/hooks/useAdminData";
import {
  clientCampaignForm,
  emptyData,
  errorMessage,
  formFromCampaign,
  formFromClient,
  formFromBot,
  formFromLead,
  formFromOrder,
  initialBotForm,
  initialCampaignForm,
  initialClientForm,
  initialLeadFilters,
  initialLeadForm,
  initialMessageFilters,
  initialOrderEditForm,
  initialSecretForm,
  initialSuppressionForm,
  tabs,
  type ClientDetails,
  type DnsCheckResult,
  type MutateAction,
  type NoticeState,
  type TabId,
} from "@/components/admin/adminShared";
async function parseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(payload.error || "Serwer zwrócił błąd.");
  return payload as T;
}

export default function AdminApp() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const configReady = hasSupabaseBrowserConfig();
  const [bootstrapped, setBootstrapped] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<TabId>("dashboard");
  const [data, setData] = useState<AdminData>(emptyData);
  const [secrets, setSecrets] = useState<SecretSummary[]>([]);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [loading, setLoading] = useState(false);
  const [panelLoading, setPanelLoading] = useState(false);
  const [botForm, setBotForm] = useState(initialBotForm);
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [botEditForm, setBotEditForm] = useState(initialBotForm);
  const [clientForm, setClientForm] = useState(initialClientForm);
  const [campaignForm, setCampaignForm] = useState(initialCampaignForm);
  const [campaignFiles, setCampaignFiles] = useState<File[]>([]);
  const [leadForm, setLeadForm] = useState(initialLeadForm);
  const [secretForm, setSecretForm] = useState(initialSecretForm);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientDetails, setSelectedClientDetails] = useState<ClientDetails | null>(null);
  const [clientEditForm, setClientEditForm] = useState(initialClientForm);
  const [clientMode, setClientMode] = useState<"view" | "edit">("view");
  const [clientCampaignDraft, setClientCampaignDraft] = useState(initialCampaignForm);
  const [clientCampaignFiles, setClientCampaignFiles] = useState<File[]>([]);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [campaignEditForm, setCampaignEditForm] = useState(initialCampaignForm);
  const [campaignEditFiles, setCampaignEditFiles] = useState<File[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [runningCampaignId, setRunningCampaignId] = useState<string | null>(null);
  const [leadFilters, setLeadFilters] = useState(initialLeadFilters);
  const [messageFilters, setMessageFilters] = useState(initialMessageFilters);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [leadEditForm, setLeadEditForm] = useState(initialLeadForm);
  const [suppressionForm, setSuppressionForm] = useState(initialSuppressionForm);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderEditForm, setOrderEditForm] = useState(initialOrderEditForm);
  const [revealedSmtpPasses, setRevealedSmtpPasses] = useState<Record<string, string>>({});
  const [pendingSmtpReveal, setPendingSmtpReveal] = useState<{ kind: "clients" | "signup-orders"; id: string } | null>(null);
  const [smtpRevealConfirmText, setSmtpRevealConfirmText] = useState("");
  const [smtpRevealBusy, setSmtpRevealBusy] = useState(false);
  const [dnsChecks, setDnsChecks] = useState<Record<string, DnsCheckResult>>({});
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => defaultDateRange());

  const stats = useAdminData(data);

  useEffect(() => {
    if (!supabase) {
      setBootstrapped(true);
      return;
    }

    let active = true;
    supabase.auth
      .getSession()
      .then(({ data: authData }) => {
        if (!active) return;
        setSession(authData.session);
        if (authData.session) void loadAll(authData.session.access_token);
      })
      .finally(() => {
        if (active) setBootstrapped(true);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) void loadAll(nextSession.access_token);
      else {
        setData(emptyData);
        setSecrets([]);
        setSelectedClientId(null);
        setSelectedClientDetails(null);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function accessToken(explicitToken?: string) {
    if (explicitToken) return explicitToken;
    if (!supabase) throw new Error("Brakuje konfiguracji logowania.");
    const { data: authData } = await supabase.auth.getSession();
    const token = authData.session?.access_token;
    if (!token) throw new Error("Sesja wygasła. Zaloguj się ponownie.");
    return token;
  }

  async function loadAll(explicitToken?: string) {
    setLoading(true);
    try {
      const token = await accessToken(explicitToken);
      const headers = { Authorization: `Bearer ${token}` };
      const params = new URLSearchParams({ dateFrom: dateRange.dateFrom, dateTo: dateRange.dateTo });
      const [adminData, secretData] = await Promise.all([
        fetch(`/api/admin-data?${params.toString()}`, { headers }).then((response) => parseJson<AdminData>(response)),
        fetch("/api/secrets", { headers }).then((response) => parseJson<{ items: SecretSummary[] }>(response)),
      ]);

      setData(adminData);
      setSecrets(secretData.items || []);
      setNotice(null);
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session) void loadAll();
  }, [dateRange.dateFrom, dateRange.dateTo]);

  async function refreshClientDetails(clientId: string, explicitToken?: string) {
    const token = await accessToken(explicitToken);
    const details = await fetch(`/api/clients/${clientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) => parseJson<ClientDetails>(response));
    setSelectedClientDetails(details);
    setSelectedClientId(clientId);
    return details;
  }

  async function openClient(client: ClientAccount) {
    setSelectedClientId(client.id);
    setClientMode("view");
    setClientEditForm(formFromClient(client));
    setClientCampaignDraft(clientCampaignForm(client.id));
    setPanelLoading(true);
    try {
      const details = await refreshClientDetails(client.id);
      setClientEditForm(formFromClient(details.client));
      setClientCampaignDraft(clientCampaignForm(details.client.id));
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    } finally {
      setPanelLoading(false);
    }
  }

  async function mutate(resource: AdminResource, action: MutateAction, payload: unknown, id?: string) {
    const token = await accessToken();
    const result = await fetch("/api/admin-data", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ resource, action, payload, id }),
    }).then((response) => parseJson<{ ok: true; id?: string | null }>(response));
    await loadAll(token);
    if (selectedClientId) await refreshClientDetails(selectedClientId, token).catch(() => undefined);
    return { ...result, token };
  }

  async function uploadCampaignFiles(campaignId: string, files: File[], token?: string) {
    if (!files.length) return;
    const authToken = token || await accessToken();
    for (const file of files) {
      const formData = new FormData();
      formData.set("file", file);
      await fetch(`/api/campaigns/${campaignId}/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: formData,
      }).then((response) => parseJson<{ ok: true }>(response));
    }
    await loadAll(authToken);
  }


  async function checkClientDns(clientId: string) {
    try {
      const token = await accessToken();
      const result = await fetch(`/api/clients/${clientId}/dns-check`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then((response) => parseJson<{ ok: true } & DnsCheckResult>(response));
      setDnsChecks((current) => ({ ...current, [clientId]: result }));
      setNotice({ tone: "success", message: `DNS sprawdzony dla domeny ${result.domain}.` });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  function revealSmtpPass(kind: "clients" | "signup-orders", id: string) {
    // Wrażliwa akcja: hasło SMTP odsłaniamy dopiero po świadomym
    // potwierdzeniu w modalu (wpisanie POTWIERDZAM), nigdy jednym kliknięciem.
    setSmtpRevealConfirmText("");
    setPendingSmtpReveal({ kind, id });
  }

  async function confirmRevealSmtpPass() {
    if (!pendingSmtpReveal || smtpRevealConfirmText.trim().toUpperCase() !== "POTWIERDZAM") return;
    const { kind, id } = pendingSmtpReveal;
    setSmtpRevealBusy(true);
    try {
      const token = await accessToken();
      const result = await fetch(`/api/${kind}/${id}/reveal-smtp`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then((response) => parseJson<{ ok: true; smtp_pass: string }>(response));
      setRevealedSmtpPasses((current) => ({ ...current, [`${kind}:${id}`]: result.smtp_pass }));
      setPendingSmtpReveal(null);
      setSmtpRevealConfirmText("");
      setNotice({ tone: "warning", message: "Hasło SMTP zostało pokazane w panelu admina. Nie kopiuj go poza konfigurację klienta." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    } finally {
      setSmtpRevealBusy(false);
    }
  }

  async function toggleCampaignAttachment(attachment: CampaignAttachment) {
    try {
      const token = await accessToken();
      await fetch(`/api/campaigns/${attachment.campaign_id}/attachments/${attachment.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !attachment.is_active }),
      }).then((response) => parseJson<{ ok: true }>(response));
      await loadAll(token);
      setNotice({ tone: "success", message: "Status załącznika został zmieniony." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  async function deleteCampaignAttachment(attachment: CampaignAttachment) {
    if (!window.confirm(`Usunąć załącznik "${attachment.file_name}"?`)) return;
    try {
      const token = await accessToken();
      await fetch(`/api/campaigns/${attachment.campaign_id}/attachments/${attachment.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => parseJson<{ ok: true }>(response));
      await loadAll(token);
      setNotice({ tone: "success", message: "Załącznik został usunięty." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (!supabase) {
      setNotice({ tone: "danger", message: "Uzupełnij NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY." });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setNotice({ tone: "warning", message: "Podaj email i hasło." });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) setNotice({ tone: "danger", message: error.message });
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut().catch(() => undefined);
    setSession(null);
    setData(emptyData);
    setSecrets([]);
    setSelectedClientId(null);
    setSelectedClientDetails(null);
    // Twarde przeładowanie na ekran logowania: czyści stan aplikacji
    // i uniemożliwia powrót do danych panelu przyciskiem Wstecz.
    window.location.replace("/admin");
  }

  async function addClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateClientPayload(clientForm);
    if (!validation.ok) return setNotice({ tone: "warning", message: validation.errors.join(" ") });

    try {
      await mutate("client_accounts", "create", validation.data);
      setClientForm(initialClientForm);
      setNotice({ tone: "success", message: "Klient został dodany." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClientId) return;
    const validation = validateClientPayload(clientEditForm);
    if (!validation.ok) return setNotice({ tone: "warning", message: validation.errors.join(" ") });

    try {
      const token = await accessToken();
      const result = await fetch(`/api/clients/${selectedClientId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      }).then((response) => parseJson<{ client: ClientAccount }>(response));

      setData((current) => ({
        ...current,
        clients: current.clients.map((client) => (client.id === result.client.id ? result.client : client)),
      }));
      await loadAll(token);
      await refreshClientDetails(selectedClientId, token);
      setClientMode("view");
      setNotice({ tone: "success", message: "Dane klienta zostały zapisane." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  async function addBot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateBotPayload(botForm);
    if (!validation.ok) return setNotice({ tone: "warning", message: validation.errors.join(" ") });
    try {
      await mutate("bots", "create", validation.data);
      setBotForm(initialBotForm);
      setNotice({ tone: "success", message: "Bot został dodany." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  function beginBotEdit(bot: Bot) {
    setEditingBotId(bot.id);
    setBotEditForm(formFromBot(bot));
  }

  async function saveBot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingBotId) return;
    const validation = validateBotPayload(botEditForm);
    if (!validation.ok) return setNotice({ tone: "warning", message: validation.errors.join(" ") });
    try {
      await mutate("bots", "update", validation.data, editingBotId);
      setEditingBotId(null);
      setNotice({ tone: "success", message: "Bot został zapisany." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  async function deleteBot(bot: Bot) {
    if (!window.confirm(`Usunąć bota "${bot.name}"? Jeśli bot ma aktywne kampanie, system zablokuje usunięcie.`)) return;
    try {
      await mutate("bots", "delete", {}, bot.id);
      setNotice({ tone: "success", message: "Bot został usunięty." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  async function deleteClient(client: ClientAccount) {
    const confirmed = window.confirm(
      `Usunąć klienta "${client.company_name}"?\n\nZgodnie ze schematem bazy kampanie klienta zostaną usunięte, a powiązane leady i wiadomości mogą zostać odłączone od klienta lub kampanii. Tej akcji nie należy wykonywać bez świadomej decyzji.`,
    );
    if (!confirmed) return;

    try {
      const token = await accessToken();
      await fetch(`/api/clients/${client.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => parseJson<{ ok: true }>(response));
      setSelectedClientId(null);
      setSelectedClientDetails(null);
      await loadAll(token);
      setNotice({ tone: "success", message: "Klient został usunięty." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  async function addCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateCampaignPayload(campaignForm);
    if (!validation.ok) return setNotice({ tone: "warning", message: validation.errors.join(" ") });

    try {
      const result = await mutate("campaigns", "create", validation.data);
      if (result.id) await uploadCampaignFiles(result.id, campaignFiles, result.token);
      setCampaignForm(initialCampaignForm);
      setCampaignFiles([]);
      setNotice({ tone: "success", message: campaignFiles.length ? "Kampania została dodana razem z załącznikami." : "Kampania została dodana." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  async function addClientCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClientId) return;
    const validation = validateCampaignPayload({ ...clientCampaignDraft, client_id: selectedClientId });
    if (!validation.ok) return setNotice({ tone: "warning", message: validation.errors.join(" ") });

    try {
      const result = await mutate("campaigns", "create", validation.data);
      if (result.id) await uploadCampaignFiles(result.id, clientCampaignFiles, result.token);
      setClientCampaignDraft(clientCampaignForm(selectedClientId));
      setClientCampaignFiles([]);
      setNotice({ tone: "success", message: clientCampaignFiles.length ? "Kampania klienta została dodana razem z załącznikami." : "Kampania klienta została dodana." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  async function saveCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCampaignId) return;
    const validation = validateCampaignPayload(campaignEditForm);
    if (!validation.ok) return setNotice({ tone: "warning", message: validation.errors.join(" ") });

    try {
      const result = await mutate("campaigns", "update", validation.data, editingCampaignId);
      await uploadCampaignFiles(editingCampaignId, campaignEditFiles, result.token);
      setCampaignEditFiles([]);
      setEditingCampaignId(null);
      setNotice({ tone: "success", message: campaignEditFiles.length ? "Kampania została zapisana i dodano załączniki." : "Kampania została zapisana." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  function beginCampaignEdit(campaign: Campaign) {
    setEditingCampaignId(campaign.id);
    setCampaignEditForm(formFromCampaign(campaign));
    setCampaignEditFiles([]);
  }

  async function runCampaignBot(campaignId: string) {
    try {
      const token = await accessToken();
      setRunningCampaignId(campaignId);
      setNotice({ tone: "info", message: "Bot ruszył. Szuka firm, maili, robi audyt, generuje wiadomości i automatycznie wysyła według limitu kampanii. To może potrwać kilkadziesiąt sekund." });
      const result = await fetch(`/api/campaigns/${campaignId}/run`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then((response) =>
        parseJson<{
          ok: true;
          stats: {
            searchedQueries: number;
            foundPlaces: number;
            skippedDuplicates: number;
            insertedLeads: number;
            emailsFound: number;
            draftsCreated: number;
            missingEmail: number;
            belowScore: number;
            sendAttempts: number;
            sentEmails: number;
            sendFailures: number;
            errors: string[];
          };
        }>(response),
      );
      await loadAll(token);
      if (selectedClientId) await refreshClientDetails(selectedClientId, token).catch(() => undefined);
      setNotice({
        tone: "success",
        message: `Bot zakończył pracę: ${result.stats.sentEmails} wysłanych maili i ${result.stats.insertedLeads} zapisanych leadów. Bez emaila pominięto: ${result.stats.missingEmail}. Błędy wysyłki: ${result.stats.sendFailures}. Duplikaty: ${result.stats.skippedDuplicates}.`,
      });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    } finally {
      setRunningCampaignId(null);
    }
  }

  async function resetCampaignBot(campaignId: string) {
    const campaign = data.campaigns.find((item) => item.id === campaignId);
    const name = campaign?.name || "kampanię";
    const confirmed = window.confirm(`Zresetować ${name}?\n\nTo odblokuje kampanię, zamknie zawieszone runy i anuluje dzisiejszą niewysłaną kolejkę. Wiadomości faktycznie wysłane dziś zostaną zachowane i dalej będą liczone do dziennego limitu.`);
    if (!confirmed) return;

    try {
      const token = await accessToken();
      setNotice({ tone: "info", message: "Resetuję kampanię: czyszczę blokady, zawieszone runy i dzisiejszą niewysłaną kolejkę. Wysłane dziś wiadomości zostają bez zmian." });
      const result = await fetch(`/api/campaigns/${campaignId}/reset`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then((response) => parseJson<{ ok: true; sentToday: number; cancelledQueue: number; closedRuns: number; nextRunAt: string | null; message: string }>(response));
      await loadAll(token);
      if (selectedClientId) await refreshClientDetails(selectedClientId, token).catch(() => undefined);
      setNotice({
        tone: "success",
        message: `Reset gotowy. Wysłane dziś zostają: ${result.sentToday}. Anulowano niewysłane pozycje kolejki: ${result.cancelledQueue}. Zamknięto zawieszone runy: ${result.closedRuns}. Bot dobije tylko brakującą część dziennego limitu.`,
      });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }


  async function addLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateLeadPayload(leadForm);
    if (!validation.ok) return setNotice({ tone: "warning", message: validation.errors.join(" ") });

    try {
      await mutate("leads", "create", validation.data);
      setLeadForm(initialLeadForm);
      setNotice({ tone: "success", message: "Lead został dodany." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }


  function beginLeadEdit(lead: Lead) {
    setEditingLeadId(lead.id);
    setLeadEditForm(formFromLead(lead));
  }

  async function saveLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingLeadId) return;
    const validation = validateLeadPayload(leadEditForm);
    if (!validation.ok) return setNotice({ tone: "warning", message: validation.errors.join(" ") });

    try {
      await mutate("leads", "update", validation.data, editingLeadId);
      setEditingLeadId(null);
      setNotice({ tone: "success", message: "Lead został zapisany." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  async function deleteLead(lead: Lead) {
    const confirmed = window.confirm(`Usunąć lead "${lead.company_name}"? Powiązane wiadomości mogą zostać usunięte zgodnie ze schematem bazy.`);
    if (!confirmed) return;
    try {
      await mutate("leads", "delete", {}, lead.id);
      if (editingLeadId === lead.id) setEditingLeadId(null);
      setNotice({ tone: "success", message: "Lead został usunięty." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  async function deleteMessage(message: Message) {
    const confirmed = window.confirm(`Usunąć wiadomość "${message.subject || "bez tematu"}"?`);
    if (!confirmed) return;
    try {
      await mutate("messages", "delete", {}, message.id);
      setNotice({ tone: "success", message: "Wiadomość została usunięta." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  async function addSecret(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateSecretPayload(secretForm);
    if (!validation.ok) return setNotice({ tone: "warning", message: validation.errors.join(" ") });

    try {
      const token = await accessToken();
      await fetch("/api/secrets", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      }).then((response) => parseJson<{ ok: true }>(response));
      setSecretForm(initialSecretForm);
      await loadAll(token);
      setNotice({ tone: "success", message: "Sekret został zapisany." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  async function toggleSecret(secret: SecretSummary) {
    try {
      const token = await accessToken();
      await fetch(`/api/secrets/${secret.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !secret.is_active }),
      }).then((response) => parseJson<{ ok: true }>(response));
      await loadAll(token);
      setNotice({ tone: "success", message: "Status sekretu został zmieniony." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  async function deleteSecret(secret: SecretSummary) {
    if (!window.confirm(`Usunąć sekret ${secret.provider} / ${secret.label}?`)) return;
    try {
      const token = await accessToken();
      await fetch(`/api/secrets/${secret.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).then((response) => parseJson<{ ok: true }>(response));
      await loadAll(token);
      setNotice({ tone: "success", message: "Sekret został usunięty." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  async function testClientSmtp(clientId: string) {
    try {
      const token = await accessToken();
      await fetch(`/api/clients/${clientId}/test-smtp`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({}) }).then((response) => parseJson<{ ok: true }>(response));
      setNotice({ tone: "success", message: "Test SMTP wysłany do maila admina." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }
  async function convertSignupOrder(orderId: string) {
    if (!window.confirm("Aktywować to zamówienie? System utworzy klienta, kampanię i jednorazowe hasło do panelu klienta.")) return;
    try {
      const token = await accessToken();
      const result = await fetch(`/api/signup-orders/${orderId}/convert`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then((response) => parseJson<{ ok: true; clientId: string; campaignId: string; portalEmail: string; portalPassword: string }>(response));
      await loadAll(token);
      setNotice({
        tone: "success",
        message: `Zamówienie aktywowane. Login klienta: ${result.portalEmail}. Jednorazowe hasło do przekazania klientowi: ${result.portalPassword}`,
      });
      setTab("clients");
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  async function rejectSignupOrder(orderId: string) {
    const reason = window.prompt("Powód odrzucenia zamówienia?", "Dane wymagają poprawy przed aktywacją.");
    if (reason === null) return;
    try {
      const token = await accessToken();
      await fetch(`/api/signup-orders/${orderId}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }).then((response) => parseJson<{ ok: true }>(response));
      await loadAll(token);
      setNotice({ tone: "success", message: "Zamówienie zostało odrzucone." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  function beginOrderEdit(order: SignupOrder) {
    setEditingOrderId(order.id);
    setOrderEditForm(formFromOrder(order));
  }

  async function saveSignupOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingOrderId) return;
    try {
      const token = await accessToken();
      await fetch(`/api/signup-orders/${editingOrderId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(orderEditForm),
      }).then((response) => parseJson<{ ok: true }>(response));
      setEditingOrderId(null);
      setOrderEditForm(initialOrderEditForm);
      await loadAll(token);
      setNotice({ tone: "success", message: "Zamówienie zostało zapisane." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  async function deleteSignupOrder(order: SignupOrder) {
    const confirmed = window.confirm(`Usunąć zamówienie firmy "${order.company_name}"? Tej akcji nie da się cofnąć.`);
    if (!confirmed) return;
    try {
      const token = await accessToken();
      await fetch(`/api/signup-orders/${order.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => parseJson<{ ok: true }>(response));
      if (editingOrderId === order.id) setEditingOrderId(null);
      await loadAll(token);
      setNotice({ tone: "success", message: "Zamówienie zostało usunięte." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }


  async function updateStatus(resource: AdminResource, id: string, payload: unknown) {
    try {
      await mutate(resource, "updateStatus", payload, id);
      setNotice({ tone: "success", message: "Status został zaktualizowany." });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    }
  }

  if (!bootstrapped) {
    return (
      <main className="login-page">
        <Panel className="login-panel">
          <div className="login-brand">
            <BotSellerLogo variant="sidebar" />
            <span>Panel administratora</span>
          </div>
          <EmptyState>Ładowanie panelu...</EmptyState>
        </Panel>
      </main>
    );
  }

  if (!configReady || !session) {
    return (
      <main className="login-page">
        <div className="login-backdrop" aria-hidden="true" />
        <form className="login-panel" onSubmit={login}>
          <div className="login-brand">
            <BotSellerLogo variant="sidebar" />
            <span>Panel administratora</span>
          </div>
          <div className="login-copy">
            <h1>Zaloguj się do panelu</h1>
            <p>Zarządzanie klientami, kampaniami i kolejką wysyłki BotSellera.</p>
          </div>
          {notice ? <NoticeBox tone={notice.tone}>{notice.message}</NoticeBox> : null}
          {!configReady ? <NoticeBox tone="danger">Brakuje publicznej konfiguracji Supabase w `.env.local`.</NoticeBox> : null}
          <InputField label="Email" value={email} onChange={setEmail} type="email" required />
          <InputField label="Hasło" value={password} onChange={setPassword} type="password" required />
          <button className="button primary login-submit" type="submit" disabled={!configReady}>
            Zaloguj się
          </button>
          <p className="login-security-note">
            Sesja wygasa automatycznie po 30 minutach bezczynności. Na publicznym lub cudzym komputerze
            pamiętaj, aby się wylogować.
          </p>
        </form>
      </main>
    );
  }

  return (
    <DashboardShell
      sidebar={
        <Sidebar
          title="FluxBase"
          subtitle="BotSeller Admin"
          items={tabs}
          activeId={tab}
          onSelect={(id) => setTab(id as TabId)}
          cta={
            <>
              <span>SalesBot pipeline</span>
              <strong>{data.signupOrders.length} zamówień</strong>
              <button className="button primary span" onClick={() => setTab("orders")} type="button">
                Przejdź do zamówień
              </button>
            </>
          }
          footer={
            <>
              <span>{session.user.email}</span>
              <button className="button primary-soft span" onClick={() => { window.location.href = "/trader"; }} type="button">
                Otwórz TraderBota
              </button>
              <button className="button logout-button" onClick={logout} type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
                Wyloguj
              </button>
              <small className="sidebar-security-note">
                Na publicznym lub cudzym komputerze pamiętaj, aby się wylogować.
              </small>
            </>
          }
        />
      }
    >
        {notice ? <NoticeBox tone={notice.tone}>{notice.message}</NoticeBox> : null}
        {tab === "dashboard" ? <Dashboard data={data} stats={stats} loading={loading} onRefresh={() => void loadAll()} dateRange={dateRange} onDateRangeChange={setDateRange} onOpenTab={setTab} /> : null}
        {tab === "operations" ? <OperationsView data={data} onOpenTab={setTab} /> : null}
        {tab === "bots" ? (
          <BotsView
            bots={data.bots}
            campaigns={data.campaigns}
            liveData={data}
            form={botForm}
            setForm={setBotForm}
            onSubmit={addBot}
            editingBotId={editingBotId}
            editForm={botEditForm}
            setEditForm={setBotEditForm}
            onEdit={beginBotEdit}
            onSave={saveBot}
            onCancelEdit={() => setEditingBotId(null)}
            onDelete={(bot) => void deleteBot(bot)}
            onStatus={(id, status) => void updateStatus("bots", id, { status })}
          />
        ) : null}
        {tab === "clients" ? (
          <ClientsView
            clients={data.clients}
            bots={data.bots}
            campaigns={data.campaigns}
            leads={data.leads}
            messages={data.messages}
            campaignAttachments={data.campaignAttachments}
            form={clientForm}
            setForm={setClientForm}
            onSubmit={addClient}
            onStatus={(id, status) => void updateStatus("client_accounts", id, { subscription_status: status })}
            onOpen={(client) => void openClient(client)}
            selectedClientId={selectedClientId}
            selectedDetails={selectedClientDetails}
            panelLoading={panelLoading}
            mode={clientMode}
            setMode={setClientMode}
            editForm={clientEditForm}
            setEditForm={setClientEditForm}
            onSave={saveClient}
            onDelete={(client) => void deleteClient(client)}
            campaignDraft={clientCampaignDraft}
            setCampaignDraft={setClientCampaignDraft}
            campaignFiles={clientCampaignFiles}
            setCampaignFiles={setClientCampaignFiles}
            onAddCampaign={addClientCampaign}
            editingCampaignId={editingCampaignId}
            campaignEditForm={campaignEditForm}
            setCampaignEditForm={setCampaignEditForm}
            campaignEditFiles={campaignEditFiles}
            setCampaignEditFiles={setCampaignEditFiles}
            onEditCampaign={beginCampaignEdit}
            onSaveCampaign={saveCampaign}
            onCancelCampaignEdit={() => setEditingCampaignId(null)}
            onCampaignStatus={(id, status) => void updateStatus("campaigns", id, { status })}
            onRunCampaign={(campaignId) => void runCampaignBot(campaignId)}
            onResetCampaign={(campaignId) => void resetCampaignBot(campaignId)}
            runningCampaignId={runningCampaignId}
            onTestSmtp={(clientId) => void testClientSmtp(clientId)}
            onCampaignDetails={(campaignId) => {
              setSelectedCampaignId(campaignId);
              setTab("campaigns");
            }}
            revealedSmtpPasses={revealedSmtpPasses}
            onRevealSmtpPass={(id) => void revealSmtpPass("clients", id)}
            dnsChecks={dnsChecks}
            onCheckDns={(id) => void checkClientDns(id)}
            onToggleAttachment={(attachment) => void toggleCampaignAttachment(attachment)}
            onDeleteAttachment={(attachment) => void deleteCampaignAttachment(attachment)}
          />
        ) : null}
        {tab === "campaigns" ? (
          <CampaignsView
            clients={data.clients}
            bots={data.bots}
            campaigns={data.campaigns}
            attachments={data.campaignAttachments}
            liveData={data}
            form={campaignForm}
            setForm={setCampaignForm}
            campaignFiles={campaignFiles}
            setCampaignFiles={setCampaignFiles}
            onSubmit={addCampaign}
            onStatus={(id, status) => void updateStatus("campaigns", id, { status })}
            onRunCampaign={(campaignId) => void runCampaignBot(campaignId)}
            onResetCampaign={(campaignId) => void resetCampaignBot(campaignId)}
            runningCampaignId={runningCampaignId}
            selectedCampaignId={selectedCampaignId}
            setSelectedCampaignId={setSelectedCampaignId}
            editingCampaignId={editingCampaignId}
            campaignEditForm={campaignEditForm}
            setCampaignEditForm={setCampaignEditForm}
            campaignEditFiles={campaignEditFiles}
            setCampaignEditFiles={setCampaignEditFiles}
            onEditCampaign={beginCampaignEdit}
            onSaveCampaign={saveCampaign}
            onCancelCampaignEdit={() => setEditingCampaignId(null)}
            onToggleAttachment={(attachment) => void toggleCampaignAttachment(attachment)}
            onDeleteAttachment={(attachment) => void deleteCampaignAttachment(attachment)}
          />
        ) : null}
        {tab === "leads" ? (
          <LeadsView
            clients={data.clients}
            campaigns={data.campaigns}
            leads={data.leads}
            form={leadForm}
            setForm={setLeadForm}
            onSubmit={addLead}
            onStatus={(id, status) => void updateStatus("leads", id, { status })}
            filters={leadFilters}
            setFilters={setLeadFilters}
            editingLeadId={editingLeadId}
            editForm={leadEditForm}
            setEditForm={setLeadEditForm}
            onEdit={beginLeadEdit}
            onSave={saveLead}
            onCancelEdit={() => setEditingLeadId(null)}
            onDelete={(lead) => void deleteLead(lead)}
          />
        ) : null}
        {tab === "messages" ? (
          <MessagesView
            clients={data.clients}
            campaigns={data.campaigns}
            messages={data.messages}
            filters={messageFilters}
            setFilters={setMessageFilters}
            onStatus={(id, status) => void updateStatus("messages", id, { status })}
            onDelete={(message) => void deleteMessage(message)}
          />
        ) : null}
        {tab === "runs" ? <RunsView runs={data.campaignRuns} logs={data.runLogs} onDelete={(id) => void mutate("campaign_runs", "delete", {}, id)} /> : null}
        {tab === "queue" ? (
          <QueueView
            items={data.sendQueue}
            summary={data.sendQueueSummary}
            onRetry={(id) => void updateStatus("send_queue", id, { status: "pending" })}
            onCancel={(id) => void updateStatus("send_queue", id, { status: "cancelled" })}
          />
        ) : null}
        {tab === "aiUsage" ? <AiUsageView data={data} /> : null}
        {tab === "suppression" ? (
          <SuppressionView
            clients={data.clients}
            items={data.suppressionList}
            form={suppressionForm}
            setForm={setSuppressionForm}
            onCreate={async (payload) => { await mutate("suppression_list", "create", payload); setSuppressionForm(initialSuppressionForm); }}
            onDelete={(id) => void mutate("suppression_list", "delete", {}, id)}
          />
        ) : null}
        {tab === "audit" ? <AuditView logs={data.auditLogs} /> : null}
        {tab === "billing" ? <BillingView clients={data.clients} campaigns={data.campaigns} /> : null}
        {tab === "orders" ? (
          <OrdersView
            orders={data.signupOrders}
            orderAttachments={data.signupOrderAttachments}
            editingOrderId={editingOrderId}
            editForm={orderEditForm}
            setEditForm={setOrderEditForm}
            onEdit={beginOrderEdit}
            onSave={saveSignupOrder}
            onCancelEdit={() => setEditingOrderId(null)}
            onDelete={(order) => void deleteSignupOrder(order)}
            onConvert={(id) => void convertSignupOrder(id)}
            onReject={(id) => void rejectSignupOrder(id)}
            revealedSmtpPasses={revealedSmtpPasses}
            onRevealSmtpPass={(id) => void revealSmtpPass("signup-orders", id)}
          />
        ) : null}
        {tab === "settings" ? (
          <SettingsView secrets={secrets} form={secretForm} setForm={setSecretForm} onSubmit={addSecret} onToggle={toggleSecret} onDelete={deleteSecret} />
        ) : null}

        <SessionGuard timeoutMinutes={30} warningMinutes={2} onLogout={logout} panelLabel="panelu administratora" />

        {pendingSmtpReveal ? (
          <div className="session-modal-backdrop" role="dialog" aria-modal="true" aria-label="Potwierdź odsłonięcie hasła SMTP">
            <section className="session-modal confirm-modal">
              <div className="session-modal-icon danger" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="10" width="16" height="10" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
              </div>
              <h2>Odsłonić hasło SMTP?</h2>
              <p>
                Hasło pojawi się na ekranie w postaci jawnej i zostanie zapisane w audycie.
                Upewnij się, że nikt nie patrzy na Twój ekran. Aby kontynuować, wpisz{" "}
                <strong>POTWIERDZAM</strong>.
              </p>
              <input
                className="confirm-input"
                value={smtpRevealConfirmText}
                onChange={(event) => setSmtpRevealConfirmText(event.target.value)}
                placeholder="POTWIERDZAM"
                autoFocus
                autoComplete="off"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void confirmRevealSmtpPass();
                  }
                }}
              />
              <div className="session-modal-actions">
                <button
                  className="button danger"
                  type="button"
                  disabled={smtpRevealBusy || smtpRevealConfirmText.trim().toUpperCase() !== "POTWIERDZAM"}
                  onClick={() => void confirmRevealSmtpPass()}
                >
                  {smtpRevealBusy ? "Odsłaniam..." : "Pokaż hasło SMTP"}
                </button>
                <button className="button ghost" type="button" onClick={() => setPendingSmtpReveal(null)}>
                  Anuluj
                </button>
              </div>
            </section>
          </div>
        ) : null}
    </DashboardShell>
  );
}

