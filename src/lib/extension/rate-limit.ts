/**
 * A fixed-window limiter kept in memory. Per server instance only, so it slows
 * password guessing rather than stopping a distributed attack.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return function allow(key: string, now = Date.now()): boolean {
    const current = hits.get(key);

    if (!current || current.resetAt <= now) {
      if (hits.size > 10_000) hits.clear();
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    current.count += 1;
    return current.count <= limit;
  };
}
