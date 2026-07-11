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

export async function readTraderBody(request: Request) {
  return (await request.json().catch(() => ({}))) as Record<string, unknown>;
}

export function traderCronAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get("authorization") || "";
  const secret = request.headers.get("x-cron-secret") || "";
  return auth === `Bearer ${expected}` || secret === expected;
}
