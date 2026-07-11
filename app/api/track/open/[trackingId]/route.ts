import { NextResponse } from "next/server";

import { adminDb } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pixel = Buffer.from("R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==", "base64");
const headers = {
  "Content-Type": "image/gif",
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(_request: Request, context: { params: Promise<{ trackingId: string }> }) {
  const { trackingId } = await context.params;
  const cleanTrackingId = decodeURIComponent(trackingId || "").trim();

  if (cleanTrackingId) {
    const now = new Date().toISOString();
    const { data } = await adminDb()
      .from("messages")
      .select("id,open_count,first_opened_at")
      .eq("tracking_id", cleanTrackingId)
      .not("status", "in", "(replied,bounced,spam,failed,unsubscribed)")
      .maybeSingle();

    if (data?.id) {
      await adminDb()
        .from("messages")
        .update({
          status: "opened",
          opened_at: now,
          first_opened_at: data.first_opened_at || now,
          last_opened_at: now,
          open_count: Number(data.open_count || 0) + 1,
        })
        .eq("id", data.id);
    }
  }

  return new NextResponse(pixel, { status: 200, headers });
}
