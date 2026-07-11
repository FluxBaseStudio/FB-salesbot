import "server-only";

const BLOCKED_LOCAL_PARTS = /^(no-?reply|noreply|donotreply|do-not-reply|mailer-daemon|postmaster|abuse|privacy|rodo|dpo|iod|newsletter|marketing-newsletter|unsubscribe)$/i;
const FILE_EXTENSION_ENDING = /\.(png|jpg|jpeg|webp|gif|svg|pdf|zip|rar|7z|doc|docx|xls|xlsx)$/i;

export function normalizeEmailCandidate(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .replace(/^mailto:/i, "")
    .replace(/[<>()\[\],;:'\"`]+$/g, "")
    .replace(/^[<>()\[\],;:'\"`]+/g, "")
    .toLowerCase();
}

export function isValidRecipientEmail(value: string | null | undefined) {
  const email = normalizeEmailCandidate(value);
  if (!email || email.length > 254) return false;
  if (email.includes("..")) return false;
  if (FILE_EXTENSION_ENDING.test(email)) return false;

  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain) return false;
  if (local.length > 64) return false;
  if (BLOCKED_LOCAL_PARTS.test(local)) return false;

  // Najważniejsze zabezpieczenie produkcyjne: nie wpuszczamy adresów typu kontakt@firma,
  // info@localhost, test@chkuserr itp. SMTP i tak je odrzuci błędem MX.
  if (!domain.includes(".")) return false;
  if (/^(localhost|local|example|test|invalid)$/i.test(domain)) return false;
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(domain)) return false;

  const tld = domain.split(".").pop() || "";
  if (tld.length < 2 || tld.length > 24) return false;
  if (/^\d+$/.test(tld)) return false;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isPermanentInvalidRecipientError(error: string | null | undefined) {
  const message = String(error || "").toLowerCase();
  return (
    message.includes("all recipients were rejected") ||
    message.includes("can't find a valid mx") ||
    message.includes("valid mx for rcpt domain") ||
    message.includes("recipient address rejected") ||
    message.includes("user unknown") ||
    message.includes("no such user") ||
    message.includes("domain not found") ||
    message.includes("mailbox unavailable") ||
    /\b550\s+5\.1\.[012]/.test(message)
  );
}
