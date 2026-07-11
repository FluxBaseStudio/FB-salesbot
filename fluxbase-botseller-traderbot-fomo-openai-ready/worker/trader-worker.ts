import { runLiveExecutor, runMarketScan, runPaperEngine } from "@/lib/trader/server";
import { runFomoCopyEngine } from "@/lib/trader/copyServer";

async function runOnce() {
  const scan = await runMarketScan();
  const copy = await runFomoCopyEngine();
  const paper = await runPaperEngine();
  const live = await runLiveExecutor();
  return { scan, copy, paper, live };
}

async function main() {
  if (process.argv.includes("--loop")) {
    const intervalMs = Math.max(Number(process.env.TRADER_WORKER_INTERVAL_SECONDS || 60), 15) * 1000;
    for (;;) {
      console.log(JSON.stringify({ ok: true, result: await runOnce(), at: new Date().toISOString() }));
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  console.log(JSON.stringify({ ok: true, result: await runOnce(), at: new Date().toISOString() }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
