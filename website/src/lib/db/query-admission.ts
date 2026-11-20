import type { Pool } from 'pg'

/** Limit pending work when database connections are busy. */
export const MAX_DATABASE_WAITERS = 30
const runtime = globalThis as typeof globalThis & {
  _databaseAdmissionRejections?: number
}

export function assertQueryCapacity(pool: Pick<Pool, 'waitingCount'>): void {
  if (pool.waitingCount < MAX_DATABASE_WAITERS) return
  runtime._databaseAdmissionRejections =
    (runtime._databaseAdmissionRejections ?? 0) + 1
  throw new Error('Database wait queue is full')
}

export function takeAdmissionRejections(): number {
  const count = runtime._databaseAdmissionRejections ?? 0
  runtime._databaseAdmissionRejections = 0
  return count
}
