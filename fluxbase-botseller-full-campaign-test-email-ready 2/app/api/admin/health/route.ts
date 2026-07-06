import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/adminAuth";
import { getGlobalLimitSnapshot } from "@/lib/bot/globalLimits";
import { adminDb } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders });
}

function envStatus(name: string) {
  const value = process.env[name];
  return { name, ok: Boolean(value && value.trim()), last4: value ? value.slice(-4) : null };
}

function numericEnv(name: string) {
  const raw = process.env[name];
  const value = raw ? Number(raw) : null;
  return { name, configured: Boolean(raw), value: Number.isFinite(value) ? value : null };
}

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function startOfNextUtcDay(date = new Date()) {
  const next = startOfUtcDay(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

async function safeCount(table: string, filters?: (query: any) => any) {
  let query = adminDb().from(table).select("id", { count: "exact", head: true });
  if (filters) query = filters(query);
  const { count, error } = await query;
  return { ok: !error, count: count || 0, error: error?.message || null };
}

export async function GET(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const requiredEnv = [
    "CRON_SECRET",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SECRET_ENCRYPTION_KEY",
    "OPENAI_API_KEY",
    "GOOGLE_PLACES_API_KEY",
  ].map(envStatus);

  const optionalEnv = ["OPENAI_MODEL", "GOOGLE_SEARCH_API_KEY", "GOOGLE_SEARCH_CX", "GOOGLE_SEARCH_ENGINE_ID", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "NEXT_PUBLIC_BASE_URL", "EMAIL_PROVIDER", "POSTMARK_SERVER_TOKEN", "MAILGUN_API_KEY", "SENDGRID_API_KEY", "AMAZON_SES_REGION", "RESEND_API_KEY"].map(envStatus);
  const effectiveGoogleSearchCx = Boolean((process.env.GOOGLE_SEARCH_CX || process.env.GOOGLE_SEARCH_ENGINE_ID || "").trim());
  const globalLimits = ["APP_MAX_ACTIVE_CAMPAIGNS", "APP_MAX_DAILY_EMAILS", "APP_MAX_MONTHLY_EMAILS", "APP_MAX_FAILED_QUEUE", "APP_MAX_PENDING_QUEUE"].map(numericEnv);

  const [campaigns, activeCampaigns, invalidActiveCampaigns, pendingQueue, failedQueue, locks, sentToday, recentLogs, globalSnapshot] = await Promise.all([
    safeCount("campaigns"),
    safeCount("campaigns", (q) => q.eq("status", "active")),
    safeCount("campaigns", (q) => q.eq("status", "active").or("daily_limit.is.null,workday_start_hour.is.null,workday_end_hour.is.null,sending_timezone.is.null,bot_id.is.null")),
    safeCount("send_queue", (q) => q.eq("status", "pending")),
    safeCount("send_queue", (q) => q.eq("status", "failed")),
    safeCount("system_locks"),
    adminDb()
      .from("messages")
      .select("id", { count: "exact", head: true })
      .gte("sent_at", startOfUtcDay().toISOString())
      .lt("sent_at", startOfNextUtcDay().toISOString())
      .in("status", ["sent", "delivered", "opened", "replied", "follow_up_sent"]),
    adminDb()
      .from("run_logs")
      .select("id,level,stage,message,created_at,campaign_id")
      .order("created_at", { ascending: false })
      .limit(10),
    getGlobalLimitSnapshot().catch((error) => ({ ok: false, error: error instanceof Error ? error.message : "Nie udało się pobrać globalnych limitów." })),
  ]);

  const requiredEnvOk = requiredEnv.every((item) => item.ok);
  const dbOk = campaigns.ok && activeCampaigns.ok && pendingQueue.ok && failedQueue.ok;
  const configOk = invalidActiveCampaigns.ok && invalidActiveCampaigns.count === 0;
  const activeLimit = globalLimits.find((item) => item.name === "APP_MAX_ACTIVE_CAMPAIGNS")?.value;
  const dailyLimit = globalLimits.find((item) => item.name === "APP_MAX_DAILY_EMAILS")?.value;
  const failedLimit = globalLimits.find((item) => item.name === "APP_MAX_FAILED_QUEUE")?.value;
  const pendingLimit = globalLimits.find((item) => item.name === "APP_MAX_PENDING_QUEUE")?.value;
  const globalOk = (!activeLimit || activeCampaigns.count <= activeLimit) && (!dailyLimit || (sentToday.count || 0) < dailyLimit) && (!failedLimit || failedQueue.count <= failedLimit) && (!pendingLimit || pendingQueue.count <= pendingLimit);

  return NextResponse.json(
    {
      ok: requiredEnvOk && dbOk && configOk && globalOk,
      generatedAt: new Date().toISOString(),
      checks: {
        requiredEnv,
        optionalEnv,
        globalLimits: { ok: globalOk, configured: globalLimits, sentToday: sentToday.count || 0, snapshot: globalSnapshot },
        googleSearch: { ok: Boolean(process.env.GOOGLE_SEARCH_API_KEY && effectiveGoogleSearchCx), hasApiKey: Boolean(process.env.GOOGLE_SEARCH_API_KEY), hasCx: effectiveGoogleSearchCx, note: "Google Search jest opcjonalny, ale zwiększa skuteczność email findera. CX może być ustawione jako GOOGLE_SEARCH_CX albo GOOGLE_SEARCH_ENGINE_ID." },
        database: { ok: dbOk, campaigns, activeCampaigns },
        schedulerConfig: {
          ok: configOk,
          invalidActiveCampaigns: invalidActiveCampaigns.count,
          note: configOk ? "Aktywne kampanie mają wymagane pola schedulera." : "Są aktywne kampanie bez daily_limit, godzin pracy, timezone albo bota.",
        },
        sendQueue: { pending: pendingQueue.count, failed: failedQueue.count },
        locks: { activeOrStored: locks.count },
      },
      recentLogs: recentLogs.error ? { ok: false, error: recentLogs.error.message } : { ok: true, items: recentLogs.data || [] },
    },
    { headers: noStoreHeaders },
  );
}
