import "server-only";

import { createClient } from "@supabase/supabase-js";

export async function verifyAdmin(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { ok: false as const, status: 500, error: "Brakuje konfiguracji Supabase." };

  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false as const, status: 401, error: "Brak tokenu." };

  const supabase = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false as const, status: 401, error: "Nieprawidłowa sesja." };

  const allowedEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!allowedEmails.length) return { ok: false as const, status: 500, error: "ADMIN_EMAILS nie jest ustawione." };
  if (!allowedEmails.includes((data.user.email || "").toLowerCase())) {
    return { ok: false as const, status: 403, error: "Brak dostępu admina." };
  }

  return { ok: true as const, user: data.user };
}
