import "server-only";

import type { Campaign, ClientAccount } from "@/lib/types";
import type { WebsiteAudit } from "@/lib/bot/websiteAudit";
import type { PlaceLead } from "@/lib/bot/googlePlaces";
import { languageForCampaignLocation } from "@/lib/locationOptions";

export type GeneratedLeadResult = {
  score: number;
  mainProblem: string;
  aiSummary: string;
  subject: string;
  body: string;
};

function clampScore(value: unknown) {
  const score = Number(value);
  if (Number.isNaN(score)) return 5;
  return Math.max(0, Math.min(10, Math.round(score)));
}

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function clean(value: string | null | undefined) {
  return value?.trim() || "";
}

function sampleStyleBlock(sample: string | null | undefined) {
  const cleaned = clean(sample);
  if (!cleaned) return "Brak przykładowego maila. Zastosuj ton kampanii i pisz naturalnie.";
  const clipped = cleaned.slice(0, 4500);
  return [
    "Kampania zawiera przykładowy mail lub kilka przykładowych maili. To jest najważniejszy wzorzec stylu wiadomości.",
    "Masz odwzorować: długość, poziom formalności, typ powitania, tempo zdań, układ akapitów, sposób przedstawienia oferty i sposób przejścia do CTA.",
    "Nie kopiuj 1:1 całych zdań z przykładu. Użyj wzorca stylu, ale treść dopasuj do znalezionego leada, oferty klienta i zasad kampanii.",
    "Jeżeli przykład zawiera podpis, stopkę, telefon, email, stronę lub dane nadawcy, potraktuj je wyłącznie jako informację stylistyczną. Nie wpisuj ich do body, bo mailer doda aktualne dane z kampanii automatycznie.",
    "Przykładowe maile / wzorzec stylu:",
    clipped,
  ].join("\n");
}

function personaText(client: ClientAccount, campaign: Campaign) {
  const firstName = clean(campaign.bot_first_name) || clean(client.bot_first_name);
  const lastName = clean(campaign.bot_last_name) || clean(client.bot_last_name);
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || clean(client.sender_name) || clean(client.contact_name);
  return [
    `- Imię i nazwisko bota: ${fullName || "brak"}`,
    `- Rola bota: ${clean(campaign.bot_role) || clean(client.bot_role)}`,
    `- Firma w podpisie: ${clean(campaign.signature_company) || clean(client.signature_company) || client.company_name}`,
    `- Strona w podpisie: ${clean(campaign.signature_website) || clean(client.signature_website) || clean(client.website)}`,
    `- Email w podpisie / reply-to: ${clean(campaign.signature_email) || clean(client.signature_email) || clean(client.smtp_reply_to) || clean(client.sender_email) || clean(client.contact_email)}`,
    `- Telefon w podpisie: ${clean(campaign.signature_phone) || clean(client.signature_phone) || clean(client.phone)}`,
    `- Adres w podpisie: ${clean(campaign.signature_address) || clean(client.signature_address)}`,
    `- Notatka stopki: ${clean(campaign.signature_footer_note) || clean(client.signature_footer_note)}`,
  ].join("\n");
}

function fallbackLead(args: { client: ClientAccount; campaign: Campaign; place: PlaceLead; email: string | null; audit: WebsiteAudit }): GeneratedLeadResult {
  const hasEmail = Boolean(args.email);
  const hasWebsite = Boolean(args.place.website);
  // Fallback AI nie powinien przechodzić do wysyłki. Jeśli OpenAI padnie, lead trafia do logów jako low_score/ai_failed, a panel pozostaje czysty.
  const score = hasEmail ? 2 : 0;
  const language = languageForCampaignLocation(args.campaign.location_scope, args.campaign.target_locations, args.place.city);
  const problem = hasWebsite ? args.audit.problems[0] || (language === "pl" ? "Do sprawdzenia strony" : "Website review needed") : (language === "pl" ? "Brak strony w danych" : "No website in source data");
  const service = args.campaign.promoted_service || args.campaign.offer_description || (language === "pl" ? "naszej oferty" : "our service");
  const body = language === "pl"
    ? `Dzień dobry,\n\ntrafiłem na Państwa firmę i chciałem krótko zapytać, czy temat współpracy w zakresie ${service} byłby dla Państwa aktualny.\n\nReprezentuję ${args.client.company_name}. Jeśli to dobry moment, mogę podesłać krótką propozycję dopasowaną do Państwa działalności.`
    : `Hello,\n\nI came across your company and wanted to briefly ask whether cooperation around ${service} could be relevant for you.\n\nI represent ${args.client.company_name}. If this is worth exploring, I can send a short proposal adjusted to your business.`;
  return {
    score,
    mainProblem: problem,
    aiSummary: `AI nie zwróciło pełnej odpowiedzi dla kampanii „${args.campaign.name}”. Score celowo ustawiono nisko, aby nie wysłać słabego maila automatycznie. Język wiadomości: ${language === "pl" ? "polski" : "angielski"}.`,
    subject: language === "pl" ? `Krótka propozycja współpracy` : `A short cooperation idea`,
    body,
  };
}

function extractOutputText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text.trim();
  const parts: string[] = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

function removeAccidentalFooter(body: string, client: ClientAccount, campaign: Campaign) {
  const senderNames = [
    clean(campaign.bot_first_name),
    clean(campaign.bot_last_name),
    clean(client.bot_first_name),
    clean(client.bot_last_name),
    clean(client.sender_name),
    clean(client.contact_name),
    clean(campaign.signature_company),
    clean(client.signature_company),
    clean(client.company_name),
  ].filter(Boolean);

  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const cutIndex = lines.findIndex((line, index) => {
    const trimmed = line.trim().toLowerCase();
    if (trimmed === "--" || trimmed === "---") return true;
    if (/^(pozdrawiam|z poważaniem|best regards|kind regards|regards),?$/i.test(line.trim())) {
      const next = lines.slice(index + 1, index + 5).join(" ").toLowerCase();
      return senderNames.some((name) => next.includes(name.toLowerCase()));
    }
    return false;
  });

  const cleaned = cutIndex >= 0 ? lines.slice(0, cutIndex).join("\n").trim() : body.trim();
  return cleaned || body.trim();
}

export async function generateLeadWithAi(args: {
  apiKey: string | null;
  model?: string | null;
  client: ClientAccount;
  campaign: Campaign;
  place: PlaceLead;
  email: string | null;
  audit: WebsiteAudit;
}): Promise<GeneratedLeadResult> {
  if (!args.apiKey) return fallbackLead(args);

  const messageLanguage = languageForCampaignLocation(args.campaign.location_scope, args.campaign.target_locations, args.place.city);
  const languageInstruction = messageLanguage === "pl"
    ? "Pisz po polsku. Wszystkie wiadomości dla Polski mają być w języku polskim."
    : "Write in English. For leads outside Poland, all emails must be in English, even if the campaign/client data is written in Polish.";

  const prompt = `
Jesteś AI Sales Managerem. Przygotowujesz lead dla klienta abonamentowego FluxBase BotSeller.

Klient, dla którego szukamy leadów:
- Firma: ${args.client.company_name}
- Kontakt: ${args.client.contact_name || ""}
- Strona klienta: ${args.client.website || ""}

Kampania:
- Nazwa: ${args.campaign.name}
- Szukane branże: ${(args.campaign.target_industries || []).join(", ")}
- Lokalizacje: ${(args.campaign.target_locations || []).join(", ") || "Cała Polska"}
- Wymagany język wiadomości: ${messageLanguage === "pl" ? "polski" : "angielski"}
- Oferta klienta: ${args.campaign.offer_description || ""}
- Czym zajmuje się klient: ${args.campaign.client_business_description || ""}
- Promowana usługa: ${args.campaign.promoted_service || ""}
- Dlaczego ktoś miałby skorzystać: ${args.campaign.value_proposition || ""}
- Docelowa grupa odbiorców / nisza: ${args.campaign.target_audience_niche || ""}
- Osoba decyzyjna po stronie leada: ${args.campaign.decision_maker_roles || ""}
- Model biznesu targetu: ${args.campaign.target_business_model || ""}
- Etap rozwoju targetu: ${args.campaign.target_company_stage || ""}
- Segment cenowy/budżet targetu: ${args.campaign.target_price_segment || ""}
- Konkretny typ firm: ${args.campaign.exact_target_business_type || ""}
- Czym te firmy się zajmują: ${args.campaign.target_business_activities || ""}
- Preferowana wielkość firmy: ${args.campaign.target_company_size || ""}
- Słowa kluczowe do wyszukiwania: ${args.campaign.search_keywords || ""}
- Słowa wykluczające: ${args.campaign.negative_keywords || ""}
- Sygnały wymagane: ${args.campaign.must_have_signals || ""}
- Sygnały online wymagane przy sprawdzaniu: ${args.campaign.required_online_signals || ""}
- Zasady kwalifikacji leada: ${args.campaign.lead_qualification_rules || ""}
- Firmy wykluczone: ${args.campaign.excluded_company_types || ""}
- Zasady dyskwalifikacji leada: ${args.campaign.lead_disqualification_rules || ""}
- Idealny profil leada: ${args.campaign.preferred_lead_profile || ""}
- Najlepszy target: ${args.campaign.target_customer_description || ""}
- Problemy targetu: ${args.campaign.customer_pain_points || ""}
- Czego unikać w mailach: ${args.campaign.avoid_in_messages || ""}
- Preferowany CTA: ${args.campaign.call_to_action || ""}
- Ton: ${args.campaign.tone || "spokojny, konkretny, profesjonalny"}
- Przykładowy mail / styl komunikacji klienta:
${sampleStyleBlock(args.campaign.sample_email_style)}

Persona nadawcy i podpis, który doda mailer:
${personaText(args.client, args.campaign)}

Znaleziony lead:
- Firma: ${args.place.companyName}
- Branża: ${args.place.industry || ""}
- Miasto: ${args.place.city || ""}
- Telefon: ${args.place.phone || ""}
- Email: ${args.email || "brak"}
- Strona: ${args.place.website || "brak"}
- Google Maps: ${args.place.googleMapsUrl || ""}

Audyt automatyczny strony:
- Problemy: ${args.audit.problems.join(" | ")}
- Sygnały: ${args.audit.signals.join(" | ")}
- Próbka treści: ${args.audit.textSample.slice(0, 900)}

Zadanie:
1. Oceń jakość leada od 0 do 10 dla tej kampanii. Najważniejsze kryterium to pole „Szukane branże / Jakich firm szukamy?” oraz „Konkretny typ firm”.
2. NIE MYL klienta z targetem. „Czym zajmuje się klient”, „Oferta klienta” i „Promowana usługa” opisują NADAWCĘ oraz produkt, a nie firmy, których bot ma szukać.
3. Jeśli klient sprzedaje np. odzież sportową, strony www, druk, marketing, logistykę itd., to producent/sklep/agencja z tej samej branży NIE jest automatycznie dobrym leadem. Dobry lead musi pasować do pola „Jakich firm szukamy?”.
4. Jeśli lead jest dostawcą/producentem/sprzedawcą podobnego produktu zamiast potencjalnym kupującym, daj score 0-2.
5. Jeśli lead jest za szeroki, z innej branży, wygląda jak sieciówka/franczyza albo łamie zasady dyskwalifikacji, daj score 0-3.
6. Wskaż główny powód kontaktu.
7. Napisz krótką analizę dla admina.
8. Napisz krótki temat i wiadomość e-mail dla znalezionej firmy.

Zasady wiadomości:
- ${languageInstruction}
- Nie kłam. Nie obiecuj wyników.
- Nie naginaj targetu tylko po to, aby wysłać mail. Jeśli firma nie pasuje do zawężonej grupy odbiorców, oceń ją nisko.
- Nie pisz, że firma na pewno ma problem, jeżeli audyt jest niepewny.
- Wiadomość ma reprezentować klienta, nie FluxBase.
- Bot wysyła tylko pierwszą wiadomość. Nie sugeruj, że AI będzie dalej odpisywać.
- Odpowiedzi odbiera i obsługuje człowiek po stronie klienta.
- Jeśli kampania podała CTA, użyj go jako głównej akcji.
- Jeśli kampania ma przykładowego maila, ma on pierwszeństwo przed ogólną instrukcją tonu. Zachowaj podobną długość, strukturę akapitów, formalność, rytm, typ powitania i sposób domknięcia rozmowy.
- Przykładowy mail jest stylem, nie szablonem do kopiowania. Nie kopiuj całych zdań 1:1 i nie przenoś danych kontaktowych z przykładu.
- Nie powtarzaj pełnej stopki ani danych podpisu w treści. Mailer zawsze doda aktualny podpis i stopkę z danych wpisanych w kampanii.
- Zwróć tylko temat i główną treść wiadomości, bez finalnej stopki prawnej, bez listy danych kontaktowych i bez podpisu typu „Pozdrawiam, Jan Kowalski”.
- Nie zaczynaj każdej wiadomości identycznie. Dobierz naturalne otwarcie do leada, ale bez sztucznej poufałości.
- Wiadomość ma być krótka, konkretna i B2B. Unikaj tonu newslettera, obietnic i przesadnej sprzedaży.
- Nie tłumacz nazw firm, imion, domen ani nazw własnych. Dostosuj tylko język wiadomości.
- Jeśli kampania podała rzeczy do unikania, zastosuj je bez wyjątków.
- AI jest wywoływane dopiero po znalezieniu e-maila. Nie twórz tekstu dla leadów bez adresu.
- Bez agresywnej sprzedaży.

Zwróć wyłącznie JSON.
`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${args.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: args.model || process.env.OPENAI_MODEL || "gpt-5.5",
      input: [{ role: "user", content: prompt }],
      max_output_tokens: 1200,
      text: {
        format: {
          type: "json_schema",
          name: "botseller_lead",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              score: { type: "number", minimum: 0, maximum: 10 },
              mainProblem: { type: "string" },
              aiSummary: { type: "string" },
              subject: { type: "string" },
              body: { type: "string" },
            },
            required: ["score", "mainProblem", "aiSummary", "subject", "body"],
          },
        },
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return fallbackLead(args);

  try {
    const raw = JSON.parse(extractOutputText(payload));
    return {
      score: clampScore(raw.score),
      mainProblem: text(raw.mainProblem, "Do sprawdzenia"),
      aiSummary: text(raw.aiSummary, "Brak analizy."),
      subject: text(raw.subject, "Krótka propozycja współpracy"),
      body: removeAccidentalFooter(text(raw.body, fallbackLead(args).body), args.client, args.campaign),
    };
  } catch {
    return fallbackLead(args);
  }
}
