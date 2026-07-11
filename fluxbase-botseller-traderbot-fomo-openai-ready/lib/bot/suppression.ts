import "server-only";

import { domainKey } from "@/lib/bot/utils";
import { adminDb } from "@/lib/supabaseAdmin";

type SuppressionArgs = {
  clientId?: string | null;
  email?: string | null;
  domain?: string | null;
  companyName?: string | null;
  reason: string;
};

function cleanEmail(value?: string | null) {
  return value?.trim().toLowerCase() || null;
}

function cleanDomain(value?: string | null) {
  return domainKey(value || null) || null;
}

function cleanCompany(value?: string | null) {
  return value?.trim() || null;
}

async function alreadyExists(args: { clientId: string | null; email: string | null; domain: string | null; companyName: string | null }) {
  const db = adminDb();
  if (args.email) {
    const query = db.from("suppression_list").select("id").eq("email", args.email).limit(1);
    const { data, error } = args.clientId ? await query.eq("client_id", args.clientId) : await query.is("client_id", null);
    if (error) throw error;
    if ((data || []).length) return true;
  }
  if (args.domain) {
    const query = db.from("suppression_list").select("id").eq("domain", args.domain).limit(1);
    const { data, error } = args.clientId ? await query.eq("client_id", args.clientId) : await query.is("client_id", null);
    if (error) throw error;
    if ((data || []).length) return true;
  }
  if (args.companyName) {
    const query = db.from("suppression_list").select("id").ilike("company_name", args.companyName).limit(1);
    const { data, error } = args.clientId ? await query.eq("client_id", args.clientId) : await query.is("client_id", null);
    if (error) throw error;
    if ((data || []).length) return true;
  }
  return false;
}

export async function addSuppressionItem({ clientId = null, email, domain, companyName, reason }: SuppressionArgs) {
  const next = {
    clientId,
    email: cleanEmail(email),
    domain: cleanDomain(domain),
    companyName: cleanCompany(companyName),
    reason,
  };

  if (!next.email && !next.domain && !next.companyName) return { ok: true as const, skipped: true as const };
  if (await alreadyExists(next)) return { ok: true as const, duplicate: true as const };

  const { error } = await adminDb().from("suppression_list").insert({
    client_id: next.clientId,
    email: next.email,
    domain: next.domain,
    company_name: next.companyName,
    reason: next.reason,
  });
  if (error) throw error;
  return { ok: true as const };
}

export async function addGlobalSuppression(args: Omit<SuppressionArgs, "clientId">) {
  return addSuppressionItem({ ...args, clientId: null });
}

export async function addGlobalSuppressionForMessage(messageId: string, reason: string) {
  const { data, error } = await adminDb()
    .from("messages")
    .select("email_to, leads(email, website, company_name)")
    .eq("id", messageId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: true as const, skipped: true as const };
  const lead = Array.isArray(data.leads) ? data.leads[0] : data.leads;
  return addGlobalSuppression({
    email: String(data.email_to || lead?.email || ""),
    domain: String(lead?.website || ""),
    companyName: String(lead?.company_name || ""),
    reason,
  });
}
