import { readFile, writeFile } from 'node:fs/promises'

const [basePath, outputPath, archivePath, ...overridePaths] =
  process.argv.slice(2)

if (!basePath || !outputPath || !archivePath || overridePaths.length === 0)
  throw new Error(
    'Usage: merge-performance-inventory BASE OUTPUT ARCHIVE OVERRIDE...'
  )

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))

const scenarioIds = (result) => new Set(result.scenarios.map(({ id }) => id))

const mergeRuns = (base, overrides) => {
  const replaced = new Set(overrides.flatMap((item) => [...scenarioIds(item)]))
  return [
    ...base.runs.filter((run) => !replaced.has(run.scenario)),
    ...overrides.flatMap((item) => item.runs),
  ]
}

const usedFingerprints = (runs) =>
  new Set(
    runs.flatMap(
      (run) => run.trace?.queries.map((query) => query.fingerprint) ?? []
    )
  )

const mergeQueries = (runs, inputs) => {
  const catalog = Object.assign({}, ...inputs.map((input) => input.queries))
  return Object.fromEntries(
    [...usedFingerprints(runs)].map((fingerprint) => [
      fingerprint,
      catalog[fingerprint],
    ])
  )
}

const artifactStatus = (runs, scenarios) => {
  const mismatches = []
  const missing = []
  for (const { id } of scenarios) {
    const digests = new Set(
      runs
        .filter((run) => run.scenario === id && run.artifact)
        .map((run) => run.artifact.digest)
    )
    if (digests.size === 0) missing.push(id)
    else if (digests.size > 1) mismatches.push(id)
  }
  return { mismatches, missing }
}

const buildVerdict = (runs, scenarios) => {
  const queries = runs.flatMap((run) => run.trace?.queries ?? [])
  const artifacts = artifactStatus(runs, scenarios)
  return {
    artifactMismatches: artifacts.mismatches,
    artifactsMatch: artifacts.mismatches.length === 0,
    queryErrors: queries.filter((query) => query.error).length,
    requestErrors: runs.filter((run) => run.error).length,
    scenariosWithoutArtifact: artifacts.missing,
    totalRuns: runs.length,
    unknownQueries: queries.filter((query) => query.caller === 'unknown')
      .length,
    warmupErrors: runs.filter((run) => run.warmupError).length,
  }
}

const main = async () => {
  const base = await readJson(basePath)
  const overrides = await Promise.all(overridePaths.map(readJson))
  const runs = mergeRuns(base, overrides)
  const output = {
    ...base,
    generatedAt: new Date().toISOString(),
    queries: mergeQueries(runs, [base, ...overrides]),
    runs,
    verdict: buildVerdict(runs, base.scenarios),
  }
  await writeFile(archivePath, `${JSON.stringify(base, null, 2)}\n`)
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`)
  process.stdout.write(`${JSON.stringify(output.verdict)}\n`)
}

await main()
