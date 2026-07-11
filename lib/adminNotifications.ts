import "server-only";

import { adminDb } from "@/lib/supabaseAdmin";

export type AdminNotificationTone = "info" | "warning" | "danger" | "success";

export async function createAdminNotification(args: {
  tone: AdminNotificationTone;
  title: string;
  message: string;
  resource?: string | null;
  resourceId?: string | null;
  dedupeKey?: string | null;
}) {
  const db = adminDb();
  const title = args.title.trim().slice(0, 180);
  const message = args.message.trim().slice(0, 1200);
  const resource = args.resource || null;
  const resourceId = args.resourceId || null;
  const dedupeKey = args.dedupeKey || `${resource || "system"}:${resourceId || "global"}:${title}`;

  try {
    const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await db
      .from("admin_notifications")
      .select("id")
      .eq("status", "unread")
      .eq("title", title)
      .eq("resource", resource)
      .eq("resource_id", resourceId)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();

    if (existing?.id) return existing;

    const { data, error } = await db
      .from("admin_notifications")
      .insert({
        tone: args.tone,
        title,
        message: `${message}\n\nRef: ${dedupeKey}`.slice(0, 1500),
        resource,
        resource_id: resourceId,
        status: "unread",
      })
      .select("id")
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("admin notification failed", error instanceof Error ? error.message : error);
    return null;
  }
}
