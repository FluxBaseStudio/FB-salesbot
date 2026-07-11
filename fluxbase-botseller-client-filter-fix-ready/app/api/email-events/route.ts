import crypto from "crypto";
import { NextResponse } from "next/server";

import { applyMessageStatus } from "@/lib/bot/messageWorkflow";
import { adminDb } from "@/lib/supabaseAdmin";
import type { MessageStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedEvents: Record<string, MessageStatus> = {
  delivered: "delivered",
  processed: "delivered",
  open: "opened",
  opened: "opened",
  click: "opened",
  reply: "replied",
  replied: "replied",
  bounce: "bounced",
  bounced: "bounced",
  hard_bounce: "bounced",
  soft_bounce: "bounced",
  spam: "spam",
  complaint: "spam",
  spamreport: "spam",
  failed: "failed",
  dropped: "failed",
  reject: "failed",
  unsubscribe: "unsubscribed",
  unsubscribed: "unsubscribed",
};

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function hmacHex(secret: string, value: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function timingSafeEqualString(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function detectProvider(request: Request, body: unknown) {
  const url = new URL(request.url);
  const explicit = text(url.searchParams.get("provider"));
  if (explicit) return explicit.toLowerCase();
  if (Array.isArray(body) && body.some((item: any) => item?.sg_event_id || item?.sg_message_id)) return "sendgrid";
  if ((body as any)?.signature && (body as any)?.["event-data"]) return "mailgun";
  if ((body as any)?.RecordType || (body as any)?.MessageID) return "postmark";
  return "generic";
}

function authorized(request: Request, provider: string, rawBody: string, parsedBody: any) {
  const genericSecret = process.env.EMAIL_EVENTS_SECRET || process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") || "";
  const genericHeader = request.headers.get("x-email-events-secret") || "";
  if (genericSecret && (auth === `Bearer ${genericSecret}` || genericHeader === genericSecret)) return true;

  if (provider === "postmark") {
    const token = process.env.POSTMARK_WEBHOOK_TOKEN;
    const header = request.headers.get("x-postmark-webhook-token") || request.headers.get("x-email-events-token") || "";
    return Boolean(token && header === token);
  }

  if (provider === "mailgun") {
    const secret = process.env.MAILGUN_WEBHOOK_SIGNING_KEY || process.env.MAILGUN_API_KEY;
    const signature = parsedBody?.signature;
    const timestamp = text(signature?.timestamp);
    const token = text(signature?.token);
    const sig = text(signature?.signature);
    if (!secret || !timestamp || !token || !sig) return false;
    return timingSafeEqualString(hmacHex(secret, `${timestamp}${token}`), sig);
  }

  if (provider === "sendgrid") {
    // Pełna weryfikacja ECDSA SendGrid wymaga public key. Na MVP dopuszczamy dedykowany secret nagłówkowy.
    const secret = process.env.SENDGRID_WEBHOOK_SECRET;
    const header = request.headers.get("x-sendgrid-webhook-secret") || request.headers.get("x-email-events-secret") || "";
    return Boolean(secret && header === secret);
  }

  return false;
}

function eventType(item: any) {
  return text(item?.event || item?.status || item?.type || item?.RecordType || item?.event_type || item?.["event-data"]?.event).toLowerCase();
}

function providerMessageId(item: any) {
  return text(
    item?.providerMessageId ||
      item?.provider_message_id ||
      item?.sg_message_id ||
      item?.MessageID ||
      item?.message_id ||
      item?.MessageId ||
      item?.["event-data"]?.message?.headers?.["message-id"] ||
      item?.["event-data"]?.id,
  );
}

function recipient(item: any) {
  return text(item?.email || item?.recipient || item?.Recipient || item?.to || item?.["event-data"]?.recipient).toLowerCase();
}

function trackingIdFrom(item: any) {
  return text(
    item?.trackingId ||
      item?.tracking_id ||
      item?.custom_args?.tracking_id ||
      item?.custom_args?.trackingId ||
      item?.metadata?.tracking_id ||
      item?.metadata?.trackingId ||
      item?.headers?.["X-FluxBase-Tracking-ID"] ||
      item?.["event-data"]?.message?.headers?.["X-FluxBase-Tracking-ID"] ||
      item?.["o:tag"] ||
      item?.tag,
  );
}

function normalizeEvents(body: any) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.events)) return body.events;
  if (Array.isArray(body?.Items)) return body.Items;
  if (body?.["event-data"]) return [body["event-data"]];
  return [body];
}

async function findMessageId(args: { trackingId: string; providerMessageId: string; recipient: string }) {
  const db = adminDb();
  if (args.trackingId) {
    const { data, error } = await db.from("messages").select("id").eq("tracking_id", args.trackingId).maybeSingle();
    if (error) throw error;
    if (data?.id) return data.id as string;
  }
  if (args.providerMessageId) {
    const { data: byProvider, error: byProviderError } = await db
      .from("messages")
      .select("id")
      .eq("provider_message_id", args.providerMessageId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byProviderError) throw byProviderError;
    if (byProvider?.id) return byProvider.id as string;

    const { data: bySmtp, error: bySmtpError } = await db
      .from("messages")
      .select("id")
      .eq("smtp_message_id", args.providerMessageId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (bySmtpError) throw bySmtpError;
    if (bySmtp?.id) return bySmtp.id as string;

    const { data, error } = await db.from("email_events").select("message_id").eq("provider_message_id", args.providerMessageId).not("message_id", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    if (data?.message_id) return data.message_id as string;
  }
  if (args.recipient) {
    const { data, error } = await db.from("messages").select("id").eq("email_to", args.recipient).not("sent_at", "is", null).order("sent_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    if (data?.id) return data.id as string;
  }
  return null;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(rawBody || "{}");
  } catch {
    return jsonError("Niepoprawny JSON webhooka email-events.", 400);
  }
  const provider = detectProvider(request, body);
  if (!authorized(request, provider, rawBody, body)) return jsonError("Brak dostępu do webhooka email-events albo niepoprawny podpis providera.", 401);

  const events = normalizeEvents(body);
  const results: Array<{ ok: boolean; trackingId?: string; status?: string; provider?: string; error?: string }> = [];

  for (const item of events) {
    const rawEvent = eventType(item);
    const status = allowedEvents[rawEvent];
    const trackingId = trackingIdFrom(item);
    const providerId = providerMessageId(item);
    const to = recipient(item);

    try {
      const messageId = await findMessageId({ trackingId, providerMessageId: providerId, recipient: to });
      await adminDb().from("email_events").insert({
        message_id: messageId,
        tracking_id: trackingId || null,
        provider,
        provider_message_id: providerId || null,
        event_type: rawEvent || "unknown",
        recipient: to || null,
        payload: item || null,
      });

      if (!status) {
        results.push({ ok: false, trackingId, provider, error: `Nieobsługiwany event: ${rawEvent || "brak"}.` });
        continue;
      }
      if (!messageId) {
        results.push({ ok: false, trackingId, status, provider, error: "Nie znaleziono wiadomości po trackingId/providerMessageId/recipient." });
        continue;
      }

      await applyMessageStatus(messageId, status);
      results.push({ ok: true, trackingId, status, provider });
    } catch (error) {
      results.push({ ok: false, trackingId, status, provider, error: error instanceof Error ? error.message : "Błąd aktualizacji statusu." });
    }
  }

  return NextResponse.json({ ok: true, provider, results }, { headers: { "Cache-Control": "no-store" } });
}
