import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { evaluatePerformanceAcceptance } from '../src/lib/perf/acceptance.ts'

const path =
  process.argv[2] ?? join(tmpdir(), 'mandates-performance-inventory.json')
const result = JSON.parse(await readFile(path, 'utf8'))
const issues = []

const verifyRunCounts = () => {
  for (const { id } of result.scenarios) {
    const runs = result.runs.filter((run) => run.scenario === id)
    const off = runs.filter((run) => run.mode === 'off').length
    const warm = runs.filter((run) => run.mode === 'warm').length
    if (off !== result.iterations || warm !== 1)
      issues.push(
        `${id}: expected ${result.iterations}+1 runs, got ${off}+${warm}`
      )
  }
}

const verifyQueryAccounting = () => {
  for (const run of result.runs) {
    if (!run.trace) continue
    if (run.querySummary.queryCount !== run.trace.queries.length)
      issues.push(`${run.scenario}/${run.iteration}: query count mismatch`)
    for (const query of run.trace.queries) {
      if (!result.queries[query.fingerprint])
        issues.push(`${run.scenario}: missing SQL ${query.fingerprint}`)
      if (query.caller === 'unknown')
        issues.push(`${run.scenario}: unknown query`)
    }
  }
}

const verifyArtifacts = () => {
  for (const { id } of result.scenarios) {
    const digests = new Set(
      result.runs
        .filter((run) => run.scenario === id && run.artifact)
        .map((run) => run.artifact.digest)
    )
    if (digests.size > 1) issues.push(`${id}: artifact digest mismatch`)
  }
}

verifyRunCounts()
verifyQueryAccounting()
verifyArtifacts()

const failures = result.runs.filter((run) => run.error)
const failedScenarios = new Set(failures.map((run) => run.scenario))
const integrity = issues.length === 0 ? 'PASS' : 'FAIL'
const performance = failures.length === 0 ? 'PASS' : 'FAIL'

process.stdout.write(
  `${integrity} inventory — ${result.runs.length}/${result.runs.length} runs accounted; ` +
    `${issues.length} integrity errors. ${performance} performance — ` +
    `${failures.length} request failures across ${failedScenarios.size} scenarios.\n`
)
if (issues.length) {
  process.stdout.write(`${issues.join('\n')}\n`)
  process.exitCode = 1
}

const acceptance = evaluatePerformanceAcceptance(result)
process.stdout.write(
  `${acceptance.passed ? 'PASS' : 'FAIL'} acceptance` +
    `${acceptance.failures.length ? ` — ${acceptance.failures.join('; ')}` : ' — all criteria fulfilled'}.\n`
)
if (!acceptance.passed) process.exitCode = 1
