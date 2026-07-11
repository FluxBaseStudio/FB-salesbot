import "server-only";

import nodemailer from "nodemailer";

import { decryptSecret } from "@/lib/cryptoSecrets";
import { getActiveSecret } from "@/lib/secretStore";
import { languageForCampaignLocation } from "@/lib/locationOptions";
import type { Campaign, ClientAccount } from "@/lib/types";

type ClientMailSecrets = ClientAccount & {
  smtp_pass_encrypted?: string | null;
  smtp_pass_iv?: string | null;
  smtp_pass_auth_tag?: string | null;
};

type BotMailAttachment = {
  file_name: string;
  mime_type?: string | null;
  file_data_base64: string;
};

type SendMailArgs = {
  client: ClientMailSecrets;
  to: string;
  subject: string;
  body: string;
  campaignName?: string | null;
  campaign?: Campaign | null;
  attachments?: BotMailAttachment[];
  trackingId?: string | null;
};

export type SenderPersona = {
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  company: string;
  website: string;
  email: string;
  phone: string;
  address: string;
  footerNote: string;
  fromEmail: string;
  replyTo: string;
};

function clean(value: string | null | undefined) {
  return value?.trim() || "";
}

function cleanFooterValue(value: string | null | undefined) {
  const cleaned = clean(value);
  return cleaned === "-" ? "" : cleaned;
}

function websiteHref(value: string) {
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function pick(campaignValue: string | null | undefined, clientValue: string | null | undefined, fallback = "") {
  return cleanFooterValue(campaignValue) || cleanFooterValue(clientValue) || cleanFooterValue(fallback);
}

function baseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
}

function htmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToHtml(value: string) {
  return htmlEscape(value)
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 14px;">${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

export function buildSenderPersona(client: ClientMailSecrets, campaign: Campaign | null | undefined, fallbackUser = ""): SenderPersona {
  const fromEmail = clean(client.sender_email) || clean(client.smtp_user) || fallbackUser;
  const firstName = pick(campaign?.bot_first_name, client.bot_first_name);
  const lastName = pick(campaign?.bot_last_name, client.bot_last_name);
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || clean(client.sender_name) || clean(client.contact_name) || clean(client.company_name);
  const replyTo = pick(campaign?.signature_email, client.signature_email, clean(client.smtp_reply_to) || clean(client.sender_email) || clean(client.contact_email) || fromEmail);

  return {
    firstName,
    lastName,
    fullName,
    role: pick(campaign?.bot_role, client.bot_role),
    company: pick(campaign?.signature_company, client.signature_company, clean(client.company_name)),
    website: pick(campaign?.signature_website, client.signature_website, clean(client.website)),
    email: pick(campaign?.signature_email, client.signature_email, replyTo),
    phone: pick(campaign?.signature_phone, client.signature_phone, clean(client.phone)),
    address: pick(campaign?.signature_address, client.signature_address),
    footerNote: pick(campaign?.signature_footer_note, client.signature_footer_note),
    fromEmail,
    replyTo,
  };
}

function formatFrom(client: ClientMailSecrets, fallbackUser: string, persona: SenderPersona) {
  const explicitFrom = clean(client.smtp_from);
  if (explicitFrom) return explicitFrom;

  const senderEmail = persona.fromEmail || fallbackUser;
  const senderName = persona.fullName || clean(client.sender_name) || clean(client.company_name);
  return senderName ? `${senderName} <${senderEmail}>` : senderEmail;
}

async function clientSmtpPass(client: ClientMailSecrets) {
  if (client.smtp_pass_encrypted && client.smtp_pass_iv && client.smtp_pass_auth_tag) {
    return decryptSecret({
      encrypted_value: client.smtp_pass_encrypted,
      iv: client.smtp_pass_iv,
      auth_tag: client.smtp_pass_auth_tag,
    });
  }
  return getActiveSecret("smtp_pass");
}

export function unsubscribeUrl(client: ClientMailSecrets, to: string) {
  const root = baseUrl();
  if (!root) return "";
  const params = new URLSearchParams();
  params.set("email", to);
  params.set("client", client.id);
  if (client.company_name) params.set("company", client.company_name);
  return `${root}/unsubscribe?${params.toString()}`;
}

function trackingPixel(trackingId?: string | null) {
  const root = baseUrl();
  if (!root || !trackingId) return "";
  return `<img src="${root}/api/track/open/${encodeURIComponent(trackingId)}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;opacity:0;border:0;" />`;
}

export function buildEmailSignatureText(persona: SenderPersona) {
  const lines = [
    persona.fullName,
    persona.role,
    persona.company,
    persona.website,
    persona.email,
    persona.phone,
    persona.address,
  ].filter(Boolean);
  return lines.length ? `\n\n${lines.join("\n")}` : "";
}

export function buildEmailSignatureHtml(persona: SenderPersona) {
  const lines = [
    persona.fullName ? `<strong>${htmlEscape(persona.fullName)}</strong>` : "",
    persona.role ? `<span>${htmlEscape(persona.role)}</span>` : "",
    persona.company ? `<span>${htmlEscape(persona.company)}</span>` : "",
    persona.website ? `<a href="${htmlEscape(websiteHref(persona.website))}" style="color:#4f46e5;text-decoration:none;">${htmlEscape(persona.website.replace(/^https?:\/\//i, ""))}</a>` : "",
    persona.email ? `<a href="mailto:${htmlEscape(persona.email)}" style="color:#4f46e5;text-decoration:none;">${htmlEscape(persona.email)}</a>` : "",
    persona.phone ? `<span>${htmlEscape(persona.phone)}</span>` : "",
    persona.address ? `<span>${htmlEscape(persona.address)}</span>` : "",
  ].filter(Boolean).join("<br />");

  return `<div style="margin-top:22px;color:#111827;line-height:1.55;">${lines}</div>`;
}

function senderFooterLines(client: ClientMailSecrets, persona: SenderPersona, language: "pl" | "en") {
  const company = persona.company || cleanFooterValue(client.company_name) || (language === "pl" ? "firma" : "the company");
  const replyTo = persona.replyTo || cleanFooterValue(client.smtp_reply_to) || cleanFooterValue(client.sender_email) || cleanFooterValue(client.contact_email);

  const contactLines = [
    persona.fullName ? (language === "pl" ? `Osoba kontaktowa: ${persona.fullName}` : `Contact person: ${persona.fullName}`) : "",
    persona.role ? (language === "pl" ? `Stanowisko: ${persona.role}` : `Role: ${persona.role}`) : "",
    persona.company ? (language === "pl" ? `Firma: ${persona.company}` : `Company: ${persona.company}`) : "",
    persona.website ? (language === "pl" ? `Strona: ${persona.website}` : `Website: ${persona.website}`) : "",
    persona.email ? (language === "pl" ? `Email: ${persona.email}` : `Email: ${persona.email}`) : "",
    persona.phone ? (language === "pl" ? `Telefon: ${persona.phone}` : `Phone: ${persona.phone}`) : "",
    persona.address ? (language === "pl" ? `Adres: ${persona.address}` : `Address: ${persona.address}`) : "",
  ].filter(Boolean);

  const legalLines = language === "pl"
    ? [
        `Wiadomość została wysłana w imieniu ${company}.`,
        replyTo ? `Odpowiedzi trafiają do: ${replyTo}` : "",
        persona.footerNote,
      ]
    : [
        `This message was sent on behalf of ${company}.`,
        replyTo ? `Replies go to: ${replyTo}` : "",
        persona.footerNote,
      ];

  return [...contactLines, ...legalLines].filter(Boolean);
}

function mailFooter(client: ClientMailSecrets, persona: SenderPersona, language: "pl" | "en") {
  const lines = senderFooterLines(client, persona, language);
  return lines.length ? `\n\n---\n${lines.join("\n")}` : "";
}

function mailFooterHtml(client: ClientMailSecrets, persona: SenderPersona, language: "pl" | "en") {
  const lines = senderFooterLines(client, persona, language);
  if (!lines.length) return "";
  const label = language === "pl" ? "Dane nadawcy z kampanii" : "Campaign sender details";
  return `<div style="margin-top:24px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:12px;color:#667085;line-height:1.55;"><p style="margin:0 0 8px;font-weight:700;color:#475467;">${label}</p>${textToHtml(lines.join("\n"))}</div>`;
}

export function buildLeadEmailText(args: { body: string; persona: SenderPersona; client: ClientMailSecrets; to: string; campaign?: Campaign | null }) {
  const language = languageForCampaignLocation(args.campaign?.location_scope, args.campaign?.target_locations);
  return `${args.body.trim()}${buildEmailSignatureText(args.persona)}${mailFooter(args.client, args.persona, language)}`;
}

export function buildLeadEmailHtml(args: { body: string; persona: SenderPersona; client: ClientMailSecrets; to: string; trackingId?: string | null; campaign?: Campaign | null }) {
  // Minimal HTML preview only. Real SMTP sending uses plain text, so recipients get a raw email without styled HTML templates.
  return htmlEscape(buildLeadEmailText(args)).replace(/\n/g, "<br />");
}

export async function sendLeadEmail({ client, to, subject, body, campaign, attachments = [], trackingId }: SendMailArgs) {
  const host = clean(client.smtp_host) || (await getActiveSecret("smtp_host"));
  const portRaw = client.smtp_port || Number(await getActiveSecret("smtp_port")) || 465;
  const port = Number(portRaw);
  const user = clean(client.smtp_user) || (await getActiveSecret("smtp_user"));
  const pass = await clientSmtpPass(client);
  const secure = client.smtp_secure ?? port === 465;

  if (!host || !user || !pass) {
    throw new Error("Brakuje konfiguracji SMTP klienta albo globalnych sekretów SMTP.");
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const persona = buildSenderPersona(client, campaign, user);
  const from = formatFrom(client, user, persona);
  const replyTo = persona.replyTo || user;

  const info = await transport.sendMail({
    from,
    to,
    replyTo,
    subject,
    headers: {
      "X-FluxBase-Tracking-ID": trackingId || "",
      "X-FluxBase-Client-ID": client.id || "",
      "X-FluxBase-Campaign-ID": campaign?.id || "",
    },
    text: buildLeadEmailText({ body, persona, client, to, campaign }),
    attachments: attachments.map((attachment) => ({
      filename: attachment.file_name,
      content: Buffer.from(attachment.file_data_base64, "base64"),
      contentType: attachment.mime_type || undefined,
    })),
  });

  return {
    messageId: typeof info.messageId === "string" ? info.messageId : null,
    response: typeof info.response === "string" ? info.response : null,
  };
}
