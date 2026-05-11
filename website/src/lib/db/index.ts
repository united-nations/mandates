/**
 * Database Connection Pool for Azure Postgres
 *
 * Uses globalThis to survive hot-module replacement in development,
 * ensuring a single Pool instance is reused across HMR cycles.
 */

import { Pool } from 'pg'

// Persist pool across Next.js HMR reloads in development
const globalForDb = globalThis as unknown as { _pgPool?: Pool }

export const getPool = (): Pool => {
  if (!globalForDb._pgPool) {
    globalForDb._pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
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
