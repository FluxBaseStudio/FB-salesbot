import type { NextConfig } from "next";

const noStoreHeaders = [
  { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
  { key: "Pragma", value: "no-cache" },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    root: process.cwd(),
  },
  typescript: {
    // `npm run build` uruchamia osobny typecheck przed kompilacja.
    ignoreBuildErrors: true,
  },
  experimental: {
    cpus: 2,
    staticGenerationMaxConcurrency: 2,
    staticGenerationMinPagesPerWorker: 1,
  },
  async headers() {
    return [
      // Prywatne panele: brak cache, żeby przycisk Wstecz po wylogowaniu
      // nie pokazywał danych panelu z pamięci przeglądarki.
      { source: "/admin", headers: noStoreHeaders },
      { source: "/admin/:path*", headers: noStoreHeaders },
      { source: "/client", headers: noStoreHeaders },
      { source: "/client/:path*", headers: noStoreHeaders },
      { source: "/api/admin-data", headers: noStoreHeaders },
      { source: "/api/client-portal/:path*", headers: noStoreHeaders },
      { source: "/api/clients/:path*", headers: noStoreHeaders },
      { source: "/api/signup-orders/:path*", headers: noStoreHeaders },
      { source: "/api/secrets/:path*", headers: noStoreHeaders },
      { source: "/trader", headers: noStoreHeaders },
      { source: "/trader/:path*", headers: noStoreHeaders },
      { source: "/api/trader/:path*", headers: noStoreHeaders },
      { source: "/api/cron/trader-market-scan", headers: noStoreHeaders },
      { source: "/api/cron/trader-paper-engine", headers: noStoreHeaders },
      { source: "/api/cron/trader-copy-engine", headers: noStoreHeaders },
      { source: "/api/cron/trader-live-executor", headers: noStoreHeaders },
    ];
  },
};

export default nextConfig;
