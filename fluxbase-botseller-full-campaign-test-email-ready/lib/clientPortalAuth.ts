import "server-only";

import crypto from "crypto";

import { adminDb } from "@/lib/supabaseAdmin";

const COOKIE_NAME = "fb_client_portal";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function portalSecret() {
  const secret = process.env.CLIENT_PORTAL_SECRET || process.env.SECRET_ENCRYPTION_KEY;
  if (!secret || secret.length < 24) {
    throw new Error("Brakuje CLIENT_PORTAL_SECRET albo SECRET_ENCRYPTION_KEY min. 24 znaki.");
  }
  return secret;
}

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function fromB64url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(value: string) {
  return crypto.createHmac("sha256", portalSecret()).update(value).digest("base64url");
}

export function hashPortalPassword(password: string, salt = crypto.randomBytes(16).toString("base64url")) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("base64url");
  return { salt, hash, last4: password.slice(-4) };
}

export function verifyPortalPassword(password: string, salt: string, expectedHash: string) {
  const { hash } = hashPortalPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
}

export function createPortalToken(clientId: string, email: string) {
  const payload = {
    clientId,
    email,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const encoded = b64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function readPortalToken(token: string | undefined) {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  if (sign(encoded) !== signature) return null;
  const payload = JSON.parse(fromB64url(encoded)) as { clientId?: string; email?: string; exp?: number };
  if (!payload.clientId || !payload.email || !payload.exp) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return { clientId: payload.clientId, email: payload.email };
}

export async function getPortalClientFromCookie(token: string | undefined) {
  const session = readPortalToken(token);
  if (!session) return null;

  const { data, error } = await adminDb()
    .from("client_accounts")
    .select("id, company_name, contact_email, portal_email, subscription_status")
    .eq("id", session.clientId)
    .single();

  if (error || !data) return null;
  if ((data.portal_email || "").toLowerCase() !== session.email.toLowerCase()) return null;
  return data;
}

export const CLIENT_PORTAL_COOKIE = COOKIE_NAME;
export const CLIENT_PORTAL_TTL_SECONDS = TOKEN_TTL_SECONDS;
