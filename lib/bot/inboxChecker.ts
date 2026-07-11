import "server-only";

import tls from "tls";

import { decryptSecret } from "@/lib/cryptoSecrets";
import { getActiveSecret } from "@/lib/secretStore";
import { adminDb } from "@/lib/supabaseAdmin";
import type { ClientAccount } from "@/lib/types";
import { addGlobalSuppression } from "@/lib/bot/suppression";
import { domainKey } from "@/lib/bot/utils";

type ClientMailSecrets = ClientAccount & {
  smtp_pass_encrypted?: string | null;
  smtp_pass_iv?: string | null;
  smtp_pass_auth_tag?: string | null;
  imap_host?: string | null;
  imap_port?: number | null;
  imap_secure?: boolean | null;
  imap_user?: string | null;
};

type InboxCheckMessage = {
  id: string;
  client_id: string | null;
  sent_at: string | null;
  created_at: string;
  email_to: string | null;
  lead_id: string | null;
  client_accounts?: ClientMailSecrets | null;
  leads?: {
    email?: string | null;
    website?: string | null;
    company_name?: string | null;
  } | null;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function enabled() {
  return (process.env.INBOX_CHECKER_ENABLED || "true").toLowerCase() !== "false";
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function quote(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function imapDate(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}-${MONTHS[date.getMonth()]}-${date.getFullYear()}`;
}

function inferImapHost(smtpHost: string) {
  const host = smtpHost.toLowerCase();
  if (host.includes("gmail")) return "imap.gmail.com";
  if (host.includes("office365") || host.includes("outlook") || host.includes("hotmail")) return "outlook.office365.com";
  if (host.startsWith("smtp.")) return host.replace(/^smtp\./, "imap.");
  return "";
}

async function clientMailPass(client: ClientMailSecrets) {
  if (client.smtp_pass_encrypted && client.smtp_pass_iv && client.smtp_pass_auth_tag) {
    return decryptSecret({
      encrypted_value: client.smtp_pass_encrypted,
      iv: client.smtp_pass_iv,
      auth_tag: client.smtp_pass_auth_tag,
    });
  }
  return getActiveSecret("smtp_pass");
}

function looksLikeStop(raw: string) {
  const text = raw.toLowerCase();
  return /(^|\s)(stop|unsubscribe|wypisz|wypisuje|wypisuję|rezygnuje|rezygnuję)(\s|$)/i.test(text)
    || text.includes("nie kontaktuj")
    || text.includes("usuń mnie")
    || text.includes("usun mnie")
    || text.includes("proszę usunąć")
    || text.includes("prosze usunac");
}

class SimpleImapClient {
  private socket: tls.TLSSocket | null = null;
  private tagCounter = 0;

  constructor(private readonly host: string, private readonly port: number) {}

  connect() {
    return new Promise<void>((resolve, reject) => {
      const socket = tls.connect({ host: this.host, port: this.port, servername: this.host }, () => undefined);
      this.socket = socket;
      let buffer = "";
      const timer = setTimeout(() => reject(new Error("Timeout połączenia IMAP.")), 15000);
      socket.on("data", (chunk) => {
        buffer += chunk.toString("utf8");
        if (buffer.includes("* OK")) {
          clearTimeout(timer);
          resolve();
        }
      });
      socket.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  command(command: string) {
    if (!this.socket) throw new Error("Brak aktywnego połączenia IMAP.");
    const tag = `FB${++this.tagCounter}`;
    const donePattern = new RegExp(`\\r?\\n${tag} (OK|NO|BAD)`, "i");
    return new Promise<string>((resolve, reject) => {
      let buffer = "";
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout komendy IMAP: ${command.split(" ")[0]}`));
      }, 20000);
      const onData = (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        if (donePattern.test(buffer)) {
          cleanup();
          if (new RegExp(`\\r?\\n${tag} OK`, "i").test(buffer)) resolve(buffer);
          else reject(new Error(`IMAP odrzucił komendę: ${command.split(" ")[0]}`));
        }
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const cleanup = () => {
        clearTimeout(timer);
        this.socket?.off("data", onData);
        this.socket?.off("error", onError);
      };
      this.socket?.on("data", onData);
      this.socket?.on("error", onError);
      this.socket?.write(`${tag} ${command}\r\n`);
    });
  }

  async login(user: string, pass: string) {
    await this.command(`LOGIN ${quote(user)} ${quote(pass)}`);
    await this.command("SELECT INBOX");
  }

  async searchFromSince(email: string, since: Date) {
    const response = await this.command(`SEARCH SINCE ${imapDate(since)} FROM ${quote(email)}`);
    const line = response.split(/\r?\n/).find((item) => item.startsWith("* SEARCH")) || "";
    return line
      .replace(/^\* SEARCH\s*/i, "")
      .split(/\s+/)
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0);
  }

  async fetchPreview(id: number) {
    return this.command(`FETCH ${id} (BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)] BODY.PEEK[TEXT])`);
  }

  async logout() {
    try {
      if (this.socket && !this.socket.destroyed) await this.command("LOGOUT");
    } catch {
      // ignore logout errors
    } finally {
      this.socket?.destroy();
      this.socket = null;
    }
  }
}

export async function checkInboxReplyForMessage(message: InboxCheckMessage) {
  if (!enabled()) return { checked: false as const, disabled: true as const };
  const client = message.client_accounts;
  const recipient = clean(message.email_to || message.leads?.email).toLowerCase();
  if (!client || !recipient) return { checked: false as const, disabled: true as const };

  const user = clean(client.imap_user) || clean(client.smtp_user) || clean(await getActiveSecret("smtp_user"));
  const pass = await clientMailPass(client);
  const smtpHost = clean(client.smtp_host) || clean(await getActiveSecret("smtp_host"));
  const host = clean(client.imap_host) || clean(process.env.IMAP_HOST) || inferImapHost(smtpHost);
  const port = Number(client.imap_port || process.env.IMAP_PORT || 993);
  if (!user || !pass || !host || !Number.isFinite(port)) return { checked: false as const, disabled: true as const };

  const lookbackDays = Math.min(Math.max(Number(process.env.INBOX_CHECKER_LOOKBACK_DAYS || 14), 1), 60);
  const sentAt = message.sent_at ? new Date(message.sent_at) : new Date(message.created_at);
  const since = new Date(Math.max(sentAt.getTime() - 1000 * 60 * 60 * 24, Date.now() - lookbackDays * 24 * 60 * 60 * 1000));
  const imap = new SimpleImapClient(host, port);

  try {
    await imap.connect();
    await imap.login(user, pass);
    const ids = await imap.searchFromSince(recipient, since);
    if (!ids.length) return { checked: true as const, replied: false as const };

    const latestId = ids[ids.length - 1];
    const preview = await imap.fetchPreview(latestId);
    const stopDetected = looksLikeStop(preview);
    const now = new Date().toISOString();

    await Promise.all([
      adminDb().from("messages").update({ status: "replied", replied_at: now, follow_up_due_at: null }).eq("id", message.id),
      message.lead_id ? adminDb().from("leads").update({ status: stopDetected ? "do_not_contact" : "sent" }).eq("id", message.lead_id) : Promise.resolve({ error: null }),
    ]);

    if (stopDetected) {
      await addGlobalSuppression({
        email: recipient,
        domain: domainKey(message.leads?.website || null),
        companyName: message.leads?.company_name || null,
        reason: "Globalna blokada: odbiorca odpisał STOP / wypisz przez inbox checker.",
      });
    }

    return { checked: true as const, replied: true as const, stopDetected, imapMessageId: latestId };
  } catch (error) {
    console.error("inbox checker failed", error instanceof Error ? error.message : error);
    return { checked: false as const, error: error instanceof Error ? error.message : "Błąd inbox checkera." };
  } finally {
    await imap.logout();
  }
}
