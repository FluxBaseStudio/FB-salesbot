"use client";

import { useMemo } from "react";

import { isDeliveredLike, isSentLike } from "@/components/admin/adminShared";
import type { AdminData } from "@/lib/types";

export function useAdminData(data: AdminData) {
  return useMemo(
    () => ({
      clients: data.clients.length,
      campaigns: data.campaigns.length,
      leads: data.leads.length,
      messages: data.messages.length,
      approved: data.leads.filter((lead) => lead.status === "approved").length,
      sent: data.messages.filter(isSentLike).length,
      delivered: data.messages.filter(isDeliveredLike).length,
      opened: data.messages.filter((message) => Boolean(message.opened_at) || ["opened", "replied"].includes(message.status)).length,
      replied: data.messages.filter((message) => message.status === "replied" || Boolean(message.replied_at)).length,
      bounced: data.messages.filter((message) => message.status === "bounced" || Boolean(message.bounced_at)).length,
      spam: data.messages.filter((message) => message.status === "spam" || Boolean(message.spam_at)).length,
      followUps: data.messages.filter((message) => message.status === "follow_up_sent" || Number(message.sequence_step || 0) > 0).length,
    }),
    [data],
  );
}
