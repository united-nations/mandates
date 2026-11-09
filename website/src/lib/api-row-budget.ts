/**
 * Per-client daily allowance of API rows and exports, by UTC calendar day.
 * A request reserves the most rows it could deliver and settles to the rows
 * it delivered; an export is charged its full total before it is sent.
 */
import { secondsToNextUtcDay, utcDay } from '#lib/api-rate-limit'
import { EXPORTS_PER_DAY, ROW_BUDGET_PER_DAY } from '#lib/api-limits'

export type BudgetRefusal = {
  allowed: false
  rule: 'row_budget' | 'export_allowance'
  /** Rows (or exports) still available today. */
  remaining: number
  retryAfterSeconds: number
}

export type RowReservation = {
  allowed: true
  /** Record what was actually delivered; later calls have no effect. */
  settle: (delivered: number) => void
}

interface DayCounts {
  rows: number
  exports: number
}

export function createDailyBudget(limits: { rows: number; exports: number }) {
  let day = ''
  let clients = new Map<string, DayCounts>()

  function counts(key: string, now: number): DayCounts {
    const today = utcDay(now)
    if (today !== day) {
      day = today
      clients = new Map()
    }
    let entry = clients.get(key)
    if (!entry) {
      entry = { rows: 0, exports: 0 }
      clients.set(key, entry)
    }
    return entry
  }

  function exportAllowed(
    key: string,
    now: number
  ): { allowed: true } | BudgetRefusal {
    return counts(key, now).exports < limits.exports
      ? { allowed: true }
      : {
          allowed: false,
          rule: 'export_allowance',
          remaining: 0,
          retryAfterSeconds: secondsToNextUtcDay(now),
        }
  }

  const rowRefusal = (entry: DayCounts, now: number): BudgetRefusal => ({
    allowed: false,
    rule: 'row_budget',
    remaining: limits.rows - entry.rows,
    retryAfterSeconds: secondsToNextUtcDay(now),
  })

  return {
    /** Reserve up to `rows` rows for a search page or a single document. */
    reserveRows(
      key: string,
      rows: number,
      now: number
    ): RowReservation | BudgetRefusal {
      const entry = counts(key, now)
      if (entry.rows + rows > limits.rows) return rowRefusal(entry, now)
      entry.rows += rows
      let settled = false
      return {
        allowed: true,
        settle(delivered: number) {
          if (settled) return
          settled = true
          entry.rows -= rows - delivered
        },
      }
    },
    /** Whether the client has an export left today; nothing is counted. */
    exportAllowed,
    /** Count one export of `total` rows, or refuse it whole. */
    chargeExport(
      key: string,
      total: number,
      now: number
    ): { allowed: true } | BudgetRefusal {
      const allowed = exportAllowed(key, now)
      if (!allowed.allowed) return allowed
      const entry = counts(key, now)
      if (entry.rows + total > limits.rows) return rowRefusal(entry, now)
      entry.rows += total
      entry.exports++
      return { allowed: true }
    },
    /** Entries currently held; for tests. */
    size: () => clients.size,
  }
}

const SHARED = Symbol.for('mandates.apiDailyBudget')

/** Shared across route handlers. */
export function apiDailyBudget(): ReturnType<typeof createDailyBudget> {
  const store = globalThis as unknown as Record<
    symbol,
    ReturnType<typeof createDailyBudget> | undefined
  >
  return (store[SHARED] ??= createDailyBudget({
    rows: ROW_BUDGET_PER_DAY,
    exports: EXPORTS_PER_DAY,
  }))
}
