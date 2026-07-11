import "server-only";

import { resolveMx, resolveTxt } from "node:dns/promises";

export type DnsCheckStatus = "ok" | "warning" | "missing";
export type DnsCheckItem = {
  key: "mx" | "spf" | "dmarc" | "dkim";
  label: string;
  status: DnsCheckStatus;
  message: string;
  records: string[];
};

function cleanDomain(value: string | null | undefined) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const withoutProtocol = raw.replace(/^https?:\/\//, "").replace(/^mailto:/, "");
  const emailDomain = withoutProtocol.includes("@") ? withoutProtocol.split("@").pop() || "" : withoutProtocol;
  return emailDomain.split(/[/?#]/)[0].replace(/^www\./, "").replace(/[^a-z0-9.-]/g, "");
}

function cleanSelector(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\._domainkey\..*$/i, "")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");
}

async function safeTxt(domain: string) {
  try {
    return (await resolveTxt(domain)).map((parts) => parts.join(""));
  } catch {
    return [] as string[];
  }
}

async function safeMx(domain: string) {
  try {
    return (await resolveMx(domain)).map((record) => `${record.exchange} (${record.priority})`);
  } catch {
    return [] as string[];
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export async function checkDomainDeliverability(input: { smtpUser?: string | null; website?: string | null; domain?: string | null; dkimSelector?: string | null; dkimSelectors?: string[] | null }) {
  const domain = cleanDomain(input.domain) || cleanDomain(input.smtpUser) || cleanDomain(input.website);
  if (!domain) throw new Error("Nie udało się ustalić domeny do sprawdzenia DNS.");

  const selectors = unique([
    cleanSelector(input.dkimSelector),
    ...(input.dkimSelectors || []).map(cleanSelector),
    "google",
    "default",
    "selector1",
    "selector2",
    "k1",
    "dkim",
  ]);

  const [mx, rootTxt, dmarcTxt, ...dkimTxtBySelector] = await Promise.all([
    safeMx(domain),
    safeTxt(domain),
    safeTxt(`_dmarc.${domain}`),
    ...selectors.map((selector) => safeTxt(`${selector}._domainkey.${domain}`)),
  ]);

  const spf = rootTxt.filter((record) => /^v=spf1\b/i.test(record));
  const dmarc = dmarcTxt.filter((record) => /^v=dmarc1\b/i.test(record));
  const dkimRecords: string[] = [];
  dkimTxtBySelector.forEach((records, index) => {
    const matching = records.filter((record) => /v=dkim1|p=/i.test(record));
    matching.forEach((record) => dkimRecords.push(`${selectors[index]}: ${record}`));
  });

  const customSelector = cleanSelector(input.dkimSelector);
  const customSelectorWasChecked = Boolean(customSelector);
  const customSelectorFound = customSelectorWasChecked && dkimRecords.some((record) => record.startsWith(`${customSelector}:`));

  const checks: DnsCheckItem[] = [
    {
      key: "mx",
      label: "MX",
      status: mx.length ? "ok" : "missing",
      message: mx.length ? "Domena ma rekordy MX, poczta może odbierać odpowiedzi." : "Brak rekordów MX. Skrzynka może nie odbierać odpowiedzi.",
      records: mx,
    },
    {
      key: "spf",
      label: "SPF",
      status: spf.length ? "ok" : "missing",
      message: spf.length ? "Znaleziono rekord SPF." : "Brak SPF. Dodaj SPF, aby poprawić dostarczalność.",
      records: spf,
    },
    {
      key: "dmarc",
      label: "DMARC",
      status: dmarc.length ? "ok" : "warning",
      message: dmarc.length ? "Znaleziono rekord DMARC." : "Brak DMARC. Warto dodać chociaż p=none na start.",
      records: dmarc,
    },
    {
      key: "dkim",
      label: "DKIM",
      status: dkimRecords.length ? "ok" : "warning",
      message: dkimRecords.length
        ? customSelectorWasChecked
          ? customSelectorFound
            ? `Znaleziono DKIM dla własnego selectora „${customSelector}”.`
            : `Znaleziono DKIM, ale nie dla własnego selectora „${customSelector}”. Sprawdź selector w panelu poczty.`
          : "Znaleziono prawdopodobny rekord DKIM."
        : customSelectorWasChecked
          ? `Nie znaleziono DKIM dla selectora „${customSelector}” ani popularnych selectorów.`
          : "Nie znaleziono popularnych selectorów DKIM. Wpisz własny selector DKIM, jeśli dostawca poczty używa niestandardowego.",
      records: dkimRecords,
    },
  ];

  return { domain, checkedAt: new Date().toISOString(), dkimSelectorsChecked: selectors, checks };
}
