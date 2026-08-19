export const tableDefinitions = [
  {
    columns: [
      { field: 'scenario', label: 'Scenario', type: 'text' },
      { field: 'latency_s', format: 'number', label: 'Uncached median (s)' },
      { field: 'range_s', label: 'Observed range (s)', type: 'text' },
      { field: 'success_rate', label: 'Successful', type: 'text' },
      { field: 'query_count', format: 'number', label: 'SQL queries' },
      { field: 'warm_s', format: 'number', label: 'Warm request (s)' },
      { field: 'warm_status', label: 'Warm status', type: 'text' },
    ],
    dataset: 'scenario_latency',
    defaultSort: { direction: 'desc', field: 'latency_s' },
    id: 'scenario_table',
    sourceId: 'scenario_extract',
    subtitle:
      'Seven app-cache-bypassed attempts plus one measured warm request.',
    title: 'Scenario measurements',
  },
  {
    columns: [
      { field: 'caller', label: 'Query family', type: 'text' },
      {
        field: 'benchmark_median_s',
        format: 'number',
        label: 'Concurrent median (s)',
      },
      {
        field: 'isolated_explain_s',
        format: 'number',
        label: 'Isolated EXPLAIN (s)',
      },
      {
        field: 'observed_timeouts',
        format: 'number',
        label: 'Timed-out calls',
      },
      { field: 'signal', label: 'Plan signal', type: 'text' },
    ],
    dataset: 'query_plans',
    defaultSort: { direction: 'desc', field: 'benchmark_median_s' },
    id: 'query_table',
    sourceId: 'plan_extract',
    subtitle: 'One highest-median fingerprint per distinct query family.',
    title: 'Worst query families and isolated plans',
  },
]

const openingBlocks = [
  {
    body: '# Performance inventory: 40k-document Secretariat view',
    id: 'title',
    type: 'markdown',
  },
  {
    body: `## Technical summary\n\n**The uncached default request is 9.57s median and fires 15 SQL queries at once.** The formerly default cited-only view is 4.42s, so the broader catalogue is 2.16× slower on the same request path. Document-type and budget-section filters fail all seven uncached attempts at the 30s query limit. Warm application-cache hits are 11–26ms for successful list scenarios, but caching masks rather than removes the cold-path defect.\n\nThe first implementation pass should reduce repeated work before adding indexes: one default request executes the identical filtered aggregate four times and the identical budget hierarchy twice. Then move resolution-series enrichment after pagination; its worst plan scans roughly 38k series rows for each of 253 candidate documents.`,
    id: 'technical_summary',
    type: 'markdown',
  },
  {
    body: '## The 40k default doubles the old critical path—and two facets time out\n\nThe chart ranks end-to-end server request time. It excludes persistent filter-result caches but retains stable reference caches and normal PostgreSQL buffer behavior. Timeout bars are lower bounds, not completed responses.',
    id: 'latency_finding',
    sourceId: 'scenario_extract',
    type: 'markdown',
  },
  { chartId: 'latency_chart', id: 'latency_chart_block', type: 'chart' },
  {
    body: '## Exact scenario results show list controls still recompute the page\n\nPage 2, year sort, and version grouping remain around 9–10s without the persistent dynamic cache. The table preserves the seven-run range, success rate, SQL count, and separately measured warm request. A partial warm status means the warm-up request itself timed out, so that cache result is not a clean full-page hit.',
    id: 'scenario_detail',
    sourceId: 'scenario_extract',
    type: 'markdown',
  },
  { id: 'scenario_table_block', tableId: 'scenario_table', type: 'table' },
  {
    body: '## Page assembly puts the slow cards on the critical path\n\nThe page starts the table promise, then awaits versions, entities, organs, live cards, and baseline cards before it can return any JSX. On the default request, the card span is 9.51s, the baseline span 8.69s, and the table span 8.55s. The table’s Suspense boundary therefore does not make the initial shell appear early: the root component is still waiting for card data, and the table is usually ready by the time the root returns. All panel directories are prefetched, making panel opens instant but charging their full cost to initial load.',
    id: 'page_assembly',
    type: 'markdown',
  },
  {
    body: '## Query plans point to duplicated broad scans and late enrichment\n\nThe budget-section list is the clearest single-query defect: isolated, it still takes 10.05s because resolution-series enrichment is repeated for every candidate before the 15-row limit. Other query families are much faster alone than during the 15-way request burst, which makes concurrency amplification and duplicate work part of the root cause. Subject expansion also produces 220k rows against a 1.8k estimate and spills its sort to disk.',
    id: 'query_finding',
    sourceId: 'plan_extract',
    type: 'markdown',
  },
  { id: 'query_table_block', tableId: 'query_table', type: 'table' },
]

const scopeBlock = (counts) => ({
  body: `## Scope and definitions\n\nThe database snapshot contains **${Number(counts.total_documents).toLocaleString()} documents**, **${Number(counts.cited_documents).toLocaleString()} distinct cited documents**, ${Number(counts.citations).toLocaleString()} citation rows, ${Number(counts.subject_terms).toLocaleString()} subject terms, and ${Number(counts.resolution_series_rows).toLocaleString()} resolution-series rows. “Uncached” means filter-dependent persistent application caches are bypassed; React request memoization and stable references remain. “Warm” is a second request after an explicit cache-filling request. Wall time covers the benchmark Server Component response body, not browser hydration or rendering.`,
  id: 'scope',
  sourceId: 'database_snapshot',
  type: 'markdown',
})

const closingBlocks = [
  {
    body: '## Methodology preserves the real page assembly\n\nSeventeen fixed scenarios were run against a production build on an isolated local port, with seven cache-bypassed iterations each and one measured warm request. The Secretariat benchmark invokes the same table, card, baseline, entity, organ, and version loaders concurrently. Each SQL call records pool wait, execution time, rows, parameters, caller, and concurrency. Output SHA-256 digests are compared within every scenario. The worst distinct query families were then run individually with read-only `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`. The unlinked analytics page was explicitly excluded.',
    id: 'methodology',
    type: 'markdown',
  },
  {
    body: '## Robustness: application caching is excellent, database warmth is unstable\n\nAll clean, fully warmed list requests completed in 11–26ms with zero SQL, and all comparable output digests matched. But the version-2026 scenario timed out 7/7 in the first full matrix and later completed 7/7 at a 9.52s median after repeated database work. PostgreSQL statement statistics are unavailable, and the managed database buffer cache was not flushed. Treat the reported medians as observed operating points, not hardware-independent query benchmarks.',
    id: 'limitations',
    type: 'markdown',
  },
  {
    body: `## Recommended plan: consolidate first, then materialize only what remains slow\n\n1. **Collapse request-local duplicates.** Build one filtered snapshot shared by the table, live cards, and baseline cards. Target: default SQL count **15 → ≤8**, zero digest changes. Trade-off: a larger data-layer API, but no schema change.\n2. **Paginate before resolution-series enrichment.** Enrich only the 15 displayed rows, or pre-aggregate by symbol once. Target: isolated budget-section list **10.05s → <1s**. Trade-off: query rewrite risk around grouped-version semantics.\n3. **Split headline counts from panel option lists.** Return the four card numbers early; lazy-load or stably cache the organ, budget, subject, and document-type directories. Target: blocking card span **9.51s → <2s**. Trade-off: first panel-open may incur a request unless its stable directory cache is warm.\n4. **Replace repeated regex version matching with indexed membership.** If steps 1–3 do not clear the timeouts, maintain a version-to-origin-to-document mapping and index the filter columns. Target: **7/7 completed** for document type and budget section under the 30s guard. Trade-off: migration and refresh ownership; write the migration and schema update together, but apply neither automatically.\n5. **Normalize high-cardinality arrays if subject work remains material.** A document-subject relation would avoid repeated unnest/sort work. Trade-off: more storage and ingestion complexity.\n6. **Keep caching as the final layer.** Stable vocabularies and reference data are good long-lived cache candidates; filter-result caching stays useful only after the uncached path meets the bar.`,
    id: 'recommended_plan',
    type: 'markdown',
  },
  {
    body: '## Verification bar and open decisions\n\nProposed acceptance bar: zero request/query timeouts across the 17-scenario matrix; uncached default p50 below 2s; warm p50 below 100ms; default SQL count at most 8; and identical output digests for every before/after scenario. The automated inventory check already enforces total run accounting, query accounting, known callers, and digest consistency.\n\nTwo product choices affect the implementation: whether instant first-open of every directory panel is worth blocking initial page content, and how stale a precomputed citation/version membership may be. Confirm those before choosing lazy panels versus eager stable caches, and synchronous versus scheduled membership refresh.',
    id: 'verification',
    type: 'markdown',
  },
]

export const reportBlocks = (counts) => [
  ...openingBlocks,
  scopeBlock(counts),
  ...closingBlocks,
]
