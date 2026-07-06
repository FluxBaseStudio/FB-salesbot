import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/adminAuth";
import { adminDb } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };
const SENT_STATUSES = ["sent", "delivered", "opened", "replied", "follow_up_sent"];

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders });
}

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function isoDaysAgo(days: number) {
  const date = startOfDay(new Date());
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

function asNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function relationName(value: unknown, key: string) {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  return typeof record[key] === "string" ? record[key] : null;
}

function groupBy<T>(items: T[], keyFn: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, [...(map.get(key) || []), item]);
  }
  return map;
}

function summarizeMessages(messages: any[]) {
  const sent = messages.filter((message) => message.sent_at || SENT_STATUSES.includes(message.status)).length;
  const opened = messages.filter((message) => message.opened_at || ["opened", "replied"].includes(message.status)).length;
  const replied = messages.filter((message) => message.replied_at || message.status === "replied").length;
  const bounced = messages.filter((message) => message.bounced_at || message.status === "bounced").length;
  const spam = messages.filter((message) => message.spam_at || message.status === "spam").length;
  return {
    sent,
    opened,
    replied,
    bounced,
    spam,
    openRate: sent ? Math.round((opened / sent) * 1000) / 10 : 0,
    replyRate: sent ? Math.round((replied / sent) * 1000) / 10 : 0,
    bounceRate: sent ? Math.round((bounced / sent) * 1000) / 10 : 0,
  };
}

export async function GET(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const url = new URL(request.url);
  const days = Math.min(Math.max(asNumber(url.searchParams.get("days") || 7), 1), 90);
  const fromIso = isoDaysAgo(days - 1);
  const db = adminDb();

  const [messages, leads, campaigns, clients] = await Promise.all([
    db.from("messages").select("id,client_id,campaign_id,status,sent_at,created_at,opened_at,replied_at,bounced_at,spam_at,sequence_step,client_accounts(company_name),campaigns(name),leads(company_name,city,industry)").gte("created_at", fromIso).limit(5000),
    db.from("leads").select("id,client_id,campaign_id,status,score,city,industry,created_at,client_accounts(company_name),campaigns(name)").gte("created_at", fromIso).limit(5000),
    db.from("campaigns").select("id,name,status,daily_limit,next_run_at,client_id,client_accounts(company_name)").limit(1000),
    db.from("client_accounts").select("id,company_name,subscription_status,plan_name,created_at").limit(1000),
  ]);

  const firstError = messages.error || leads.error || campaigns.error || clients.error;
  if (firstError) return jsonError(firstError.message, 500);

  const messageRows = messages.data || [];
  const leadRows = leads.data || [];
  const campaignRows = campaigns.data || [];
  const clientRows = clients.data || [];
  const summary = summarizeMessages(messageRows);
  const leadsTotal = leadRows.length;
  const avgScore = leadsTotal ? Math.round((leadRows.reduce((sum, lead) => sum + asNumber(lead.score), 0) / leadsTotal) * 10) / 10 : 0;

  const byClient = Array.from(groupBy(messageRows, (item: any) => item.client_id || "unknown").entries()).map(([clientId, rows]) => {
    const client = clientRows.find((item: any) => item.id === clientId);
    const clientLeads = leadRows.filter((lead: any) => lead.client_id === clientId);
    return {
      clientId,
      name: client?.company_name || relationName(rows[0]?.client_accounts, "company_name") || "Nieznany klient",
      leads: clientLeads.length,
      ...summarizeMessages(rows),
    };
  }).sort((a, b) => b.sent - a.sent).slice(0, 20);

  const byCampaign = Array.from(groupBy(messageRows, (item: any) => item.campaign_id || "unknown").entries()).map(([campaignId, rows]) => {
    const campaign = campaignRows.find((item: any) => item.id === campaignId);
    const campaignLeads = leadRows.filter((lead: any) => lead.campaign_id === campaignId);
    return {
      campaignId,
      name: campaign?.name || relationName(rows[0]?.campaigns, "name") || "Nieznana kampania",
      client: relationName(campaign?.client_accounts, "company_name") || relationName(rows[0]?.client_accounts, "company_name") || null,
      leads: campaignLeads.length,
      ...summarizeMessages(rows),
    };
  }).sort((a, b) => b.sent - a.sent).slice(0, 20);

  const byIndustry = Array.from(groupBy(leadRows, (item: any) => item.industry || "Nieznana branża").entries()).map(([industry, rows]) => ({
    industry,
    leads: rows.length,
    avgScore: rows.length ? Math.round((rows.reduce((sum: number, lead: any) => sum + asNumber(lead.score), 0) / rows.length) * 10) / 10 : 0,
  })).sort((a, b) => b.leads - a.leads).slice(0, 12);

  const byLocation = Array.from(groupBy(leadRows, (item: any) => item.city || "Nieznana lokalizacja").entries()).map(([city, rows]) => ({ city, leads: rows.length })).sort((a, b) => b.leads - a.leads).slice(0, 12);

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    periodDays: days,
    summary: {
      clients: clientRows.length,
      activeCampaigns: campaignRows.filter((campaign: any) => campaign.status === "active").length,
      leads: leadsTotal,
      avgLeadScore: avgScore,
      ...summary,
    },
    byClient,
    byCampaign,
    bestIndustries: byIndustry,
    bestLocations: byLocation,
    recommendation: summary.sent === 0 ? "Brak wysyłek w tym okresie. Sprawdź crony, konfigurację kampanii i kolejkę." : summary.replyRate < 1 ? "Warto sprawdzić target, CTA i pierwsze zdania maili. Niski reply rate może oznaczać zbyt szeroki target." : "System ma odpowiedzi. Analizuj branże i lokalizacje z najlepszą skutecznością.",
  }, { headers: noStoreHeaders });
}
