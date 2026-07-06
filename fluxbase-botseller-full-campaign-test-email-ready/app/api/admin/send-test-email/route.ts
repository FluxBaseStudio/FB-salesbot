import { NextResponse } from "next/server";

import { attachmentToMailerPayload } from "@/lib/attachmentStorage";
import { verifyAdmin } from "@/lib/adminAuth";
import { generateLeadWithAi } from "@/lib/bot/aiLead";
import { sendLeadEmail } from "@/lib/bot/mailer";
import { getActiveSecret } from "@/lib/secretStore";
import { adminDb } from "@/lib/supabaseAdmin";
import type { Campaign, ClientAccount } from "@/lib/types";
import { validateCampaignPayload } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type CampaignAttachmentForMail = {
  file_name: string;
  mime_type?: string | null;
  file_data_base64: string;
};

function jsonError(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status, headers: noStoreHeaders });
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function firstText(values: string[] | null | undefined) {
  const first = Array.isArray(values) ? values.find((item) => item && item.trim()) : null;
  return first?.trim() || "";
}

function sampleLeadForCampaign(campaign: Campaign) {
  const target = campaign.target_audience_niche || campaign.exact_target_business_type || campaign.search_keywords || firstText(campaign.target_industries) || "firma B2B";
  const city = firstText(campaign.target_locations) || "Warszawa";

  return {
    place: {
      companyName: "Przykładowa Firma Testowa",
      industry: target,
      city,
      phone: "+48 000 000 000",
      website: "https://przykladowafirmatestowa.pl",
      googleMapsUrl: null,
      address: city,
      primaryType: target,
      types: [target],
    },
    email: "kontakt@przykladowafirmatestowa.pl",
    audit: {
      hasWebsite: true,
      checkedUrl: "https://przykladowafirmatestowa.pl",
      signals: [
        "Firma pasuje do targetu kampanii.",
        "Na stronie widać ofertę oraz dane kontaktowe.",
        "To przykładowy lead użyty wyłącznie do wysłania testu wyglądu wiadomości.",
      ],
      problems: [
        "Wiadomość testowa nie trafia do prawdziwego leada.",
        "Dane firmy są przykładowe, ale treść, HTML, podpis i stopka są składane tak jak w realnej wysyłce.",
      ],
      textSample: `Przykładowy opis strony firmy z branży: ${target}. Lokalizacja: ${city}.`,
    },
  };
}

async function loadActiveCampaignAttachments(campaignId: string | null) {
  if (!campaignId) return [] as CampaignAttachmentForMail[];
  const { data, error } = await adminDb()
    .from("campaign_attachments")
    .select("file_name,mime_type,file_data_base64,storage_bucket,storage_path")
    .eq("campaign_id", campaignId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const converted = await Promise.all((data || []).map((attachment: any) => attachmentToMailerPayload(attachment)));
  return converted.filter((attachment: CampaignAttachmentForMail) => attachment.file_data_base64);
}

export async function POST(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  try {
    const body = await request.json().catch(() => ({}));
    const to = text(body?.to).toLowerCase();
    if (!emailPattern.test(to)) return jsonError("Podaj poprawny adres email, na który ma dotrzeć test.", 400);

    const validation = validateCampaignPayload(body?.campaign || {});
    if (!validation.ok) return jsonError(`Nie mogę wysłać testu: ${validation.errors.join(" ")}`, 400);

    const { data: client, error } = await adminDb()
      .from("client_accounts")
      .select("*")
      .eq("id", validation.data.client_id)
      .single();
    if (error) throw error;
    if (!client) return jsonError("Nie znaleziono klienta kampanii.", 404);

    const now = new Date().toISOString();
    const campaign = {
      id: text(body?.campaignId) || "campaign-test-email",
      created_at: now,
      last_run_at: null,
      next_run_at: null,
      locked_at: null,
      locked_by: null,
      ...validation.data,
    } as unknown as Campaign;

    const { place, email, audit } = sampleLeadForCampaign(campaign);
    const apiKey = await getActiveSecret("openai");
    if (!apiKey) return jsonError("Brakuje OPENAI_API_KEY albo aktywnego sekretu OpenAI. Test pełnej wiadomości wymaga wygenerowania treści AI tak jak normalna kampania.", 400);

    const generated = await generateLeadWithAi({
      apiKey,
      client: client as ClientAccount,
      campaign,
      place,
      email,
      audit,
    });

    const campaignIdForAttachments = campaign.id === "campaign-test-email" ? null : campaign.id;
    const attachments = await loadActiveCampaignAttachments(campaignIdForAttachments);
    const result = await sendLeadEmail({
      client: client as ClientAccount,
      to,
      subject: generated.subject || `Test kampanii: ${campaign.name}`,
      body: generated.body,
      campaign,
      attachments,
    });

    await adminDb().from("audit_logs").insert({
      actor_email: auth.user.email || "admin",
      action: "send_campaign_full_preview_email",
      resource: "campaigns",
      resource_id: campaign.id === "campaign-test-email" ? null : campaign.id,
      details: {
        to,
        client_id: validation.data.client_id,
        campaign_name: campaign.name,
        subject: generated.subject,
        sample_lead: place.companyName,
        attachments_count: attachments.length,
        message_id: result.messageId,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        mode: "full_campaign_email_preview",
        messageId: result.messageId,
        response: result.response,
        subject: generated.subject,
        sampleLead: place.companyName,
        attachmentsCount: attachments.length,
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return jsonError(errorMessage(error, "Nie udało się wysłać pełnego testowego maila kampanii."), 500);
  }
}
