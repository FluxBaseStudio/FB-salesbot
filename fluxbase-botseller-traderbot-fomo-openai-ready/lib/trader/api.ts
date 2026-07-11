import "server-only";

import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/adminAuth";

export const traderNoStoreHeaders = { "Cache-Control": "no-store" };

export function traderJsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: traderNoStoreHeaders });
}

export function traderErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function requireTraderAdmin(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return { ok: false as const, response: traderJsonError(auth.error, auth.status) };
  return { ok: true as const, actor: { id: auth.user.id, email: auth.user.email || null } };
}

const MAX_TRADER_BODY_BYTES = 96 * 1024;

export async function readTraderBody(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_TRADER_BODY_BYTES)
    throw new Error("Dane żądania TraderBota są zbyt duże.");
  const raw = await request.text();
  if (!raw) return {} as Record<string, unknown>;
  if (Buffer.byteLength(raw, "utf8") > MAX_TRADER_BODY_BYTES)
    throw new Error("Dane żądania TraderBota są zbyt duże.");
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object")
    throw new Error("TraderBot wymaga obiektu JSON.");
  return parsed as Record<string, unknown>;
}

export function traderCronAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get("authorization") || "";
  const secret = request.headers.get("x-cron-secret") || "";
  return auth === `Bearer ${expected}` || secret === expected;
}
