import "server-only";

const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

export function toList(value: string[] | null | undefined) {
  return (value || []).map((item) => item.trim()).filter(Boolean);
}

export function normalizeUrl(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (!parsed.hostname.includes(".")) return null;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function extractEmails(text: string) {
  const raw = text.match(emailRegex) || [];
  return unique(
    raw
      .map((email) => email.toLowerCase().replace(/^mailto:/, ""))
      .filter((email) => !email.includes("example.") && !email.endsWith("@sentry.io")),
  );
}

export async function fetchText(url: string, timeoutMs = 8500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "FluxBaseBotSeller/1.0 (+https://fluxbase.pl)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function domainKey(url: string | null | undefined) {
  const normalized = normalizeUrl(url);
  if (!normalized) return null;
  try {
    return new URL(normalized).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}
