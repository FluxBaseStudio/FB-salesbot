import { NextResponse } from "next/server";

import { createAdminNotification } from "@/lib/adminNotifications";
import { verifyAdmin } from "@/lib/adminAuth";
import { generateLeadWithAi } from "@/lib/bot/aiLead";
import { findBusinessEmail } from "@/lib/bot/emailFinder";
import { searchGooglePlaces, type PlaceLead } from "@/lib/bot/googlePlaces";
import { buildLeadEmailHtml, buildLeadEmailText, buildSenderPersona } from "@/lib/bot/mailer";
import { getSendCapacity, requiredCampaignNumber, requiredCampaignTimeZone } from "@/lib/bot/sendSafety";
import { auditWebsite } from "@/lib/bot/websiteAudit";
import { getBotSecrets } from "@/lib/secretStore";
import { adminDb } from "@/lib/supabaseAdmin";
import type { Campaign, ClientAccount } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

type CampaignWithClient = Campaign & { client_accounts: ClientAccount | null };

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers });
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function firstText(values: string[] | null | undefined) {
  const first = Array.isArray(values) ? values.find((item) => item && item.trim()) : null;
  return first?.trim() || "";
}

function pickSearchIndustry(campaign: Campaign) {
  const value = (
    campaign.exact_target_business_type ||
    campaign.target_audience_niche ||
    campaign.search_keywords ||
    firstText(campaign.target_industries)
  ).toString().split("\n")[0].split(",")[0].trim();
  if (!value) throw new Error("Realny test leada wymaga targetu: uzupełnij dokładny typ firmy, niszę, słowa kluczowe albo branże targetu w kampanii.");
  return value;
}

function pickSearchLocation(campaign: Campaign) {
  const value = firstText(campaign.target_locations);
  if (!value) throw new Error("Realny test leada wymaga lokalizacji targetu w kampanii.");
  return value;
}

function leadPayload(place: PlaceLead, email: string | null, generated: Awaited<ReturnType<typeof generateLeadWithAi>>, emailSource: string) {
  return {
    company_name: place.companyName,
    industry: place.industry,
    city: place.city,
    phone: place.phone,
    website: place.website,
    email,
    google_maps_url: place.googleMapsUrl,
    source: "campaign_live_test",
    score: generated.score,
    main_problem: generated.mainProblem,
    ai_summary: generated.aiSummary,
    email_source: emailSource,
  };
}

function validateMinimumScheduler(campaign: Campaign) {
  const timeZone = requiredCampaignTimeZone(campaign);
  const startHour = Math.round(requiredCampaignNumber(campaign.workday_start_hour, "Godzina startu pracy bota"));
  const endHour = Math.round(requiredCampaignNumber(campaign.workday_end_hour, "Godzina końca pracy bota"));
  const dailyLimit = Math.round(requiredCampaignNumber(campaign.daily_limit, "Docelowa liczba maili dziennie"));
  if (startHour < 0 || startHour > 23) throw new Error("Godzina startu musi być w zakresie 0-23.");
  if (endHour <= startHour || endHour > 24) throw new Error("Godzina końca musi być późniejsza niż start i maksymalnie 24.");
  if (dailyLimit < 1) throw new Error("Limit dzienny musi być większy od 0.");
  return { timeZone, startHour, endHour, dailyLimit };
}

export async function POST(request: Request) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  try {
    const body = await request.json().catch(() => ({}));
    const campaignId = typeof body?.campaignId === "string" ? body.campaignId : typeof body?.campaign_id === "string" ? body.campaign_id : null;
    if (!campaignId) return jsonError("Podaj campaignId.", 400);

    const { data: campaign, error } = await adminDb()
      .from("campaigns")
      .select("*, client_accounts(*)")
      .eq("id", campaignId)
      .single<CampaignWithClient>();
    if (error) throw error;
    if (!campaign?.client_accounts) return jsonError("Kampania nie ma przypisanego klienta.", 404);

    const scheduler = validateMinimumScheduler(campaign);
    const capacity = await getSendCapacity(campaign.client_accounts, campaign);
    const secrets = await getBotSecrets();
    if (!secrets.googlePlaces) return jsonError("Brakuje Google Places API key. Nie mogę wykonać realnego testu leada.", 400);

    const industry = pickSearchIndustry(campaign);
    const location = pickSearchLocation(campaign);
    const places = await searchGooglePlaces({ apiKey: secrets.googlePlaces, industry, location, limit: 5, languageCode: "pl" });
    const attempts: Array<Record<string, unknown>> = [];

    for (const place of places) {
      const emailResult = await findBusinessEmail({
        companyName: place.companyName,
        website: place.website,
        city: place.city,
        googleSearchApiKey: secrets.googleSearch,
        googleSearchCx: secrets.googleSearchCx,
      });
      attempts.push({ companyName: place.companyName, website: place.website, city: place.city, email: emailResult.email, emailSource: emailResult.source, checkedUrls: emailResult.checkedUrls });
      if (!emailResult.email) continue;

      const audit = await auditWebsite(place.website);
      const generated = await generateLeadWithAi({
        apiKey: secrets.openai,
        client: campaign.client_accounts,
        campaign,
        place,
        email: emailResult.email,
        audit,
      });
      const persona = buildSenderPersona(campaign.client_accounts, campaign, campaign.client_accounts.smtp_user || "");
      const payload = leadPayload(place, emailResult.email, generated, emailResult.source);

      await adminDb().from("run_logs").insert({
        client_id: campaign.client_id,
        campaign_id: campaign.id,
        level: "info",
        stage: "campaign_live_test",
        message: `Realny test kampanii znalazł leada ${place.companyName}, ale nic nie wysłał i nie dodał do kolejki.`,
        metadata: { industry, location, score: generated.score, emailSource: emailResult.source },
      });

      return NextResponse.json({
        ok: true,
        mode: "live_lead_test_no_send_no_queue",
        warning: "Ten test używa Google Places, email finder i OpenAI, ale nie wysyła maila oraz nie zapisuje send_queue.",
        campaign: { id: campaign.id, name: campaign.name },
        scheduler,
        capacity,
        search: { industry, location, placesChecked: attempts.length },
        lead: payload,
        audit,
        generated: {
          subject: generated.subject,
          body: generated.body,
          text: buildLeadEmailText({ body: generated.body, persona, client: campaign.client_accounts, to: emailResult.email, campaign }),
          html: buildLeadEmailHtml({ body: generated.body, persona, client: campaign.client_accounts, to: emailResult.email, campaign }),
        },
        attempts,
      }, { headers });
    }

    await createAdminNotification({
      tone: "warning",
      title: "Test kampanii nie znalazł maila",
      message: `Realny test kampanii ${campaign.name} sprawdził ${places.length} firm dla zapytania „${industry} ${location}”, ale nie znalazł używalnego adresu email.`,
      resource: "campaigns",
      resourceId: campaign.id,
      dedupeKey: `campaign-live-test:no-email:${campaign.id}`,
    });

    return NextResponse.json({
      ok: false,
      mode: "live_lead_test_no_send_no_queue",
      campaign: { id: campaign.id, name: campaign.name },
      scheduler,
      capacity,
      search: { industry, location, placesFound: places.length, placesChecked: attempts.length },
      attempts,
      recommendation: places.length ? "Google znalazł firmy, ale email finder nie znalazł adresu. Doprecyzuj target lub sprawdź Google Search API/CX." : "Google Places nie zwróciło firm. Zmień branżę/lokalizację lub sprawdź Google Places API.",
    }, { headers });
  } catch (error) {
    return jsonError(errorMessage(error, "Nie udało się wykonać realnego testu leada."), 500);
  }
}
