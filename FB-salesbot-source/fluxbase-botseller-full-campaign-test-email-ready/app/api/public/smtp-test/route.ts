import crypto from "crypto";
import { NextResponse } from "next/server";

import { verifySmtpConnection } from "@/lib/bot/smtpTest";
import { adminDb } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value || "unknown").digest("hex");
}

function requestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

async function auditAttempt(args: { ipHash: string; emailHash: string; ok: boolean; error?: string | null }) {
  await adminDb().from("audit_logs").insert({
    actor_email: "public",
    action: "public_smtp_test",
    resource: "smtp_test",
    resource_id: null,
    details: {
      ip_hash: args.ipHash,
      email_hash: args.emailHash,
      ok: args.ok,
      error: args.error || null,
    },
  });
}

async function enforceRateLimit(args: { ipHash: string; emailHash: string }) {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data, error } = await adminDb()
    .from("audit_logs")
    .select("details,created_at")
    .eq("action", "public_smtp_test")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  const rows = data || [];
  const byIp = rows.filter((row) => (row.details as any)?.ip_hash === args.ipHash).length;
  const byEmail = rows.filter((row) => (row.details as any)?.email_hash === args.emailHash).length;
  if (byIp >= 5 || byEmail >= 3) {
    throw new Error("Za dużo prób testu SMTP. Odczekaj około 15 minut i spróbuj ponownie.");
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const smtpUser = text(body?.smtp_user).toLowerCase();
  const ipHash = hash(requestIp(request));
  const emailHash = hash(smtpUser || "empty-email");

  try {
    await enforceRateLimit({ ipHash, emailHash });
    const result = await verifySmtpConnection({
      host: body?.smtp_host,
      port: body?.smtp_port,
      secure: body?.smtp_secure,
      user: body?.smtp_user,
      pass: body?.smtp_pass,
      from: body?.smtp_from,
    });
    await auditAttempt({ ipHash, emailHash, ok: Boolean(result.ok), error: result.ok ? null : "SMTP test failed" });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nie udało się sprawdzić SMTP.";
    await auditAttempt({ ipHash, emailHash, ok: false, error: message }).catch(() => null);
    return jsonError(message, 429);
  }
}
