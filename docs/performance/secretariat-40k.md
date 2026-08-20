# Secretariat 40k-document performance

## Outcome

The August 2026 remediation passed the agreed bar. The default uncached request fell from 9.570s to 1.758s p50 and from 15 SQL queries to 5. Both filter paths that previously timed out completed in every optimized run. The complete pre/post payload matched in all 17 scenarios.

| Criterion                    |          Required | Observed |
| ---------------------------- | ----------------: | -------: |
| Uncached default p50         |               <2s |   1.758s |
| Warm default p50             |            <100ms |     18ms |
| Default SQL queries          |                ≤8 |        5 |
| Request and query timeouts   |                 0 |        0 |
| Complete payload equivalence |     All scenarios |    17/17 |
| Benchmark accounting         | Every planned run |  136/136 |

## Scenario results

Times are medians of seven persistent-cache-bypassed runs. A 30s value is a timeout lower bound rather than a completed request. SQL is the median query count for the same runs.

| Scenario       | Before p50 | After p50 | Before SQL | After SQL | Before failures | After failures |
| -------------- | ---------: | --------: | ---------: | --------: | --------------: | -------------: |
| default        |     9.570s |    1.758s |         15 |         5 |             0/7 |            0/7 |
| cited-only     |     4.424s |    1.863s |         15 |         7 |             0/7 |            0/7 |
| page-2         |     9.606s |    1.741s |         15 |         5 |             0/7 |            0/7 |
| sort-year      |     9.326s |    1.840s |         15 |         5 |             0/7 |            0/7 |
| group-versions |     9.966s |    2.391s |         15 |         5 |             0/7 |            0/7 |
| keyword-exact  |     3.851s |    1.127s |         15 |         5 |             0/7 |            0/7 |
| keyword-broad  |     5.340s |    1.250s |         15 |         5 |             0/7 |            0/7 |
| keyword-empty  |     3.497s |    1.102s |         15 |         5 |             0/7 |            0/7 |
| organ          |     7.579s |    2.317s |         15 |         7 |             0/7 |            0/7 |
| entity         |     4.553s |    2.442s |         16 |         8 |             0/7 |            0/7 |
| subject        |     3.739s |    0.932s |         15 |         5 |             0/7 |            0/7 |
| year           |     2.112s |    1.220s |         15 |         6 |             0/7 |            0/7 |
| document-type  |   ≥30.397s |    1.734s |         15 |         5 |             7/7 |            0/7 |
| budget-section |   ≥30.034s |    1.099s |         15 |         5 |             7/7 |            0/7 |
| version-2026   |     9.519s |    1.945s |         15 |         5 |             0/7 |            0/7 |
| combined       |     3.712s |    1.834s |         16 |         9 |             0/7 |            0/7 |
| mandate-detail |     0.067s |    0.063s |          5 |         5 |             0/7 |            0/7 |

## What was slow

- One default page request executed the identical filtered aggregate four times and the budget hierarchy twice.
- Resolution-series enrichment ran before pagination, so metadata work covered every candidate instead of the 15 visible rows.
- Subject counting expanded roughly 220k rows and performed a global distinct sort.
- The budget hierarchy started from the full catalogue and joined citations through a badly underestimated nested-loop plan.
- Initial page assembly fetched four large directory payloads even though none was visible.

## What changed

- Identical parameterized reads share one promise inside a request-local async scope. This is not a persistent or cross-request cache.
- The ungrouped list paginates before resolution-series enrichment.
- Subject headings are deduplicated inside each document's small array before global counting.
- Budget hierarchy work starts from the selected version's citation set and then joins matching catalogue documents.
- Initial card requests load only visible figures. Directory data loads when a panel first opens and is retained for the current client-side filter state.

The review also added a request-generation guard so an older directory response cannot overwrite data for newer filters.

## Measurement method

The fixed matrix contains 16 Secretariat list states and one mandate-detail state. Each state ran seven times with filter-dependent persistent application caches bypassed, followed by a measured warm request. The Secretariat benchmark invokes the same table, card, entity, organ, and version loaders as the page and records wall time, SQL count, query timing, pool wait, errors, and output digests.

“Uncached” does not mean a cold PostgreSQL buffer cache. Stable reference caches and normal managed-database warmth remained. PostgreSQL statement statistics were unavailable, so these numbers are observed operating points rather than hardware-independent query benchmarks.

The read-only database snapshot at measurement time contained 43,912 unified documents, 5,425 distinct cited documents, 9,976 citation rows, 3,779 subject terms, and 56,773 resolution-series rows.

The first uncached directory request is no longer on the initial page path; a production smoke test measured it at 2.60s. Subsequent panel opens for the same filter state reuse the client-held result.

## Rerunning the benchmark

Build and start the production application with `ENABLE_PERFORMANCE_BENCHMARK=1` on an isolated port. Do not reuse or stop another developer's server.

From `website/`, run:

```sh
PERFORMANCE_BASE_URL=http://127.0.0.1:3100 \
PERFORMANCE_OUTPUT=/tmp/mandates-performance-inventory.json \
node scripts/run-performance-inventory.mjs

node scripts/verify-performance-inventory.mjs \
  /tmp/mandates-performance-inventory.json
```

The verifier checks total run accounting, known SQL callers, query accounting, within-scenario digest stability, failures, and the acceptance thresholds above. Use `scripts/explain-performance-queries.mjs` with the generated inventory when a regression needs isolated read-only query plans.

## Durable code

- `scripts/performance-scenarios.mjs`: fixed scenario definitions.
- `scripts/run-performance-inventory.mjs`: uncached and warm matrix runner.
- `scripts/verify-performance-inventory.mjs`: integrity and acceptance verdict.
- `src/lib/perf/`: trace context, cache bypass, statistics, result registry, and benchmark composition.
- `src/lib/db/request-query-cache.ts`: request-local SQL deduplication.

Raw traces, intermediate reruns, query-plan JSON, the generated HTML report, and the one-off eager/lazy equivalence endpoint were intentionally removed. They are large, environment-specific, and reproducible from the retained harness. Git history preserves the original evidence if a forensic review is ever necessary.
