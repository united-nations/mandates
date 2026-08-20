/**
 * @file Performance acceptance evaluator
 * @description Scores benchmark output against the agreed measurable bar.
 *
 * Key exports:
 * - evaluatePerformanceAcceptance() - Returns a machine-readable verdict.
 */

interface AcceptanceRun {
  artifact?: { digest: string }
  error?: string
  mode: string
  querySummary: { queryCount: number }
  scenario: string
  trace?: { queries: Array<{ error?: string }> }
  wallMs: number
}

interface AcceptanceInput {
  runs: AcceptanceRun[]
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

const digestDrift = (runs: AcceptanceRun[]): boolean => {
  const byScenario = new Map<string, Set<string>>()
  for (const run of runs) {
    if (!run.artifact) continue
    const digests = byScenario.get(run.scenario) ?? new Set<string>()
    digests.add(run.artifact.digest)
    byScenario.set(run.scenario, digests)
  }
  return [...byScenario.values()].some((digests) => digests.size > 1)
}

const defaultRuns = (runs: AcceptanceRun[], mode: string) =>
  runs.filter((run) => run.scenario === 'default' && run.mode === mode)

/** Scores timeouts, default latency, warm latency, fan-out, and digests. */
export const evaluatePerformanceAcceptance = (input: AcceptanceInput) => {
  const failures: string[] = []
  const cold = defaultRuns(input.runs, 'off')
  const warm = defaultRuns(input.runs, 'warm')
  if (input.runs.some((run) => run.error)) failures.push('request failures')
  if (input.runs.some((run) => run.trace?.queries.some((query) => query.error)))
    failures.push('query failures')
  if (!cold.length || median(cold.map((run) => run.wallMs)) >= 2000)
    failures.push('default p50 >= 2000ms')
  if (!warm.length || median(warm.map((run) => run.wallMs)) >= 100)
    failures.push('warm p50 >= 100ms')
  if (
    !cold.length ||
    median(cold.map((run) => run.querySummary.queryCount)) > 8
  )
    failures.push('default SQL count > 8')
  if (digestDrift(input.runs)) failures.push('artifact digest mismatch')
  return { failures, passed: failures.length === 0 }
}
