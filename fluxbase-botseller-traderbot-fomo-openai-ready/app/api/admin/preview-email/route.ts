import { NextResponse } from "next/server";

import { verifyAdmin } from "@/lib/adminAuth";
import { generateLeadWithAi } from "@/lib/bot/aiLead";
import { buildLeadEmailHtml, buildLeadEmailText, buildSenderPersona } from "@/lib/bot/mailer";
import { getActiveSecret } from "@/lib/secretStore";
import { adminDb } from "@/lib/supabaseAdmin";
import { CLIENT_SAFE_SELECT, type Campaign, type ClientAccount } from "@/lib/types";
import { validateCampaignPayload } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  try {
    const body = await request.json().catch(() => ({}));
    const validation = validateCampaignPayload(body?.campaign || body || {});
    if (!validation.ok) return jsonError(`Nie mogę wygenerować podglądu: ${validation.errors.join(" ")}`, 400);

    const { data: client, error } = await adminDb()
      .from("client_accounts")
      .select(CLIENT_SAFE_SELECT)
      .eq("id", validation.data.client_id)
      .single();
    if (error) throw error;
    if (!client) return jsonError("Nie znaleziono klienta.", 404);

    const now = new Date().toISOString();
    const campaign = {
      id: "preview",
      created_at: now,
      last_run_at: null,
      next_run_at: null,
      locked_at: null,
      locked_by: null,
      ...validation.data,
    } as unknown as Campaign;

    const target = campaign.target_audience_niche || campaign.exact_target_business_type || campaign.target_industries?.[0] || "firma B2B";
    const place = {
      companyName: body?.lead?.companyName || body?.lead?.company_name || "Przykładowa Firma",
      industry: body?.lead?.industry || target,
      city: body?.lead?.city || campaign.target_locations?.[0] || "Warszawa",
      phone: body?.lead?.phone || null,
      website: body?.lead?.website || "https://przykladowafirma.pl",
      googleMapsUrl: body?.lead?.googleMapsUrl || null,
      address: body?.lead?.address || null,
      primaryType: body?.lead?.primaryType || null,
      types: Array.isArray(body?.lead?.types) ? body.lead.types : [],
    };
    const email = body?.lead?.email || "kontakt@przykladowafirma.pl";
    const audit = {
      hasWebsite: true,
      checkedUrl: place.website,
      signals: ["Strona zawiera sekcję oferty", "Wykryto dane kontaktowe", "Firma wygląda jak dopasowany target"],
      problems: ["Wiadomość testowa, audyt przykładowy"],
      textSample: `Przykładowa strona firmy z branży: ${target}.`,
    };

    const apiKey = await getActiveSecret("openai");
    const generated = await generateLeadWithAi({ apiKey, client: client as unknown as ClientAccount, campaign, place, email, audit });
    const persona = buildSenderPersona(client as unknown as ClientAccount, campaign, (client as unknown as ClientAccount).smtp_user || "");

    return NextResponse.json(
      {
        ok: true,
        score: generated.score,
        mainProblem: generated.mainProblem,
        aiSummary: generated.aiSummary,
        subject: generated.subject,
        body: generated.body,
        text: buildLeadEmailText({ body: generated.body, persona, client: client as unknown as ClientAccount, to: email, campaign }),
        html: buildLeadEmailHtml({ body: generated.body, persona, client: client as unknown as ClientAccount, to: email, campaign }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return jsonError(errorMessage(error, "Nie udało się wygenerować podglądu AI."), 500);
  }
}
