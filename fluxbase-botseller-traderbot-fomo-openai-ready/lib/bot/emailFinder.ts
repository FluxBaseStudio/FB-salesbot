import "server-only";

import { isValidRecipientEmail, normalizeEmailCandidate } from "@/lib/bot/emailValidation";
import { extractEmails, fetchText, normalizeUrl, stripHtml, unique } from "@/lib/bot/utils";

const contactPaths = ["", "/kontakt", "/contact", "/o-nas", "/firma", "/oferta", "/polityka-prywatnosci"];

function resolvePath(baseUrl: string, path: string) {
  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return null;
  }
}

function isDeliverableBusinessEmail(email: string) {
  const lower = email.toLowerCase();
  const local = lower.split("@")[0] || "";
  if (!lower.includes("@")) return false;
  if (/^(no-?reply|noreply|donotreply|do-not-reply|mailer-daemon|postmaster|abuse|privacy|rodo|dpo|iod|newsletter|marketing-newsletter|unsubscribe)\b/i.test(local)) return false;
  if (/\.(png|jpg|jpeg|webp|gif|svg|pdf)$/i.test(lower)) return false;
  return true;
}

function bestEmail(emails: string[]) {
  const usable = emails.map(normalizeEmailCandidate).filter(isDeliverableBusinessEmail);
  const preferred = usable.find((email) => /^(kontakt|biuro|office|info|recepcja|sprzedaz|sales|hello)@/i.test(email));
  return preferred || usable[0] || null;
}

export type EmailFinderResult = {
  email: string | null;
  source: "website" | "google_search" | "none";
  checkedUrls: string[];
};

export async function findEmailOnWebsite(website: string | null | undefined): Promise<EmailFinderResult> {
  const base = normalizeUrl(website);
  if (!base) return { email: null, source: "none", checkedUrls: [] };

  const checkedUrls: string[] = [];
  const found: string[] = [];

  for (const path of contactPaths) {
    const url = resolvePath(base, path);
    if (!url || checkedUrls.includes(url)) continue;
    checkedUrls.push(url);
    const html = await fetchText(url);
    if (!html) continue;
    found.push(...extractEmails(html));
    const text = stripHtml(html);
    found.push(...extractEmails(text));
    if (found.length) return { email: bestEmail(unique(found)), source: "website", checkedUrls };
  }

  return { email: null, source: "none", checkedUrls };
}

export async function findEmailWithGoogleSearch(args: {
  apiKey: string | null;
  cx: string | null;
  companyName: string;
  website?: string | null;
  city?: string | null;
}): Promise<EmailFinderResult> {
  if (!args.apiKey || !args.cx) return { email: null, source: "none", checkedUrls: [] };

  const website = normalizeUrl(args.website || null);
  const domain = website ? new URL(website).hostname.replace(/^www\./, "") : "";
  const queries = [
    domain ? `site:${domain} kontakt email` : "",
    domain ? `site:${domain} biuro kontakt` : "",
    `"${args.companyName}" kontakt email ${args.city || ""}`,
    `"${args.companyName}" biuro ${args.city || ""}`,
  ].filter(Boolean);

  const checkedUrls: string[] = [];
  const emails: string[] = [];

  for (const q of queries) {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", args.apiKey);
    url.searchParams.set("cx", args.cx);
    url.searchParams.set("q", q);
    url.searchParams.set("num", "5");

    const response = await fetch(url.toString());
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) continue;

    for (const item of payload?.items || []) {
      const snippet = `${item?.title || ""} ${item?.snippet || ""}`;
      emails.push(...extractEmails(snippet));
      const link = typeof item?.link === "string" ? item.link : null;
      if (!link || checkedUrls.includes(link)) continue;
      checkedUrls.push(link);
      const html = await fetchText(link, 6500);
      if (html) emails.push(...extractEmails(html), ...extractEmails(stripHtml(html)));
      if (emails.length) return { email: bestEmail(unique(emails)), source: "google_search", checkedUrls };
    }
  }

  return { email: null, source: "none", checkedUrls };
}

export async function findBusinessEmail(args: {
  companyName: string;
  website?: string | null;
  city?: string | null;
  googleSearchApiKey?: string | null;
  googleSearchCx?: string | null;
}) {
  const websiteResult = await findEmailOnWebsite(args.website);
  if (websiteResult.email) return websiteResult;

  const googleResult = await findEmailWithGoogleSearch({
    apiKey: args.googleSearchApiKey || null,
    cx: args.googleSearchCx || null,
    companyName: args.companyName,
    website: args.website,
    city: args.city,
  });

  return googleResult.email
    ? googleResult
    : { email: null, source: "none" as const, checkedUrls: [...websiteResult.checkedUrls, ...googleResult.checkedUrls] };
}
