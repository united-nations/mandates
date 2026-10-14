/** Shared limits for URL controls and database readers. */
export const MAX_PAGE_SIZE = 100
export const MAX_PAGE_OFFSET = 100_000

const positiveInteger = (value: unknown, fallback: number): number => {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback
  if (!/^\d+$/.test(String(value))) return fallback
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function normalizePagination(page?: unknown, limit?: unknown) {
  const size = Math.min(positiveInteger(limit, 15), MAX_PAGE_SIZE)
  return {
    page: Math.min(
      positiveInteger(page, 1),
      Math.floor(MAX_PAGE_OFFSET / size) + 1
    ),
    limit: size,
  }
}
