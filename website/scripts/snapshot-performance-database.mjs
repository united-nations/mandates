import { readFile, writeFile } from 'node:fs/promises'

import pg from 'pg'

const SQL_PATH = '../docs/performance-database-snapshot.sql'
const OUTPUT_PATH = '../docs/performance-database-snapshot.json'

const main = async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
  const sql = await readFile(SQL_PATH, 'utf8')
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    query_timeout: 30_000,
  })
  await client.connect()
  await client.query('BEGIN TRANSACTION READ ONLY')
  try {
    const result = await client.query(sql)
    await writeFile(
      OUTPUT_PATH,
      `${JSON.stringify({ capturedAt: new Date().toISOString(), ...result.rows[0] }, null, 2)}\n`
    )
  } finally {
    await client.query('ROLLBACK')
    await client.end()
  }
}

await main()
