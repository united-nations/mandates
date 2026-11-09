/**
 * Request counting per client: a rolling window and a UTC-calendar-day
 * total. Only admitted requests are counted.
 */

export type RateRule =
  'rate_per_minute' | 'rate_per_day' | 'page_per_hour' | 'page_per_day'

export type RateVerdict =
  | { allowed: true }
  | {
      allowed: false
      rule: RateRule
      limit: number
      retryAfterSeconds: number
    }

interface ClientCounts {
  /** Admission times inside the rolling window, oldest first. */
  recent: number[]
  /** UTC day (YYYY-MM-DD) that `dayCount` belongs to. */
  day: string
  dayCount: number
}

export const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)

export function secondsToNextUtcDay(ms: number): number {
  const date = new Date(ms)
  const next = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + 1
  )
  return Math.ceil((next - ms) / 1000)
}

export function createRateLimiter(limits: {
  window: { ms: number; limit: number; rule: RateRule }
  day: { limit: number; rule: RateRule }
}) {
  const { window, day } = limits
  const clients = new Map<string, ClientCounts>()
  let lastPrune = -Infinity

  function prune(now: number) {
    if (now - lastPrune < window.ms) return
    lastPrune = now
    const today = utcDay(now)
    for (const [key, counts] of clients) {
      const newest = counts.recent.at(-1)
      if (
        counts.day !== today &&
        (newest === undefined || now - newest >= window.ms)
      )
        clients.delete(key)
    }
  }

  return {
    /** Decide one request; an admitted request is counted. */
    check(key: string, now: number): RateVerdict {
      prune(now)
      const today = utcDay(now)
      let counts = clients.get(key)
      if (!counts) {
        counts = { recent: [], day: today, dayCount: 0 }
        clients.set(key, counts)
      }
      if (counts.day !== today) {
        counts.day = today
        counts.dayCount = 0
      }
      counts.recent = counts.recent.filter((time) => now - time < window.ms)
      if (counts.dayCount >= day.limit)
        return {
          allowed: false,
          rule: day.rule,
          limit: day.limit,
          retryAfterSeconds: secondsToNextUtcDay(now),
        }
      if (counts.recent.length >= window.limit)
        return {
          allowed: false,
          rule: window.rule,
          limit: window.limit,
          retryAfterSeconds: Math.ceil(
            (counts.recent[0] + window.ms - now) / 1000
          ),
        }
      counts.recent.push(now)
      counts.dayCount++
      return { allowed: true }
    },
    /** Entries currently held; for tests. */
    size: () => clients.size,
  }
}
