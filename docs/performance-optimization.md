# Secretariat performance remediation

## Verdict

**PASS — all agreed criteria are fulfilled.** The optimized matrix accounts for 136/136 runs with no integrity errors, request failures, query failures, unknown callers, warm-up failures, or within-scenario digest drift. The reconstructed complete payload matches the pre-optimization digest in all 17 scenarios.

## Before and after

| Measure | Before | After | Result |
| --- | ---: | ---: | --- |
| Default uncached p50 | 9.570s | 1.758s | 81.6% faster |
| Default SQL queries | 15 | 5 | 66.7% fewer |
| Default warm request | 24ms | 18ms | Below 100ms |
| Document-type filter | 7/7 timed out at 30s | 1.734s p50, 7/7 complete | Timeout removed |
| Budget-section filter | 7/7 timed out at 30s | 1.099s p50, 7/7 complete | Timeout removed |
| All scenario requests | 15 failures | 0 failures | Pass |
| Complete payload equivalence | Not applicable | 17/17 digests match | Pass |

## Changes

1. Identical parameterized SQL now shares one promise inside a request-local async scope. Persistent caches are still bypassed in the uncached benchmark; this removes only duplicate work within one request.
2. The ungrouped list paginates before looking up resolution-series metadata, reducing enrichment from every candidate document to the 15 visible rows.
3. Subject headings are deduplicated inside each document's small array before global counting, avoiding a global distinct sort while preserving exact distinct-document counts.
4. Budget hierarchy queries now start from the roughly 4k citations in the selected budget version and join to matching catalogue documents. This avoids the former 30k-by-4k nested-loop plan caused by severe row-estimate errors.
5. Initial card requests load only the four visible figures. Organ, document, subject, entity, and budget directories load through `/api/secretariat/directories` when a panel first opens. The complete eager-shaped payload remains byte-for-byte equivalent.

## Automated checks

- `node scripts/verify-performance-inventory.mjs ../docs/performance-optimized-data.json`
- `PERFORMANCE_BASE_URL=http://localhost:3100 node scripts/verify-performance-equivalence.mjs`
- `pnpm test && pnpm typecheck && pnpm lint && pnpm build`

Raw evidence is in `performance-optimized-data.json` and `performance-equivalence.json`. No migration or database write was required.
