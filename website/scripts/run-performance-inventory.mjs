import { writeFile } from 'node:fs/promises'

import { PERFORMANCE_SCENARIOS } from './performance-scenarios.mjs'

const BASE_URL = process.env.PERFORMANCE_BASE_URL ?? 'http://127.0.0.1:3100'
const ITERATIONS = Number(process.env.PERFORMANCE_ITERATIONS ?? 7)
const OUTPUT =
  process.env.PERFORMANCE_OUTPUT ?? '../docs/performance-inventory-data.json'
const SELECTED_IDS = new Set(
  (process.env.PERFORMANCE_SCENARIO_IDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
)
const SCENARIOS = SELECTED_IDS.size
  ? PERFORMANCE_SCENARIOS.filter((scenario) => SELECTED_IDS.has(scenario.id))
  : PERFORMANCE_SCENARIOS
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

const runMetadata = (scenario, mode, iteration, wallMs) => ({
  iteration,
  mode,
  scenario: scenario.id,
  wallMs,
})

const collectQueries = (queries) => {
  for (const query of queries) {
    if (queryCatalog.has(query.fingerprint)) continue
    queryCatalog.set(query.fingerprint, {
      caller: query.caller,
      sql: query.sql,
    })
  }
}

const compactQuery = (query) => {
  const compact = { ...query }
  delete compact.sql
  return compact
}

const compactResult = (result, run) => {
  collectQueries(result.trace.queries)
  const outcome = result.error
    ? { error: result.error }
    : { artifact: result.artifact }
  return {
    ...run,
    ...outcome,
    querySummary: result.querySummary,
    trace: {
      durationMs: result.trace.durationMs,
      queries: result.trace.queries.map(compactQuery),
      spans: result.trace.spans,
    },
  }
}

const performAttempt = async ({ id, iteration, mode, scenario, startedAt }) => {
  const pageResponse = await fetch(buildUrl(scenario, mode, id))
  await pageResponse.arrayBuffer()
  const wallMs = performance.now() - startedAt
  if (!pageResponse.ok)
    throw new Error(`Benchmark page returned ${pageResponse.status}`)
  const resultUrl = `${BASE_URL}/api/performance/result/${id}`
  const result = await fetchOk(resultUrl).then((response) => response.json())
  return compactResult(result, runMetadata(scenario, mode, iteration, wallMs))
}

const runOnce = async (scenario, mode, iteration) => {
  const context = {
    id: `${scenario.id}-${mode}-${iteration}-${Date.now()}`,
    iteration,
    mode,
    scenario,
    startedAt: performance.now(),
  }
  try {
    return await performAttempt(context)
  } catch (error) {
    const wallMs = performance.now() - context.startedAt
    return {
      ...runMetadata(scenario, mode, iteration, wallMs),
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

const successful = (runs) => runs.filter((run) => run.artifact)

const scenarioArtifactsMatch = (runs) => {
  const completed = successful(runs)
  const digests = new Set(completed.map((run) => run.artifact.digest))
  return completed.length > 0 && digests.size === 1
}

const progress = (run) =>
  run.error ? `ERROR ${run.error}` : `${Math.round(run.wallMs)} ms`

const runScenario = async (scenario) => {
  const runs = []
  for (let iteration = 1; iteration <= ITERATIONS; iteration++) {
    const run = await runOnce(scenario, 'off', iteration)
    runs.push(run)
    process.stdout.write(
      `${scenario.id} ${iteration}/${ITERATIONS}: ${progress(run)}\n`
    )
  }
  const warmup = await runOnce(scenario, 'warm', 0)
  const warm = await runOnce(scenario, 'warm', 1)
  if (warmup.error) warm.warmupError = warmup.error
  runs.push(warm)
  return runs
}

const verdict = (runs) => {
  const queries = runs.flatMap((run) => run.trace?.queries ?? [])
  const scenarios = SCENARIOS.map((scenario) =>
    runs.filter((run) => run.scenario === scenario.id)
  )
  return {
    artifactsMatch: scenarios.every(scenarioArtifactsMatch),
    queryErrors: queries.filter((query) => query.error).length,
    requestErrors: runs.filter((run) => run.error).length,
    totalRuns: runs.length,
    unknownQueries: queries.filter((query) => query.caller === 'unknown')
      .length,
    warmupErrors: runs.filter((run) => run.warmupError).length,
  }
}

const buildOutput = (runs) => ({
  generatedAt: new Date().toISOString(),
  iterations: ITERATIONS,
  queries: Object.fromEntries(queryCatalog),
  runs,
  scenarios: SCENARIOS,
  verdict: verdict(runs),
})

const writeOutput = async (runs) => {
  const output = buildOutput(runs)
  await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`)
  return output
}

const main = async () => {
  const runs = []
  for (const scenario of SCENARIOS) {
    runs.push(...(await runScenario(scenario)))
    await writeOutput(runs)
  }
  const output = await writeOutput(runs)
  process.stdout.write(`Wrote ${OUTPUT}\n${JSON.stringify(output.verdict)}\n`)
}

await main()
