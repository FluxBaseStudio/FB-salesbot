import "server-only";

type Bucket = {
  count: number;
  windowStartedAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

function pruneIfNeeded(now: number, windowMs: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStartedAt > windowMs) buckets.delete(key);
  }
}

/**
 * Prosty licznik prób w oknie czasowym (per instancja procesu).
 * Wystarczający jako podstawowa ochrona logowania przed zgadywaniem haseł.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  pruneIfNeeded(now, windowMs);

  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStartedAt > windowMs) {
    buckets.set(key, { count: 1, windowStartedAt: now });
    return { ok: true as const, remaining: limit - 1 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    const retryAfterSeconds = Math.ceil((bucket.windowStartedAt + windowMs - now) / 1000);
    return { ok: false as const, retryAfterSeconds };
  }
  return { ok: true as const, remaining: limit - bucket.count };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

export function requestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") || "unknown";
}
