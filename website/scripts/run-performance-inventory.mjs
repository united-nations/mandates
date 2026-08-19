import { writeFile } from 'node:fs/promises'

import { PERFORMANCE_SCENARIOS } from './performance-scenarios.mjs'

const BASE_URL = process.env.PERFORMANCE_BASE_URL ?? 'http://127.0.0.1:3100'
const ITERATIONS = Number(process.env.PERFORMANCE_ITERATIONS ?? 7)
const OUTPUT =
  process.env.PERFORMANCE_OUTPUT ?? '../docs/performance-inventory-data.json'
const queryCatalog = new Map()

const buildUrl = (scenario, mode, id) => {
  const url = new URL(scenario.path, BASE_URL)
  for (const [key, value] of Object.entries(scenario.query))
    url.searchParams.set(key, value)
  url.searchParams.set('cache', mode === 'warm' ? 'on' : 'off')
  url.searchParams.set('run', id)
  return url
}

const fetchOk = async (url) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  return response
}

const collectQueries = (queries) => {
  for (const query of queries) {
    if (queryCatalog.has(query.fingerprint)) continue
    queryCatalog.set(query.fingerprint, {
      caller: query.caller,
      sql: query.sql,
    })
  }
}

const compactQuery = ({ sql: _sql, ...query }) => query

const compactResult = (result, run) => {
  collectQueries(result.trace.queries)
  return {
    ...run,
    artifact: result.artifact,
    querySummary: result.querySummary,
    trace: {
      durationMs: result.trace.durationMs,
      queries: result.trace.queries.map(compactQuery),
      spans: result.trace.spans,
    },
  }
}

const runOnce = async (scenario, mode, iteration) => {
  const id = `${scenario.id}-${mode}-${iteration}-${Date.now()}`
  const startedAt = performance.now()
  await fetchOk(buildUrl(scenario, mode, id))
  const wallMs = performance.now() - startedAt
  const result = await fetchOk(`${BASE_URL}/api/performance/result/${id}`).then(
    (r) => r.json()
  )
  return compactResult(result, {
    iteration,
    mode,
    scenario: scenario.id,
    wallMs,
  })
}

const verifyScenario = (runs) => {
  const digests = new Set(runs.map((run) => run.artifact.digest))
  if (digests.size !== 1)
    throw new Error(`Output mismatch: ${runs[0].scenario}`)
}

const runScenario = async (scenario) => {
  const runs = []
  for (let iteration = 1; iteration <= ITERATIONS; iteration++) {
    const run = await runOnce(scenario, 'off', iteration)
    runs.push(run)
    process.stdout.write(
      `${scenario.id} ${iteration}/${ITERATIONS}: ${Math.round(run.wallMs)} ms\n`
    )
  }
  await runOnce(scenario, 'warm', 0)
  runs.push(await runOnce(scenario, 'warm', 1))
  verifyScenario(runs)
  return runs
}

const verdict = (runs) => {
  const queries = runs.flatMap((run) => run.trace.queries)
  return {
    artifactsMatch: true,
    queryErrors: queries.filter((query) => query.error).length,
    totalRuns: runs.length,
    unknownQueries: queries.filter((query) => query.caller === 'unknown')
      .length,
  }
}

const main = async () => {
  const runs = []
  for (const scenario of PERFORMANCE_SCENARIOS)
    runs.push(...(await runScenario(scenario)))
  const output = {
    generatedAt: new Date().toISOString(),
    iterations: ITERATIONS,
    queries: Object.fromEntries(queryCatalog),
    runs,
    scenarios: PERFORMANCE_SCENARIOS,
    verdict: verdict(runs),
  }
  await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`)
  process.stdout.write(`Wrote ${OUTPUT}\n${JSON.stringify(output.verdict)}\n`)
}

await main()
