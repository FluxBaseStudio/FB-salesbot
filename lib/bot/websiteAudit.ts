import "server-only";

import { fetchText, normalizeUrl, stripHtml } from "@/lib/bot/utils";

export type WebsiteAudit = {
  hasWebsite: boolean;
  checkedUrl: string | null;
  signals: string[];
  problems: string[];
  textSample: string;
};

export async function auditWebsite(website: string | null | undefined): Promise<WebsiteAudit> {
  const url = normalizeUrl(website);
  if (!url) {
    return {
      hasWebsite: false,
      checkedUrl: null,
      signals: [],
      problems: ["Brak strony internetowej w danych Google Places."],
      textSample: "",
    };
  }

  const html = await fetchText(url);
  if (!html) {
    return {
      hasWebsite: true,
      checkedUrl: url,
      signals: [],
      problems: ["Strona istnieje w danych, ale nie udało się jej odczytać automatycznie."],
      textSample: "",
    };
  }

  const text = stripHtml(html);
  const lower = html.toLowerCase();
  const plain = text.toLowerCase();
  const signals: string[] = [];
  const problems: string[] = [];

  if (/<meta[^>]+name=["']viewport["']/i.test(html)) signals.push("Strona ma meta viewport pod urządzenia mobilne.");
  else problems.push("Nie wykryto podstawowego meta viewport dla mobile.");

  if (/<form[\s>]/i.test(html) || plain.includes("formularz")) signals.push("Wykryto formularz lub sekcję kontaktową.");
  else problems.push("Nie wykryto formularza kontaktowego na stronie głównej.");

  if (/oferta|usługi|uslugi|cennik|realizacje|portfolio|galeria/i.test(text)) signals.push("Strona zawiera elementy oferty lub realizacji.");
  else problems.push("Na stronie głównej trudno automatycznie znaleźć ofertę, realizacje lub cennik.");

  if (/rezerw|umów|umow|book|calendar/i.test(text)) signals.push("Wykryto wzmianki o rezerwacji/umawianiu.");

  if (text.length < 700) problems.push("Strona ma mało treści na stronie głównej.");
  if (lower.includes("wordpress")) signals.push("Strona prawdopodobnie działa na WordPressie.");

  return {
    hasWebsite: true,
    checkedUrl: url,
    signals,
    problems: problems.length ? problems : ["Brak dużych problemów wykrytych automatycznie. Warto ocenić UX ręcznie."],
    textSample: text.slice(0, 1800),
  };
}
