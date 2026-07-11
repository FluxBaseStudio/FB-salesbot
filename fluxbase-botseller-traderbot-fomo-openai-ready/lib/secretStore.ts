import "server-only";

import { decryptSecret } from "@/lib/cryptoSecrets";
import { adminDb } from "@/lib/supabaseAdmin";
import type { SecretProvider } from "@/lib/types";

type SecretRow = {
  provider: SecretProvider;
  encrypted_value: string;
  iv: string;
  auth_tag: string;
};

const envFallbacks: Partial<Record<SecretProvider, string | undefined>> = {
  openai: process.env.OPENAI_API_KEY,
  google_places: process.env.GOOGLE_PLACES_API_KEY,
  google_search: process.env.GOOGLE_SEARCH_API_KEY,
  google_search_cx: process.env.GOOGLE_SEARCH_CX || process.env.GOOGLE_SEARCH_ENGINE_ID,
  smtp_host: process.env.SMTP_HOST,
  smtp_port: process.env.SMTP_PORT,
  smtp_user: process.env.SMTP_USER,
  smtp_pass: process.env.SMTP_PASS,
  smtp_from: process.env.SMTP_FROM,
  twilio: process.env.TWILIO_AUTH_TOKEN,
};

export async function getActiveSecret(provider: SecretProvider): Promise<string | null> {
  const { data, error } = await adminDb()
    .from("api_credentials")
    .select("provider,encrypted_value,iv,auth_tag")
    .eq("provider", provider)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SecretRow>();

  if (error) throw error;
  if (data) return decryptSecret(data);

  const fallback = envFallbacks[provider];
  return fallback?.trim() || null;
}

export async function getBotSecrets() {
  const [openai, googlePlaces, googleSearch, googleSearchCx] = await Promise.all([
    getActiveSecret("openai"),
    getActiveSecret("google_places"),
    getActiveSecret("google_search"),
    getActiveSecret("google_search_cx"),
  ]);

  return {
    openai,
    googlePlaces,
    googleSearch,
    googleSearchCx,
  };
}
