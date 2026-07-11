"use client";

import { useState } from "react";

import { initialCampaignForm } from "@/components/admin/adminShared";

export function useCampaignForm(initial = initialCampaignForm) {
  const [form, setForm] = useState(initial);
  const [files, setFiles] = useState<File[]>([]);

  function reset(next = initialCampaignForm) {
    setForm(next);
    setFiles([]);
  }

  return { form, setForm, files, setFiles, reset };
}
