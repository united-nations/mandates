import { readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import pg from 'pg'

const INPUT =
  process.env.PERFORMANCE_INPUT ??
  join(tmpdir(), 'mandates-performance-inventory.json')
const OUTPUT =
  process.env.PERFORMANCE_EXPLAIN_OUTPUT ??
  join(tmpdir(), 'mandates-performance-query-plans.json')
const LIMIT = Number(process.env.PERFORMANCE_EXPLAIN_LIMIT ?? 6)

const assertReadOnly = (sql) => {
  const stripped = sql.replace(/^\s*\/\*[\s\S]*?\*\//, '').trim()
  if (!/^(SELECT|WITH)\b/i.test(stripped))
    throw new Error('Refusing to explain a non-read-only query')
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const collectFingerprints = (result) => {
  const fingerprints = new Map()
  for (const run of result.runs.filter((item) => item.mode === 'off')) {
    for (const query of run.trace?.queries ?? []) {
      const item = fingerprints.get(query.fingerprint) ?? {
        caller: query.caller,
        errors: 0,
        fingerprint: query.fingerprint,
        params: query.params,
        scenario: run.scenario,
        values: [],
      }
      item.errors += query.error ? 1 : 0
      item.values.push(query.executionMs)
      fingerprints.set(query.fingerprint, item)
    }
  }
  return fingerprints
}

const selectQueries = (result) => {
  const ranked = [...collectFingerprints(result).values()]
    .map((item) => ({ ...item, medianMs: median(item.values) }))
    .sort((a, b) => b.medianMs - a.medianMs)
  const callers = new Set()
  return ranked
    .filter((item) => {
      if (callers.has(item.caller)) return false
      callers.add(item.caller)
      return true
    })
    .slice(0, LIMIT)
}

const explain = async (client, result, selected) => {
  const sql = result.queries[selected.fingerprint].sql
  assertReadOnly(sql)
  const startedAt = performance.now()
  try {
    const response = await client.query(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`,
      selected.params
    )
    return {
      ...selected,
      explainWallMs: performance.now() - startedAt,
      plan: response.rows[0]['QUERY PLAN'][0],
    }
  } catch (error) {
    return {
      ...selected,
      error: error instanceof Error ? error.message : String(error),
      explainWallMs: performance.now() - startedAt,
    }
  }
}

const main = async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
  const result = JSON.parse(await readFile(INPUT, 'utf8'))
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    query_timeout: 125_000,
    statement_timeout: 120_000,
  })
  await client.connect()
  await client.query('BEGIN TRANSACTION READ ONLY')
  const plans = []
  try {
    for (const selected of selectQueries(result)) {
      const plan = await explain(client, result, selected)
      plans.push(plan)
      process.stdout.write(
        `${selected.caller}: ${Math.round(plan.explainWallMs)} ms${plan.error ? ` ERROR ${plan.error}` : ''}\n`
      )
    }
  } finally {
    await client.query('ROLLBACK')
    await client.end()
  }
  await writeFile(
    OUTPUT,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), plans }, null, 2)}\n`
  )
}

await main()
