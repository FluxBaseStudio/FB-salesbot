import "server-only";

import { adminDb } from "@/lib/supabaseAdmin";

export const GPT_55_INPUT_USD_PER_1M = 5;
export const GPT_55_CACHED_INPUT_USD_PER_1M = 0.5;
export const GPT_55_OUTPUT_USD_PER_1M = 30;

export type AiUsagePricing = {
  inputUsdPer1M: number;
  cachedInputUsdPer1M: number;
  outputUsdPer1M: number;
};

export const GPT_55_PRICING: AiUsagePricing = {
  inputUsdPer1M: GPT_55_INPUT_USD_PER_1M,
  cachedInputUsdPer1M: GPT_55_CACHED_INPUT_USD_PER_1M,
  outputUsdPer1M: GPT_55_OUTPUT_USD_PER_1M,
};

function numberFrom(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

export function readOpenAiUsage(payload: any) {
  const usage = payload?.usage || {};
  const inputTokens = numberFrom(usage.input_tokens ?? usage.prompt_tokens);
  const outputTokens = numberFrom(usage.output_tokens ?? usage.completion_tokens);
  const totalTokens = numberFrom(usage.total_tokens) || inputTokens + outputTokens;
  const cachedInputTokens = Math.min(
    inputTokens,
    numberFrom(usage.input_tokens_details?.cached_tokens ?? usage.prompt_tokens_details?.cached_tokens),
  );
  return { inputTokens, cachedInputTokens, outputTokens, totalTokens };
}

export function calculateGpt55CostUsd(args: { inputTokens: number; cachedInputTokens?: number; outputTokens: number }) {
  const inputTokens = Math.max(Number(args.inputTokens || 0), 0);
  const cachedInputTokens = Math.min(Math.max(Number(args.cachedInputTokens || 0), 0), inputTokens);
  const billableInputTokens = Math.max(inputTokens - cachedInputTokens, 0);
  const outputTokens = Math.max(Number(args.outputTokens || 0), 0);
  const cost =
    (billableInputTokens / 1_000_000) * GPT_55_PRICING.inputUsdPer1M +
    (cachedInputTokens / 1_000_000) * GPT_55_PRICING.cachedInputUsdPer1M +
    (outputTokens / 1_000_000) * GPT_55_PRICING.outputUsdPer1M;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export async function logAiUsage(args: {
  provider?: string | null;
  model?: string | null;
  clientId?: string | null;
  campaignId?: string | null;
  leadId?: string | null;
  runId?: string | null;
  operation: string;
  inputTokens: number;
  cachedInputTokens?: number;
  outputTokens: number;
  totalTokens?: number;
  status?: string;
  metadata?: Record<string, unknown> | null;
}) {
  const inputTokens = numberFrom(args.inputTokens);
  const cachedInputTokens = Math.min(numberFrom(args.cachedInputTokens), inputTokens);
  const outputTokens = numberFrom(args.outputTokens);
  const totalTokens = numberFrom(args.totalTokens) || inputTokens + outputTokens;
  const costUsd = calculateGpt55CostUsd({ inputTokens, cachedInputTokens, outputTokens });

  try {
    const { error } = await adminDb().from("ai_usage_logs").insert({
      provider: args.provider || "openai",
      model: args.model || "gpt-5.5",
      client_id: args.clientId || null,
      campaign_id: args.campaignId || null,
      lead_id: args.leadId || null,
      run_id: args.runId || null,
      operation: args.operation,
      input_tokens: inputTokens,
      cached_input_tokens: cachedInputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      cost_usd: costUsd,
      status: args.status || "ok",
      metadata: args.metadata || null,
    });
    if (error) console.error("ai usage log failed", error.message);
  } catch (error) {
    console.error("ai usage log failed", error instanceof Error ? error.message : error);
  }
}
