import "server-only";

import nodemailer from "nodemailer";

export type SmtpTestInput = {
  host?: string | null;
  port?: number | string | null;
  secure?: boolean | null;
  user?: string | null;
  pass?: string | null;
  from?: string | null;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

export async function verifySmtpConnection(input: SmtpTestInput) {
  const host = clean(input.host) || "smtp.gmail.com";
  const port = Number(input.port || 465);
  const user = clean(input.user).toLowerCase();
  const pass = clean(input.pass);
  const secure = typeof input.secure === "boolean" ? input.secure : port === 465;

  if (!host) throw new Error("Brakuje hosta SMTP.");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Port SMTP ma niepoprawną wartość.");
  if (!user || !user.includes("@")) throw new Error("SMTP user musi być poprawnym adresem email.");
  if (!pass) throw new Error("Brakuje hasła aplikacji SMTP.");

  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  await transport.verify();
  return {
    ok: true,
    host,
    port,
    secure,
    user,
    from: clean(input.from) || user,
    checkedAt: new Date().toISOString(),
  };
}
