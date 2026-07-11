import { NextResponse } from "next/server";

import { CLIENT_PORTAL_COOKIE, CLIENT_PORTAL_TTL_SECONDS, createPortalToken, verifyPortalPassword } from "@/lib/clientPortalAuth";
import { checkRateLimit, requestIp, resetRateLimit } from "@/lib/rateLimit";
import { adminDb } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password) return jsonError("Podaj login i hasło.", 400);

    const ip = requestIp(request);
    const ipLimit = checkRateLimit(`portal-login:ip:${ip}`, 20, 15 * 60_000);
    const emailLimit = checkRateLimit(`portal-login:email:${email}`, 8, 15 * 60_000);
    if (!ipLimit.ok || !emailLimit.ok) {
      return jsonError("Zbyt wiele prób logowania. Spróbuj ponownie za kilka minut.", 429);
    }

    const { data: client, error } = await adminDb()
      .from("client_accounts")
      .select("id, company_name, portal_email, portal_password_hash, portal_password_salt, subscription_status")
      .eq("portal_email", email)
      .single();

    if (error || !client?.portal_password_hash || !client?.portal_password_salt) {
      return jsonError("Nieprawidłowe dane logowania.", 401);
    }

    if (!verifyPortalPassword(password, client.portal_password_salt, client.portal_password_hash)) {
      return jsonError("Nieprawidłowe dane logowania.", 401);
    }

    resetRateLimit(`portal-login:email:${email}`);
    const token = createPortalToken(client.id, email);
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(CLIENT_PORTAL_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CLIENT_PORTAL_TTL_SECONDS,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Błąd logowania klienta.";
    return jsonError(message, 500);
  }
}
