import { readFile, writeFile } from 'node:fs/promises'

import {
  reportBlocks,
  tableDefinitions,
} from './performance-report-content.mjs'
import {
  planRows,
  scenarioRows,
  source,
  valuesSql,
} from './performance-report-data.mjs'

const DOCS = '../docs'
const readJson = async (name) =>
  JSON.parse(await readFile(`${DOCS}/${name}`, 'utf8'))

const scenarioSource = (sql) =>
  source({
    description:
      'Deterministic relational extract of reviewed HTTP benchmark rows.',
    id: 'scenario_extract',
    label: 'Benchmark scenario extract',
    path: 'docs/performance-inventory-data.json',
    sql,
  })

const planSource = (sql) =>
  source({
    description:
      'Deterministic relational extract of reviewed query-plan findings.',
    id: 'plan_extract',
    label: 'Query-plan extract',
    path: 'docs/performance-query-plans.json',
    sql,
  })

const databaseSource = (sql) =>
  source({
    description:
      'Read-only population counts used to define the benchmark scope.',
    id: 'database_snapshot',
    label: 'Database population snapshot',
    path: 'docs/performance-database-snapshot.sql',
    sql,
  })

const sourceList = (scenarioSql, planSql, databaseSql) => [
  scenarioSource(scenarioSql),
  planSource(planSql),
  databaseSource(databaseSql),
  {
    id: 'first_pass',
    label: 'Cold first-pass matrix',
    path: 'docs/performance-inventory-first-pass.json',
  },
  {
    id: 'benchmark_harness',
    label: 'Performance benchmark harness',
    path: 'website/scripts/run-performance-inventory.mjs',
  },
]

const scenarioSql = (rows) =>
  valuesSql(rows, [
    'scenario',
    'latency_s',
    'range_s',
    'success_rate',
    'failures',
    'query_count',
    'warm_s',
    'warm_status',
  ])

const planSql = (rows) =>
  valuesSql(rows, [
    'caller',
    'benchmark_median_s',
    'isolated_explain_s',
    'observed_timeouts',
    'signal',
  ])

const latencyChart = {
  dataset: 'scenario_latency',
  encodings: {
    tooltip: [
      {
        field: 'success_rate',
        label: 'Successful attempts',
        type: 'nominal',
      },
      {
        field: 'warm_s',
        format: 'number',
        label: 'Warm request (s)',
        type: 'quantitative',
      },
    ],
    x: {
      field: 'scenario',
      label: 'Scenario',
      type: 'nominal',
    },
    y: {
      field: 'latency_s',
      label: 'Median wall time (s)',
      type: 'quantitative',
    },
  },
  id: 'latency_chart',
  sourceId: 'scenario_extract',
  subtitle:
    'Seven app-cache-bypassed attempts; timeout bars are lower bounds at 30s.',
  title: 'Uncached request latency by scenario',
  type: 'bar',
  valueFormat: 'number',
}

const manifest = (result, counts, sources) => ({
  blocks: reportBlocks(counts),
  charts: [latencyChart],
  description:
    'Measured server and SQL performance after expanding the default document catalogue.',
  generatedAt: result.generatedAt,
  sources: sources.map(({ id, label, path }) => ({ id, label, path })),
  surface: 'report',
  tables: tableDefinitions,
  title: 'Performance inventory: 40k-document Secretariat view',
  version: 1,
})

const snapshot = (result, scenarios, queryPlans) => ({
  datasets: { query_plans: queryPlans, scenario_latency: scenarios },
  generatedAt: result.generatedAt,
  status: 'ready',
  version: 1,
})

const buildArtifact = ({ counts, databaseSql, plans, result }) => {
  const scenarios = scenarioRows(result)
  const queryPlans = planRows(plans)
  const sources = sourceList(
    scenarioSql(scenarios),
    planSql(queryPlans),
    databaseSql
  )
  return {
    surface: 'report',
    manifest: manifest(result, counts, sources),
    snapshot: snapshot(result, scenarios, queryPlans),
    sources,
  }
}

const main = async () => {
  const [result, plans, counts, databaseSql] = await Promise.all([
    readJson('performance-inventory-data.json'),
    readJson('performance-query-plans.json'),
    readJson('performance-database-snapshot.json'),
    readFile(`${DOCS}/performance-database-snapshot.sql`, 'utf8'),
  ])
  const artifact = buildArtifact({ counts, databaseSql, plans, result })
  await writeFile(
    `${DOCS}/performance-inventory-artifact.json`,
    `${JSON.stringify(artifact, null, 2)}\n`
  )
}

await main()
