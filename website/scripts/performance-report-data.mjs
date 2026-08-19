const round = (value, places = 2) => Number(value.toFixed(places))

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

const range = (runs) =>
  `${round(Math.min(...runs.map((run) => run.wallMs)) / 1000)}–${round(Math.max(...runs.map((run) => run.wallMs)) / 1000)}`

const queryCount = (successful, off) =>
  median(
    (successful.length ? successful : off).map(
      (run) => run.querySummary.queryCount
    )
  )

const warmStatus = (warm) => {
  if (warm.error) return 'timeout'
  return warm.warmupError ? 'partial' : 'ready'
}

const scenarioRow = (result, id) => {
  const off = result.runs.filter(
    (run) => run.scenario === id && run.mode === 'off'
  )
  const successful = off.filter((run) => run.artifact)
  const samples = successful.length ? successful : off
  const warm = result.runs.find(
    (run) => run.scenario === id && run.mode === 'warm'
  )
  return {
    failures: off.length - successful.length,
    latency_s: round(median(samples.map((run) => run.wallMs)) / 1000),
    query_count: queryCount(successful, off),
    range_s: range(samples),
    scenario: id,
    success_rate: `${successful.length}/${off.length}`,
    warm_s: round(warm.wallMs / 1000, 3),
    warm_status: warmStatus(warm),
  }
}

export const scenarioRows = (result) =>
  result.scenarios
    .map(({ id }) => scenarioRow(result, id))
    .sort((a, b) => b.latency_s - a.latency_s)

const planSignals = {
  'mandates.list': 'Resolution-series scan repeated 253×; 6.0M buffer hits',
  'mandates.budget-hierarchy':
    'Fast alone; collapses under 15-query concurrency',
  'mandates.organ-counts':
    '42.8k citation-index probes; 44.3k materialize loops',
  'mandates.subject-hierarchy': '220k rows vs 1.8k estimated; 23MB disk sort',
  'mandates.filtered-aggregates': '222k rows vs 2.1k estimated; repeated 4×',
  'mandates.list-grouped':
    '58.5k temp blocks read through window/sort pipeline',
}

export const planRows = (plans) =>
  plans.plans.map((item) => ({
    benchmark_median_s: round(item.medianMs / 1000),
    caller: item.caller,
    isolated_explain_s: round(item.plan['Execution Time'] / 1000),
    observed_timeouts: item.errors,
    signal: planSignals[item.caller],
  }))

const sqlValue = (value) => {
  if (typeof value === 'number') return String(value)
  return `'${String(value).replaceAll("'", "''")}'`
}

export const valuesSql = (rows, fields) => {
  const values = rows
    .map((row) => `(${fields.map((field) => sqlValue(row[field])).join(', ')})`)
    .join(',\n  ')
  return `SELECT *\nFROM (VALUES\n  ${values}\n) AS reviewed(${fields.join(', ')});`
}

export const source = ({ description, id, label, path, sql }) => ({
  id,
  path,
  query: {
    description,
    engine: 'reviewed literal extract',
    language: 'sql',
    sql,
  },
  label,
})
