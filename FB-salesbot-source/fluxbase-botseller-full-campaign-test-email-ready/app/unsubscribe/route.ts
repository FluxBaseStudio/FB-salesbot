import { NextResponse } from "next/server";

import { addGlobalSuppression } from "@/lib/bot/suppression";
import { adminDb } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clean(value: string | null) {
  return typeof value === "string" ? value.trim().slice(0, 300) : "";
}

function html(title: string, message: string, ok: boolean) {
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title><style>body{margin:0;font-family:Inter,Arial,sans-serif;background:#0b0f19;color:#f8fafc;display:grid;min-height:100vh;place-items:center}main{width:min(760px,calc(100% - 32px));background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:28px;padding:36px;box-shadow:0 30px 100px rgba(0,0,0,.35)}p{color:#cbd5e1;line-height:1.7}.badge{display:inline-flex;margin-top:20px;padding:10px 14px;border-radius:999px;background:${ok ? "rgba(34,197,94,.16)" : "rgba(248,113,113,.16)"};color:${ok ? "#86efac" : "#fecaca"}}a{color:#93c5fd}</style></head><body><main><small>FluxBase BotSeller</small><h1>${title}</h1><p>${message}</p><div class="badge">${ok ? "Status: do-not-contact" : "Status: wymaga ręcznej obsługi"}</div><p><a href="/">Wróć na stronę główną</a></p></main></body></html>`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = clean(url.searchParams.get("email")).toLowerCase();
  const clientId = clean(url.searchParams.get("client"));
  const domain = clean(url.searchParams.get("domain")).replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase();
  const companyName = clean(url.searchParams.get("company"));

  let title = "Wypisanie z kontaktu";
  let message = "Ten link jest niepełny. Odpisz na wiadomość słowem STOP albo skontaktuj się z nadawcą.";
  let ok = false;

  if ((email && emailPattern.test(email)) || domain || companyName) {
    try {
      await addGlobalSuppression({
        email: email && emailPattern.test(email) ? email : null,
        domain: domain || null,
        companyName: companyName || null,
        reason: uuidPattern.test(clientId)
          ? `Publiczny link rezygnacji z maila BotSeller. Źródłowy klient: ${clientId}.`
          : "Publiczny link rezygnacji z maila BotSeller.",
      });

      if (email && emailPattern.test(email)) {
        await adminDb()
          .from("messages")
          .update({ status: "unsubscribed", follow_up_due_at: null, last_error: "Odbiorca kliknął link rezygnacji." })
          .eq("email_to", email);
      }

      title = "Zapisano rezygnację";
      message = "Ten adres lub firma zostały dodane do globalnej listy blokady. Nie powinny otrzymywać kolejnych wiadomości z żadnej kampanii BotSeller.";
      ok = true;
    } catch {
      title = "Nie udało się zapisać rezygnacji";
      message = "Spróbuj odpisać na wiadomość słowem STOP. System zapisze ręczną blokadę w panelu.";
    }
  }

  return new NextResponse(html(title, message, ok), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
