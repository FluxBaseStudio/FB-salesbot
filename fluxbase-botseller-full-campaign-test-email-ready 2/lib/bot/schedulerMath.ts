export type SchedulerMathInput = {
  workdayStartHour: number;
  workdayEndHour: number;
  dailyLimit: number;
  activeSchedulerItems: number;
  cronTickSeconds?: number;
};

export type SchedulerMathResult = {
  workWindowMinutes: number;
  intervalMinutes: number;
  intervalSeconds: number;
  staggerSeconds: number;
  maxStableCampaigns: number;
  stable: boolean;
  reason: string | null;
};

function assertFiniteInteger(value: number, label: string) {
  if (!Number.isFinite(value) || Math.round(value) !== value) {
    throw new Error(`${label} musi być liczbą całkowitą.`);
  }
}

export function calculateDynamicSchedulerMath(input: SchedulerMathInput): SchedulerMathResult {
  const start = Number(input.workdayStartHour);
  const end = Number(input.workdayEndHour);
  const dailyLimit = Number(input.dailyLimit);
  const activeItems = Number(input.activeSchedulerItems);
  const cronTickSeconds = Number(input.cronTickSeconds || 60);

  assertFiniteInteger(start, "Godzina startu");
  assertFiniteInteger(end, "Godzina końca");
  assertFiniteInteger(dailyLimit, "Limit dzienny");
  assertFiniteInteger(activeItems, "Liczba aktywnych kampanii");
  assertFiniteInteger(cronTickSeconds, "Minimalny tick crona");

  if (start < 0 || start > 23) throw new Error("Godzina startu musi być w zakresie 0-23.");
  if (end < 1 || end > 24 || end <= start) throw new Error("Godzina końca musi być większa od startu i w zakresie 1-24.");
  if (dailyLimit < 1) throw new Error("Limit dzienny musi być większy od 0.");
  if (activeItems < 1) throw new Error("Liczba aktywnych kampanii musi być większa od 0.");
  if (cronTickSeconds < 1) throw new Error("Minimalny tick crona musi być większy od 0.");

  const workWindowMinutes = (end - start) * 60;
  const intervalSeconds = Math.floor((workWindowMinutes * 60) / dailyLimit);
  if (intervalSeconds < cronTickSeconds) {
    return {
      workWindowMinutes,
      intervalMinutes: Math.round(intervalSeconds / 60),
      intervalSeconds,
      staggerSeconds: 0,
      maxStableCampaigns: 0,
      stable: false,
      reason: "Limit dzienny jest zbyt wysoki dla okna pracy i minimalnego ticku crona.",
    };
  }
  const maxStableCampaigns = Math.max(Math.floor(intervalSeconds / cronTickSeconds), 1);
  const staggerSeconds = Math.floor(intervalSeconds / activeItems);
  const stable = staggerSeconds >= cronTickSeconds;
  return {
    workWindowMinutes,
    intervalMinutes: Math.round(intervalSeconds / 60),
    intervalSeconds,
    staggerSeconds,
    maxStableCampaigns,
    stable,
    reason: stable ? null : `Za dużo aktywnych kampanii dla tego cyklu. Stabilnie mieści się ${maxStableCampaigns}.`,
  };
}
