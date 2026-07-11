import type { NextConfig } from "next";

const noStoreHeaders = [
  { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
  { key: "Pragma", value: "no-cache" },
];

const nextConfig: NextConfig = {
  experimental: {
    cpus: 1,
    workerThreads: false,
    staticGenerationMaxConcurrency: 1,
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
    ];
  },
};

export default nextConfig;
