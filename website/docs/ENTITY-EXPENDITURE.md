# Entity expenditure in mandate details

The full mandate page and intercepted sidebar stream CitationCountsWithExpenditure.
An entity's amount repeats on each citation location and is not additive across
mandates or locations.

## Meaning and sources

- PPB: calendar 2025 expenditure, all reported regular-budget, other-assessed and
  extrabudgetary values, from
  https://open.un-two-zero.org/data/budget-ppb-expenditure-2025.json
- Peacekeeping: 1 July 2024–30 June 2025 audited mission-account expenditure, from
  https://open.un-two-zero.org/data/budget-audited-pko-2025.json

This is the authoritative entity financial scope published in these exports,
not expenditure attributable to a mandate. Missing funding sources are not
assumed to be zero. Reported zero amounts remain zero.

## Matching

src/lib/entity-expenditure.ts validates metadata, hierarchy, finite values and
amount/funding reconciliation, then matches exact normalized names/acronyms.
The explicit alias table handles source-supported name variants. No fuzzy
matching is used.

Identified entity scopes outrank incidental same-name allocations (for example,
capital spending rows under section 33). An authoritative matching ancestor
outranks duplicate child projections. Unannotated SPMs can match exact labels at
any depth. Multiple independent candidates are rejected unless they have the
same label, parent and dataset and have disjoint funding keys.

DCO is unavailable: the Resident Coordinator System is a different financial
scope and its separate trust-fund schedule is outside the exported section
control. UNSOH is unavailable because it was established after the selected
peacekeeping expenditure period. The older OSASG-Cyprus name is intentionally
not aliased without confirmation of equivalent scope.

## Fetching and failure

The server fetches raw JSON with cache: no-store and a 12-second timeout.
unstable_cache stores the validated compact index for 24 hours, independently
for each source, tagged entity-expenditure. React cache deduplicates loads in
a render. Index size is checked below 1.8MB because raw PPB JSON exceeds the
default Next cache entry budget.

Fetch/validation failures throw inside the cached callback, preserving a last
successful value during background revalidation. Cold failures are caught
outside the cache and render an unavailable amount. They never cache an empty
success. A failed source does not prevent use of the other source.

## Links

PPB icons open the exact source-node ID in Open's programme-budget sidebar,
which currently defaults to 2025 expenditure and shows all funding sources.
Period/measure are not encoded in Open's current deep-link contract; recheck
this assumption when its default changes. The popover also links the exact
dataset and published source documents.

Peacekeeping icons link the exact 2024/25 JSON source: Open's current interactive
mission view uses a different dataset/year range. Do not link a different
period merely to provide an interactive destination.

## Verification on 24 September 2026

- PPB 2027 citation view: 105/107 entities matched; DCO and UNSOH unavailable.
- PPB 2026 citation view: 108/110 matched; DCO and OSASG-Cyprus unavailable.
- All 213 matched amounts equal the selected source-node sums, and periods
  match source metadata. This measures coverage in the Mandates-to-Open direction.
- Independent review checked aliases, authoritative-node precedence, source
  periods, caching, page integration and links; no blocking findings.
- Focused tests cover wrong metadata, bad arithmetic, duplicate/cyclic hierarchy,
  ancestor double-counting, funding overlap, lower-level SPMs, zero versus missing,
  incidental allocations, aliases and the explicit unavailable cases.

Run node --test src/lib/entity-expenditure.test.ts from website/, followed
by pnpm typecheck. No database migration or source-data mutation is involved.
