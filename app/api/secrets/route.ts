import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/adminAuth";
import { encryptSecret } from "@/lib/cryptoSecrets";
import { adminDb } from "@/lib/supabaseAdmin";
import { validateSecretPayload } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders });
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function GET(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  try {
    const { data, error } = await adminDb()
      .from("api_credentials")
      .select("id,provider,label,value_last4,is_active,created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ items: data || [] }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Błąd odczytu sekretów."), 500);
  }
}

export async function POST(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  try {
    const validation = validateSecretPayload(await request.json());
    if (!validation.ok) return jsonError(validation.errors.join(" "), 400);

    const { provider, label, secret } = validation.data;
    const encrypted = encryptSecret(secret);
    const { error } = await adminDb().from("api_credentials").insert({
      provider,
      label,
      ...encrypted,
      is_active: true,
      created_by: auth.user.id,
    });

    if (error) throw error;
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Błąd zapisu sekretu."), 500);
  }
}
