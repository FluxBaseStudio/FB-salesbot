import "server-only";

import { createAdminNotification } from "@/lib/adminNotifications";
import { adminDb } from "@/lib/supabaseAdmin";

export class CampaignReputationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CampaignReputationError";
  }
}

function envNumber(name: string, fallback: number) {
  const raw = process.env[name];
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function countMessages(campaignId: string, statuses: string[], sinceIso: string) {
  const { count, error } = await adminDb()
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .gte("created_at", sinceIso)
    .in("status", statuses);
  if (error) throw error;
  return count || 0;
}

export async function getCampaignReputationSnapshot(campaignId: string) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sentStatuses = ["sent", "delivered", "opened", "replied", "follow_up_sent", "bounced", "spam", "unsubscribed"];
  const [sent, bounced, spam, failed, replied] = await Promise.all([
    countMessages(campaignId, sentStatuses, since),
    countMessages(campaignId, ["bounced"], since),
    countMessages(campaignId, ["spam"], since),
    countMessages(campaignId, ["failed"], since),
    countMessages(campaignId, ["replied"], since),
  ]);
  const base = Math.max(sent, 1);
  return {
    campaignId,
    since,
    sent,
    bounced,
    spam,
    failed,
    replied,
    bounceRate: Math.round((bounced / base) * 1000) / 10,
    spamRate: Math.round((spam / base) * 1000) / 10,
    failedRate: Math.round((failed / base) * 1000) / 10,
    replyRate: Math.round((replied / base) * 1000) / 10,
  };
}

export async function assertCampaignReputationBeforeSend(campaignId: string) {
  const minSample = Math.max(Math.floor(envNumber("REPUTATION_MIN_SAMPLE", 20)), 1);
  const maxBounceRate = Math.max(envNumber("REPUTATION_MAX_BOUNCE_RATE", 8), 0);
  const maxSpamRate = Math.max(envNumber("REPUTATION_MAX_SPAM_RATE", 1), 0);
  const maxFailedRate = Math.max(envNumber("REPUTATION_MAX_FAILED_RATE", 25), 0);
  const snapshot = await getCampaignReputationSnapshot(campaignId);
  if (snapshot.sent < minSample) return snapshot;

  const problems: string[] = [];
  if (snapshot.bounceRate >= maxBounceRate) problems.push(`bounce ${snapshot.bounceRate}% >= ${maxBounceRate}%`);
  if (snapshot.spamRate >= maxSpamRate) problems.push(`spam ${snapshot.spamRate}% >= ${maxSpamRate}%`);
  if (snapshot.failedRate >= maxFailedRate) problems.push(`failed ${snapshot.failedRate}% >= ${maxFailedRate}%`);

  if (problems.length) {
    await adminDb().from("campaigns").update({
      status: "paused",
      paused_at: new Date().toISOString(),
      paused_reason: `Reputacja wysyłki przekroczyła progi bezpieczeństwa: ${problems.join(", ")}. Sprawdź SMTP, target i jakość bazy.`.slice(0, 900),
    }).eq("id", campaignId).eq("status", "active");

    await createAdminNotification({
      tone: "danger",
      title: "Kampania zatrzymana przez reputację wysyłki",
      message: `Wstrzymano kampanię ${campaignId}. Powody: ${problems.join(", ")}. Snapshot: ${JSON.stringify(snapshot)}`,
      resource: "campaigns",
      resourceId: campaignId,
      dedupeKey: `reputation-stop:${campaignId}`,
    });

    throw new CampaignReputationError(`Kampania wstrzymana przez reputację wysyłki: ${problems.join(", ")}.`);
  }

  return snapshot;
}
