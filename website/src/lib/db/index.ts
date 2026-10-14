/**
 * Database Connection Pool for Azure Postgres
 *
 * Uses globalThis to survive hot-module replacement in development,
 * ensuring a single Pool instance is reused across HMR cycles.
 */

import { Pool } from 'pg'
import { verifiedDatabaseUrl } from '#lib/db/connection-options'

// Persist pool across Next.js HMR reloads in development
const globalForDb = globalThis as unknown as { _pgPool?: Pool }

export const getPool = (): Pool => {
  if (!globalForDb._pgPool) {
    globalForDb._pgPool = new Pool({
      connectionString: verifiedDatabaseUrl(process.env.DATABASE_URL),
      // Each explorer load fires ~16 queries concurrently; with max:5 the
      // fast ones starved for seconds behind the slow ones. Overridable via
      // env so total connections (instances × max) can be tuned to the
      // Azure Postgres tier's connection limit.
      max: Number(process.env.DATABASE_POOL_MAX) || 15,

      // Three timeouts, because without them a slow database does not surface
      // as an error — it surfaces as a page that loads forever.
      //
      // An explorer render fans out ~30 queries over `max` slots, so the pool
      // is the choke point: once every slot is held by a slow query, every
      // later request queues behind them. `pg` waits for a slot indefinitely
      // by default, so that queue never drains and nothing ever renders. It is
      // exactly the failure we hit — 15 queries wedged for up to 17 minutes
      // while the site hung, locally and deployed, until they drained on their
      // own. Failing loudly after a bounded wait is strictly better than a
      // request that hangs past every upstream timeout.
      //
      // Both timeouts are client-side on purpose. The server-side equivalent
      // (`statement_timeout` in the pool config) cannot be used here: this
      // database is reached through Azure's built-in PgBouncer, which rejects
      // it as an unsupported startup parameter and fails every connection.
      // query_timeout gives the same protection where it matters — the query
      // is aborted and its connection dropped, so the pool slot is released
      // instead of being held by something that will never return.
      query_timeout: Number(process.env.DATABASE_QUERY_TIMEOUT_MS) || 30_000,
      // Cap the wait for a free pool slot. This is what converts "loading
      // forever" into a 503 the caller can see and report.
      connectionTimeoutMillis:
        Number(process.env.DATABASE_CONNECTION_TIMEOUT_MS) || 15_000,
    })

    globalForDb._pgPool.on('error', (err) => {
      console.error('Database pool error:', err)
    })
  }

  return globalForDb._pgPool
}

export const closePool = async (): Promise<void> => {
  if (globalForDb._pgPool) {
    await globalForDb._pgPool.end()
    globalForDb._pgPool = undefined
  }
}

export default getPool
export type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg'
