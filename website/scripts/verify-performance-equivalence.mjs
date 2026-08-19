import { readFile, writeFile } from 'node:fs/promises'

import { PERFORMANCE_SCENARIOS } from './performance-scenarios.mjs'

const BASE_URL = process.env.PERFORMANCE_BASE_URL ?? 'http://localhost:3100'
const BASELINE =
  process.env.PERFORMANCE_BASELINE ?? '../docs/performance-inventory-data.json'
const CURRENT =
  process.env.PERFORMANCE_CURRENT ?? '../docs/performance-optimized-data.json'
const EAGER_REFERENCE =
  process.env.PERFORMANCE_EAGER_REFERENCE ??
  '../docs/performance-eager-reference.json'
const OUTPUT =
  process.env.PERFORMANCE_EQUIVALENCE_OUTPUT ??
  '../docs/performance-equivalence.json'

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))

const digestFor = (result, scenario) =>
  result.runs.find((run) => run.scenario === scenario && run.artifact)?.artifact
    .digest

const artifactUrl = (scenario) => {
  const url = new URL('/api/performance/secretariat-artifact', BASE_URL)
  for (const [key, value] of Object.entries(scenario.query))
    url.searchParams.set(key, value)
  return url
}

const fetchDigest = async (scenario) => {
  const response = await fetch(artifactUrl(scenario))
  if (!response.ok) throw new Error(`${scenario.id}: HTTP ${response.status}`)
  return response.json().then((body) => body.artifact.digest)
}

const compareScenario = async ({ baseline, current, eager, scenario }) => {
  const expected =
    digestFor(baseline, scenario.id) ?? eager.scenarios[scenario.id]
  const actual =
    scenario.id === 'mandate-detail'
      ? digestFor(current, scenario.id)
      : await fetchDigest(scenario)
  return { actual, expected, id: scenario.id, matches: actual === expected }
}

const main = async () => {
  const [baseline, current, eager] = await Promise.all([
    readJson(BASELINE),
    readJson(CURRENT),
    readJson(EAGER_REFERENCE),
  ])
  const comparisons = []
  for (const scenario of PERFORMANCE_SCENARIOS)
    comparisons.push(
      await compareScenario({ baseline, current, eager, scenario })
    )
  const mismatches = comparisons.filter((item) => !item.matches)
  const result = { comparisons, mismatches: mismatches.map((item) => item.id) }
  await writeFile(OUTPUT, `${JSON.stringify(result, null, 2)}\n`)
  process.stdout.write(
    `${mismatches.length ? 'FAIL' : 'PASS'} equivalence — ${comparisons.length - mismatches.length}/${comparisons.length} scenario digests match.\n`
  )
  if (mismatches.length) process.exitCode = 1
}

await main()
