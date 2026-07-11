import "server-only";

import crypto from "crypto";

import { adminDb } from "@/lib/supabaseAdmin";

function iso(date: Date) {
  return date.toISOString();
}

export async function acquireSystemLock(name: string, ttlMinutes = 55) {
  const db = adminDb();
  const lockId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await db.from("system_locks").delete().eq("name", name).lte("expires_at", iso(now));

  const { error } = await db.from("system_locks").insert({
    name,
    locked_by: lockId,
    locked_at: iso(now),
    expires_at: iso(expiresAt),
  });

  if (!error) return lockId;

  // 23505 = duplicate key, czyli inny proces już trzyma blokadę.
  if ((error as { code?: string }).code === "23505") return null;
  throw error;
}

export async function releaseSystemLock(name: string, lockId: string | null) {
  if (!lockId) return;
  const { error } = await adminDb().from("system_locks").delete().eq("name", name).eq("locked_by", lockId);
  if (error) console.error("system lock release failed", error.message);
}
