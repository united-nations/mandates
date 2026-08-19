# Code capability index

## Performance measurement

| Capability | Location | Purpose |
| --- | --- | --- |
| Performance trace context | `website/src/lib/perf/trace-context.ts` | Scopes benchmark spans and SQL traces with async-local storage |
| Traced PostgreSQL query | `website/src/lib/perf/traced-query.ts` | Measures pool wait and execution time |
| Dynamic cache bypass | `website/src/lib/perf/dynamic-cache.ts` | Bypasses persistent filter caches during benchmarks |
| Request query cache | `website/src/lib/db/request-query-cache.ts` | Shares identical SQL reads inside one async request scope |
| Scenario runner | `website/scripts/run-performance-inventory.mjs` | Runs the fixed uncached and warm benchmark matrix |
| Inventory verifier | `website/scripts/verify-performance-inventory.mjs` | Checks run, query, caller, and digest accounting |
| Acceptance evaluator | `website/src/lib/perf/acceptance.ts` | Scores the full benchmark against latency, fan-out, failure, and digest bars |
| Equivalence artifact | `website/src/lib/perf/equivalence-loader.ts` | Reconstructs the original eager payload from lazy directory and card loaders |

## Secretariat data

| Capability | Location | Purpose |
| --- | --- | --- |
| Mandate query API | `website/src/lib/data/mandates.ts` | Current public query and page-data entry points |
| Explore-card figures | `website/src/lib/data/explore-card-figure-loader.ts` | Loads initial card counts without directory payloads or redundant totals |
| Explore-directory payload | `website/src/lib/data/explore-directory-data.ts` | Loads the four lazy directory datasets concurrently |
| Lazy directory endpoint | `website/src/app/api/secretariat/directories/route.ts` | Returns filter-scoped panel data on first open |
| Directory endpoint URL | `website/src/lib/directory-request.ts` | Preserves active filters for lazy panel requests |
| Subject-count SQL | `website/src/lib/data/subject-count-sql.ts` | Preserves distinct-document counts without a global DISTINCT sort |
| Ungrouped mandate-list SQL | `website/src/lib/data/mandate-list-sql.ts` | Paginates rows before resolution-series enrichment |
| Budget citation SQL | `website/src/lib/data/budget-citation-sql.ts` | Drives hierarchy work from version citations instead of the full catalogue |
| Budget reference data | `website/src/lib/data/budget-documents.ts` | Reads budget versions and defaults |
| Entity reference data | `website/src/lib/data/entities.ts` | Reads stable entity vocabulary |
| Organ reference data | `website/src/lib/data/organs.ts` | Reads stable organ vocabulary and maps |

Update this index when the performance work introduces a new reusable capability.
