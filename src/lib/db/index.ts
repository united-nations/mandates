/**
 * Database Connection Pool for Azure Postgres
 */

import { Pool } from 'pg'

let pool: Pool | null = null

export const getPool = (): Pool => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : undefined,
      max: 20,
    })

    pool.on('error', (err) => {
      console.error('Database pool error:', err)
    })
  }

  return pool
}

export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end()
    pool = null
  }
}

export default getPool
export type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg'
