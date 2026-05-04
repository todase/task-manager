type Clock = () => number

export function createRateLimiter(clock: Clock = Date.now) {
  const store = new Map<string, number[]>()

  return function check(key: string, maxRequests: number, windowMs: number): boolean {
    const now = clock()
    const cutoff = now - windowMs
    const hits = (store.get(key) ?? []).filter((t) => t > cutoff)
    if (hits.length >= maxRequests) return true
    hits.push(now)
    store.set(key, hits)
    return false
  }
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
}

// Shared singleton — per-process in-memory store.
// Two important limits to be aware of:
// 1. Cold starts reset all counters (Vercel serverless).
// 2. Concurrent function instances each maintain their own store — on Vercel, N instances
//    each allow the full quota, so effective limit is N × maxRequests, not maxRequests.
// Acceptable for a single-developer app; replace with Redis for stronger guarantees.
export const rateLimited = createRateLimiter()
