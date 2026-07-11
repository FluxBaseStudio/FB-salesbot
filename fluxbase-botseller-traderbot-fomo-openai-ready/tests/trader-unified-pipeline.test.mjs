import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const server = readFileSync(new URL("../lib/trader/server.ts", import.meta.url), "utf8");
const copy = readFileSync(new URL("../lib/trader/copyServer.ts", import.meta.url), "utf8");
const ai = readFileSync(new URL("../lib/trader/aiBots.ts", import.meta.url), "utf8");
const manualSignalRoute = readFileSync(new URL("../app/api/trader/copy/signals/route.ts", import.meta.url), "utf8");
const manualRunRoute = readFileSync(new URL("../app/api/trader/copy/run/route.ts", import.meta.url), "utf8");
const webhook = readFileSync(new URL("../app/api/trader/copy/fomo/webhook/route.ts", import.meta.url), "utf8");
const worker = readFileSync(new URL("../worker/trader-worker.ts", import.meta.url), "utf8");
const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

assert.match(copy, /source_kind:\s*["']fomo["']/);
assert.match(copy, /runTraderAiCouncil/);
assert.match(copy, /copy_promote_to_live_proposals/);
assert.match(server, /order\(["']priority["'],\s*\{\s*ascending:\s*false\s*\}\)/);
assert.match(server, /signal\.source_kind\s*===\s*["']fomo["']/);
assert.match(server, /Automatyczne zlecenia są zablokowane na mainnet/);
assert.match(ai, /https:\/\/api\.openai\.com\/v1\/responses/);
assert.match(ai, /type:\s*["']json_schema["']/);
assert.match(ai, /AbortSignal\.timeout/);
assert.match(ai, /untrusted_source_rationale/);
assert.match(ai, /gpt-5\.6-luna/);
assert.match(webhook, /runLiveExecutor/);
assert.match(webhook, /analysis[\s\S]*promoted/);
assert.match(manualSignalRoute, /runLiveExecutor/);
assert.match(manualRunRoute, /runLiveExecutor/);
assert.match(copy, /10 - rows\.length/);
assert.match(worker, /runFomoCopyEngine/);
assert.ok(vercel.crons.some((cron) => cron.path === "/api/cron/trader-live-executor"));

console.log("trader unified pipeline tests passed");
