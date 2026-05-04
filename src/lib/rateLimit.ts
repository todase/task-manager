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

// Shared singleton — per-process (resets on cold start)
export const rateLimited = createRateLimiter()
