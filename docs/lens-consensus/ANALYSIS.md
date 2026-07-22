# Consensus lens — vote data coverage audit

Basis for the /secretariat expander "Consensus and contestation in the General
Assembly" and the adoption strip on the mandate detail view. All data comes
from `digitallibrary.documents.vote_summary`, a free-text field harvested from
the UN Digital Library. Audit run 2026-07-22 against the dev database
(read-only; every statement was a plain `SELECT`).

## What vote_summary contains

Universe audited: `document_symbol LIKE 'A/RES/%'`, `deleted_at IS NULL` —
21,501 GA resolutions, all with a parseable `symbol_session` (regular sessions
`^\d+$` plus special/emergency-special sessions such as `9sp`, `8emsp`).

| Class | Pattern | Count |
| --- | --- | --- |
| Adopted without a vote | `Adopted without vote[, Nth (plenary) meeting]` and variants | 10,824 |
| Recorded vote | `Adopted 127-16-40, …` (rarely `Adopted, 143-1-3, …`) | 4,838 |
| Empty / NULL | — | 5,727 |
| Misc | see below | 112 |

The misc tail (kept in mind when writing the classifiers):

- Typos: `Adopted without tove`, `Adopted wihtout vote` (~11 docs).
- `Adopted under silence procedure` (37), `Adopted by consensus` (7),
  `Adopted unanimously` (6) — all counted as "without a vote".
- Ambiguous: `Adopted at the Nth plenary meeting` / `Adopted, 93rd meeting`
  (~45 docs, ~0.2%) — no signal either way; excluded from both classes
  (treated as unknown).

Classifier regexes (SQL and TS kept in sync, see
`website/src/lib/consensus.ts` / `website/src/lib/data/votes.ts`):

- Recorded vote: `adopted,?\s+\d+\s*-\s*\d+\s*-\s*\d+` (case-insensitive)
- Without a vote:
  `without\s+(a\s+)?[tv]o[tv]e|wihtout\s+vote|consensus|unanimous|silence procedure`

## Coverage by GA session

Per-session counts of missing (NULL/empty) `vote_summary`:

- **Sessions 1–38 (1946–1984): unusable.** 60–100% missing per session;
  session 38 is 100% missing (241/241), session 19 (the "no-vote session") is
  14/14 missing. The populated residue is biased toward recorded votes, so a
  "% voted among known" workaround would overstate contestation badly.
- **Sessions 39–54 (1984–2000): near-complete.** 0–7% missing per session
  (typically ~20 docs of ~350); good enough to chart against the full session
  denominator.
- **Sessions 55–80 (2000–present): complete.** 0 missing in every session.

**Decision: the session chart starts at session 39** (`MIN_COMPLETE_GA_SESSION`
in `website/src/lib/consensus.ts`) and uses the full session resolution count
as denominator. The 39–54 residual missing (≤7%) slightly deflates the voted
share in those sessions; acceptable and noted here rather than worked around.

Sanity checks on session 80 (the "to date" session, through 2026-07-07 at
audit time): 295 resolutions, no duplicate symbols, all
`resource_subtype = 'Resolutions and Decisions'`, spot-checked recorded votes
(e.g. A/RES/80/193 "Adopted 127-16-40, 62nd plenary meeting") look genuine.
The session-80 voted share (174/295 ≈ 59%) is real in this data, not an
artefact — but the session is incomplete, hence the explicit "to date"
annotation and lighter bar.

## Contested-topics league

Universe: GA resolutions, sessions ≥ 39, with a known adoption method
(`vote_summary` non-empty); subjects from the `subjects` TEXT[] (UNBIS
headings); minimum 100 resolutions per subject; ranked by recorded-vote share
from both ends (top/bottom 12).

Spot check of the extremes (matches domain expectations):

- Most contested: Golan Heights 99.3%, non-nuclear-weapon states 99.0%,
  Israel 98.8%, nuclear weapons use 98.5%, territories occupied by Israel
  97.2%, Middle East situation 96.4%.
- Most consensual: international civil service 0.8%, auditing 1.2%, internal
  oversight 1.5%, economic integration 2.0%, youth 2.8%.

## Per-document strip

`vote_summary` is populated far beyond A/RES (E/, S/, A/HRC/, …), so the
mandate-detail strip looks up any document by `symbol_normalized` and renders:

- recorded vote → proportional in-favour/against/abstentions bar with counts;
- without a vote → a one-line "Adopted without a vote";
- unknown/ambiguous/no DL record → nothing.

## Known limitations

- No per-country breakdown: `vote_summary` only stores the totals; the DL's
  per-member voting records are not in this mirror.
- Pre-1984 GA sessions cannot be charted from this source; backfilling would
  require a separate harvest (e.g. the DL voting-data collection or UNBIS).
- Special and emergency-special sessions are excluded from the session chart
  (different cadence, tiny counts); they remain visible on document detail.
- "Recorded vote" counts any N-N-N summary; it does not distinguish
  paragraph-level votes that preceded a consensus adoption of the whole.
