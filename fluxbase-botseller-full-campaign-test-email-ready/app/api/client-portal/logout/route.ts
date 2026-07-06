import { NextResponse } from "next/server";
import { CLIENT_PORTAL_COOKIE } from "@/lib/clientPortalAuth";

export async function POST() {
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(CLIENT_PORTAL_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
