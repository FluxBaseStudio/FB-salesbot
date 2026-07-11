"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { DashboardShell, EmptyState, Notice, Panel, ScreenHeader } from "@/components/admin/ui";
import SessionGuard from "@/components/security/SessionGuard";
import ApprovalQueueView from "@/components/trader/ApprovalQueueView";
import ExchangeConnectionView, { type ExchangeDraft } from "@/components/trader/ExchangeConnectionView";
import HistoryView from "@/components/trader/HistoryView";
import LiveTradingView from "@/components/trader/LiveTradingView";
import MarketAnalysisView from "@/components/trader/MarketAnalysisView";
import PaperTradingView from "@/components/trader/PaperTradingView";
import RiskStatus from "@/components/trader/RiskStatus";
import TraderSettingsView from "@/components/trader/TraderSettingsView";
import TraderSidebar from "@/components/trader/TraderSidebar";
import { traderCopy } from "@/components/trader/copy";
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabaseClient";
import type { Candle, TraderOverview, TraderSettings, TraderTab } from "@/lib/trader/types";
import { TRADER_DEFAULT_SETTINGS } from "@/lib/trader/types";

type NoticeState = { tone: "info" | "success" | "warning" | "danger"; message: string } | null;

const emptyOverview: TraderOverview = {
  schemaReady: true,
  liveTradingEnvEnabled: false,
  settings: TRADER_DEFAULT_SETTINGS,
  exchangeConnection: null,
  signals: [],
  positions: [],
  orders: [],
  trades: [],
  approvals: [],
  dailyRisk: null,
  auditLogs: [],
  balances: [],
  metrics: {
    openPositions: 0,
    closedPositions: 0,
    realizedPnl: "0",
    unrealizedPnl: "0",
    winCount: 0,
    lossCount: 0,
    winRatePercent: "0",
    maxDrawdown: "0",
    totalBalance: TRADER_DEFAULT_SETTINGS.paper_balance,
  },
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Nieznany błąd TraderBota.";
}

async function parseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(payload.error || "Serwer zwrócił błąd.");
  return payload as T;
}

export default function TraderApp() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const configReady = hasSupabaseBrowserConfig();
  const [bootstrapped, setBootstrapped] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<TraderTab>("market");
  const [overview, setOverview] = useState<TraderOverview>(emptyOverview);
  const [settingsDraft, setSettingsDraft] = useState<TraderSettings>(TRADER_DEFAULT_SETTINGS);
  const [exchangeDraft, setExchangeDraft] = useState<ExchangeDraft>({
    exchange_name: "binance_spot",
    label: "Binance Spot",
    api_key: "",
    api_secret: "",
    api_passphrase: "",
    sandbox: false,
  });
  const [notice, setNotice] = useState<NoticeState>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState("1h");
  const [candles, setCandles] = useState<Candle[]>([]);

  useEffect(() => {
    if (!supabase) {
      setBootstrapped(true);
      return;
    }
    let active = true;
    supabase.auth.getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        if (data.session) void load(data.session.access_token);
      })
      .finally(() => {
        if (active) setBootstrapped(true);
      });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) void load(nextSession.access_token);
      else setOverview(emptyOverview);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function accessToken(explicitToken?: string) {
    if (explicitToken) return explicitToken;
    if (!supabase) throw new Error("Brakuje konfiguracji logowania.");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Sesja wygasła. Zaloguj się ponownie w panelu administratora.");
    return token;
  }

  async function api<T>(path: string, init: RequestInit = {}, explicitToken?: string) {
    const token = await accessToken(explicitToken);
    return fetch(path, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers || {}),
      },
    }).then((response) => parseJson<T>(response));
  }

  async function load(explicitToken?: string) {
    setLoading(true);
    try {
      const data = await api<TraderOverview>("/api/trader/overview", {}, explicitToken);
      setOverview(data);
      setSettingsDraft(data.settings);
      const symbol = selectedSymbol || data.signals[0]?.symbol || null;
      setSelectedSymbol(symbol);
      setNotice(data.schemaReady ? null : { tone: "warning", message: data.schemaMessage || "Brak migracji TraderBota." });
      if (symbol) void loadCandles(symbol, timeframe, explicitToken);
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }

  async function loadCandles(symbol: string, nextTimeframe = timeframe, explicitToken?: string) {
    try {
      const result = await api<{ candles: Candle[] }>(`/api/trader/candles?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(nextTimeframe)}`, {}, explicitToken);
      setCandles(result.candles || []);
    } catch (error) {
      setNotice({ tone: "warning", message: errorMessage(error) });
    }
  }

  useEffect(() => {
    if (!session || !selectedSymbol) return undefined;
    void loadCandles(selectedSymbol, timeframe);
    const timer = window.setInterval(() => {
      void loadCandles(selectedSymbol, timeframe);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [session, selectedSymbol, timeframe]);

  async function runAction(action: () => Promise<void>, success: string) {
    setBusy(true);
    try {
      await action();
      await load();
      setNotice({ tone: "success", message: success });
    } catch (error) {
      setNotice({ tone: "danger", message: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await supabase?.auth.signOut();
    setSession(null);
  }

  if (!bootstrapped) {
    return <main className="login-page"><Panel className="login-panel"><EmptyState>Ładowanie TraderBota...</EmptyState></Panel></main>;
  }

  if (!configReady || !session) {
    return (
      <main className="login-page">
        <Panel className="login-panel">
          <div className="login-copy">
            <h1>FluxBase TraderBot</h1>
            <p>TraderBot korzysta z tej samej sesji administratora co SalesBot.</p>
          </div>
          {!configReady ? <Notice tone="danger">Brakuje publicznej konfiguracji Supabase.</Notice> : <Notice tone="info">Zaloguj się w panelu administratora, a następnie wróć do TraderBota.</Notice>}
          <Link className="button primary login-submit" href="/admin">Przejdź do panelu administratora</Link>
          <Link className="button ghost login-submit" href="/">Wróć na stronę główną</Link>
        </Panel>
      </main>
    );
  }

  const selectedSignal = overview.signals.find((signal) => signal.symbol === selectedSymbol) || overview.signals[0] || null;

  return (
    <DashboardShell
      className="trader-shell"
      sidebar={
        <TraderSidebar
          activeId={tab}
          onSelect={setTab}
          email={session.user.email}
          emergencyActive={overview.settings.emergency_stop_active}
          onEmergencyStop={() => void runAction(
            () => api("/api/trader/emergency-stop", { method: "POST" }),
            "Trading został zatrzymany awaryjnie.",
          )}
        />
      }
    >
      <ScreenHeader
        title={traderCopy.pl.title}
        subtitle={traderCopy.pl.subtitle}
        action={
          <div className="header-actions">
            <button className="button" type="button" onClick={() => void load()} disabled={loading}>
              {loading ? "Odświeżam..." : "Odśwież"}
            </button>
          </div>
        }
      />
      {notice ? <Notice tone={notice.tone}>{notice.message}</Notice> : null}
      <RiskStatus overview={overview} />

      {tab === "market" ? (
        <MarketAnalysisView
          signals={overview.signals}
          candles={candles}
          selectedSymbol={selectedSignal?.symbol || selectedSymbol}
          timeframe={timeframe}
          busy={busy}
          onScan={() => void runAction(
            () => api("/api/trader/signals", { method: "POST" }),
            "Skan rynku został zakończony.",
          )}
          onSelectSymbol={(symbol) => setSelectedSymbol(symbol)}
          onTimeframeChange={(nextTimeframe) => {
            setTimeframe(nextTimeframe);
            if (selectedSymbol) void loadCandles(selectedSymbol, nextTimeframe);
          }}
        />
      ) : null}

      {tab === "paper" ? (
        <PaperTradingView
          overview={overview}
          busy={busy}
          onStart={() => void runAction(
            () => api("/api/trader/paper/start", { method: "POST" }),
            "Paper trading został włączony.",
          )}
          onStop={() => void runAction(
            () => api("/api/trader/paper/stop", { method: "POST" }),
            "Paper trading został wyłączony.",
          )}
        />
      ) : null}

      {tab === "live" ? (
        <LiveTradingView
          overview={overview}
          busy={busy}
          onStartApproval={() => void runAction(
            () => api("/api/trader/live/start", { method: "POST", body: JSON.stringify({ mode: "approval_required" }) }),
            "Live trading z akceptacją został włączony.",
          )}
          onStartAutomatic={() => void runAction(
            () => api("/api/trader/live/start", { method: "POST", body: JSON.stringify({ mode: "automatic" }) }),
            "Live trading automatyczny został włączony.",
          )}
          onStop={() => void runAction(
            () => api("/api/trader/live/stop", { method: "POST" }),
            "Live trading został wyłączony.",
          )}
        />
      ) : null}

      {tab === "approvals" ? (
        <ApprovalQueueView
          approvals={overview.approvals}
          busy={busy}
          onApprove={(id) => void runAction(
            () => api(`/api/trader/approvals/${id}/approve`, { method: "POST", body: JSON.stringify({}) }),
            "Propozycja została zatwierdzona po ponownej kontroli ryzyka.",
          )}
          onReject={(id) => void runAction(
            () => api(`/api/trader/approvals/${id}/reject`, { method: "POST" }),
            "Propozycja została odrzucona.",
          )}
        />
      ) : null}

      {tab === "history" ? <HistoryView orders={overview.orders} trades={overview.trades} /> : null}

      {tab === "settings" ? (
        <TraderSettingsView
          draft={settingsDraft}
          busy={busy}
          onChange={(patch) => setSettingsDraft((current) => ({ ...current, ...patch }))}
          onSave={() => void runAction(
            () => api("/api/trader/paper/settings", { method: "POST", body: JSON.stringify(settingsDraft) }),
            "Ustawienia ryzyka zostały zapisane.",
          )}
        />
      ) : null}

      {tab === "exchange" ? (
        <ExchangeConnectionView
          connection={overview.exchangeConnection}
          draft={exchangeDraft}
          busy={busy}
          onChange={(patch) => setExchangeDraft((current) => ({ ...current, ...patch }))}
          onSave={() => void runAction(
            () => api("/api/trader/exchange/connect", { method: "POST", body: JSON.stringify(exchangeDraft) }),
            "Połączenie z giełdą zostało zapisane.",
          )}
          onTest={() => void runAction(
            () => api("/api/trader/exchange/test", { method: "POST" }),
            "Test połączenia z giełdą zakończony powodzeniem.",
          )}
        />
      ) : null}

      <SessionGuard timeoutMinutes={30} warningMinutes={2} onLogout={logout} panelLabel="panelu TraderBota" />
    </DashboardShell>
  );
}
