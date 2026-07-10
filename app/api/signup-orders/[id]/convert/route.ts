import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/adminAuth";
import { convertSignupOrder } from "@/lib/signupOrder";
import { validateRecordId } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: noStoreHeaders });
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const params = await context.params;
  const idValidation = validateRecordId(params.id);
  if (!idValidation.ok) return jsonError(idValidation.errors.join(" "), 400);

  try {
    const result = await convertSignupOrder(idValidation.data, auth.user.email);
    return NextResponse.json({ ok: true, ...result }, { headers: noStoreHeaders });
  } catch (error) {
    return jsonError(errorMessage(error, "Nie udało się aktywować zamówienia."), 500);
  }
}
