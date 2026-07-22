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

---

# Part 2 — Country-level voting data (added 2026-07-22)

## Sources and ingestion

**UN Digital Library "Voting Data" collection.** Every recorded vote is a
separate DL record with per-country votes in repeated MARC 967 fields
($c ISO3, $d Y/N/A, missing $d = absent), the resolution symbol in 791$a,
body in 981$a, vote date in 992$a, and Y/N counts in 996. The search/export
endpoint (`/search?cc=Voting+Data&of=xm&rg=50&jrec=…&fct__3=<year>`) sits
behind an AWS WAF JavaScript challenge (plain HTTP gets 202 challenge pages);
`data-processing/voting/harvest_dl_voting.mjs` drives a headless system
Chrome through the challenge once and then fetches the MARCXML search pages
inside that browser context — 50 records per request, 1.5 s between requests,
resumable, raw XML cached on the external disk
(`/Volumes/SSDAStorage/un-voting-data/raw/search-pages/`, 92 pages, 79 MB).

**Harvest result (2026-07-22): 4,365 records, years 2015–2026.** Per year
~370–420 records. Composition (2015 example): ~342 GA plenary (A/RES) + ~64
Security Council; the collection also contains records for consensus
adoptions (no 967 fields) — those are skipped. HRC recorded votes did not
appear under these year facets. 1,764 records carry per-country votes; 1,132
of them are GA plenary (A/RES) recorded votes, the analysis universe.

**Voeten ideal points.** For history beyond the scrape, the Bailey/
Strezhnev/Voeten ideal point estimates (Harvard Dataverse
doi:10.7910/DVN/LEJUQZ, `Idealpointestimates1946-2025.tab`, cached on the
external disk) provide one number per country-year, 1946–2025, estimated
from all GA roll-call votes. The current Dataverse version no longer ships
the raw per-vote CSV, so raw pre-2015 country votes were **not** ingested;
the deep history enters only through the ideal points. Serbia is mapped from
Voeten's `YUG` code.

`data-processing/voting/process_voting.py` (stdlib-only, run with plain
python3) turns both into the two committed JSON files under
`website/src/data/voting/`:

- `vote-details.json` (0.35 MB): symbol → {date, body, yes/absent counts,
  ISO3 lists of No votes and abstentions} for 1,764 recorded votes — feeds
  the mandate-detail strip's "Against: …" / "Abstaining: …" lines.
- `voting-analysis.json` (0.13 MB): country names; 193×193 percent-agreement
  matrix over the 1,132 GA votes (identical Y/N/A among common non-absent
  votes; pairs under 50 common votes → null), rows/columns ordered by latest
  ideal point; loneliest-No counts (No with ≤1 co-dissenter); ideal-point
  yearly percentiles (p10/25/50/75/90) plus 7 labeled country series.

## What shipped

- Mandate detail strip now names the minority (against / abstaining, long
  lists collapsed at 12) whenever the DL Voting Data collection covers the
  document — recorded votes 2015 onwards, GA and SC.
- New /secretariat expander "Who votes with whom? Country blocs in Assembly
  voting": (1) canvas 193×193 agreement heatmap ordered by ideal point
  (blocs appear as dark diagonal blocks; sequential white→un-blue ramp, grey
  = insufficient common votes); (2) 80-year alignment chart — ideal-point
  percentile bands + 7 validated-palette labeled trajectories; (3) loneliest
  voters ranking (near-isolated No votes; USA 210, Israel 126, Russia 23 …).

## Coverage caveats (repeated in the UI)

- Raw country votes cover **2015–2026 only**, and the agreement matrix and
  loneliest list use **GA plenary votes only** (SC votes are in
  vote-details for the strip; HRC absent from the harvest).
- The ideal-point chart covers 1946–2025 but is a **model estimate**
  (Bailey–Strezhnev–Voeten), not raw agreement; the two visualisations are
  labeled with their respective sources.
- 2026 is a partial year (66 records at harvest time).
- Consensus adoptions have no country-level record by definition; the strip
  falls back to the Part-1 vote_summary rendering.

## Palette validation (dataviz checks)

- Line-series palette (7 series, vertical label order USA/ISR/GBR/UKR/RUS/
  IND/CHN): `#0090cc,#c9820f,#2aa392,#5052a5,#a84f70,#276b35,#ab3a2c` — all
  six checks pass on the light surface; single CVD warn (red/green pair at
  ΔE 6.0 deutan) is covered by the direct label every line carries. The
  original 13-series muted-band assignment hard-failed (normal-vision floor
  4.4) and was cut to 7 with two chroma-raised steps, per the skill's
  "cut series and re-step" rule.
- Heatmap: sequential single hue (white→un-blue-deep), magnitude only.
- Vote strip: polarity blue/red + neutral grey midpoint (validated in
  Part 1).
