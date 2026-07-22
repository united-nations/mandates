# Mandate implementation lens — analysis notes

Companion to [SOURCES.md](SOURCES.md). This documents the join actually built, its
measured coverage, and what the resulting page (`/missions`) can and cannot claim.
Numbers computed from `website/src/data/mission-implementation.json`
(built 2026-07-22 by `data-processing/scripts/build_mission_implementation.py`;
re-check anytime with `python3 data-processing/scripts/report_coverage.py`).

## The join

Two sides, one key:

- **Mandate side (our DB, read-only):** Security Council resolutions in
  `digitallibrary.documents` whose DL catalogue title (field 245, `title_other`)
  marks an *extension/renewal of the mandate*. The mission acronym is extracted from
  the `(ACRONYM)` suffix in the title, falling back to a normalized full-name match
  against the mission register; the new expiry date is parsed from the
  "… until 30 Apr. 2025" phrase.
- **Ground side (UN Peace & Security Data Hub, via HDX):** nine DPPA-DPO CSV
  datasets — mission register, mandate components, approved vs actual personnel,
  monthly uniformed deployment, fatalities, budget appropriation vs expenditure,
  and results-based-budgeting indicators.

Join key: **mission acronym**, which both sides carry natively (one fix needed:
the register spells out "UN Verification Mission in Colombia" where every other
dataset says UNVMC). Secondary key: UN document symbols (`S/RES/…`), which PSData
carries verbatim and which link straight back to undocs.org and our own mirror.

## Measured join coverage

Base population: **29 missions** in the DPPA register (21 open: 11 PKOs + 10 SPMs;
8 recently closed).

| Facet | Missions covered | Notes on the gap |
|---|---|---|
| Mandate renewals (our DB) | 21/29, **573 resolutions** matched, 312 with a parseable "until" date | The 8 unmatched are missions never renewed by SC resolution: UNMOGIP/UNTSO (open-ended, pre-1950), regional offices renewed by exchange of letters (UNOCA, UNOWAS, UNRCCA, UNSCOL), UNMIK (SC 1244 open-ended), UNTMIS (too new) |
| Monthly uniformed deployment (2010-01 – 2026-04) | 26/29 | Missing three envoy-led/regional offices that report no uniformed personnel |
| Approved vs actual personnel (2010/11 – 2025/26) | 10/29 | Dataset covers budgeted PKOs only — all 10 PKOs with a current support-account budget are present on both the approved and actual side (11th PKO in register, UNTMIS, is 2025-new) |
| Fatalities (1948–) | 23/29, 2,577 fatalities on joined missions | Dataset has 4,507 fatalities over 81 historical missions; the rest belong to missions outside the current register |
| Budget appropriation vs expenditure (2010/11 – 2024/25) | 14/29 | PKO budgets only (incl. closed PKOs); SPM budgets sit in the regular budget, not in this dataset |
| RBB performance indicators (2014/15 – 2023/24) | 13/29, 1,190 indicator-periods, 576 met / 614 missed | PKOs only; indicator publication stops after 2023/24 |

Renewal-side coverage seen from the DB: 1,306 S/RES rows match the
extension/renewal title pattern overall; 573 of them join to the 29 register
missions (the remainder are renewals of missions that closed before the register's
scope, e.g. UNPROFOR, UNMEE, MINUSTAH-era operations, plus non-mission bodies).
DL titles of this form are systematic only from ~1997, so per-mission renewal
counts before then undercount.

## What the page can honestly show

1. **The mandate ledger is real, not invented** — every renewal count links to a
   dated `S/RES/…` symbol resolving on undocs.org, derived from our own mirror.
2. **Mandated vs actual strength** — the core implementation gap. GA-approved
   uniformed ceilings vs actual average deployment per budget year; latest year
   (2024/25) ranges from 75% (UNIFIL) to 98% (MINUSCA, UNDOF). Portfolio-wide the
   active PKOs deploy 86% of mandated uniformed strength.
3. **The drawdown story** — monthly deployment small-multiples make the
   post-2017 contraction visible (MONUSCO, UNMISS taper; MINUSMA, UNAMID go to
   zero mid-mandate).
4. **Cost of the mandate** — appropriation vs expenditure; execution rates
   cluster at 95–100%, i.e. budget under-spend is *not* where the implementation
   gap lives.
5. **Human cost** — fatalities per mission, split malicious vs other.
6. **Self-assessed performance** — RBB targets met (48% overall), presented as
   the missions' own yardstick, clearly labelled.

## What it cannot claim (and therefore does not)

- **Outcome impact** (peace kept, civilians protected). The data measures inputs
  and outputs, not outcomes; the page's language stays at "paper vs ground".
- **SC-authorised vs GA-budgeted ceilings.** The "mandated" strength shown is the
  GA-approved uniformed ceiling for the budget year, which can differ from the
  ceiling the SC authorised in the resolution. Footnoted on the page.
- **SPM implementation depth.** SPMs join only on renewals + deployment (small
  numbers), because posts/budget/indicator datasets are PKO-scoped.
- **Pre-2010 deployment.** The monthly series starts 2010-01; earlier mandates
  show renewals and fatalities only.

## Which targets were (not) met — semantic classification

The page originally showed only a count (e.g. 576/1,190 RBB targets met). That
binary flag throws away two things a reader wants: the *distance* between "missed
by a hair" and "missed badly", and the *reason*. So every RBB indicator record in
`dos-indicators.csv` (1,423 rows, 16 missions/support entities, 2014/15–2023/24) is
re-graded into **met / partially met / not met / not assessable** with a one-line
reason grounded in the planned-vs-actual numbers. Output:
`website/src/data/mission-targets.json`, built by
`data-processing/scripts/classify_mission_targets.py`.

### Method (semantic direction + transparent banding)

The genuinely semantic step is done by *reading the indicators*, not by regexing
numbers: the dataset has only **15 indicator families**, and each family's wording
fixes its direction —

- "Minimize timeline …", "Reduce the share …" → **ceiling** (lower is better);
- "Ensure … compliant", "Achieve …", "Improve …", "Comply …", "Utilize …",
  "Address …", "Increase …", "Implement all …", "Enhance … (points)" → **floor**
  (higher is better);
- "Minimize the share of posts that remain vacant" → **band**: the actual must land
  inside `[Target, Target_2]`. Both under- and over-shoot miss — an under-vacancy
  means the mission over-hired against its budgeted attrition, an over-vacancy means
  posts sat empty. Confirmed against the dataset's own `Target_met` flag (a vacancy
  of 5% against a 8–12% band is flagged *not met* in the source data).

Each record is then graded on its direction-aware distance from target: **met** if
it reaches/holds the target, **partially met** if within 10% of it (e.g. 97% against
a 100% standard, or 122 days against a 120-day ceiling), **not met** otherwise;
**not assessable** only when no usable target exists. The 10% partial band is a
stated, reproducible choice — not a per-row guess.

(The original plan was to fan this out to sonnet subagents reading batches; in the
executing harness no agent-spawn tool was available, so the semantic reading — all
151 distinct indicator/target descriptions and their directions — was done directly
and encoded per family. The direction assignment is the judgment; the banding is
transparent arithmetic on the official Value vs Target columns.)

### Result and accuracy

Status tally over all 1,423 records: **711 met · 179 partially met · 533 not met ·
0 not assessable**. Our "met" boundary agrees with the dataset's own binary
`Target_met` flag on **1,401/1,423 = 98.5%** of records. The 22 disagreements are
all defensible and were inspected individually: they are (a) exactly-at-boundary
cases we read inclusively as met (e.g. actual 6% at the top of a 4–6% band; actual
= target to the cent), and (b) a handful of Environment / accommodation / safety
rows carrying an unusual sub-100% target where the source flag appears to compare
against a stricter threshold than the printed one. Reading each record against its
own printed target is the transparent choice.

**Hand-check (20 records, stratified across families and statuses):** 20/20 agreed
with my own judgment, including the two-sided vacancy band (both over- and
under-staffed correctly flagged) and every floor/ceiling direction. Sample and
verdicts are reproducible from `mission-targets.json` (seed 42 in the inspection
snippet). Representative rows: MINUSMA 2019/20 vacancy 8% below a 12–18% band →
*not met (over-staffed)*; UNMISS 2023/24 roster recruitment 71 d vs 70 d →
*partially met*; UNIFIL 2021/22 demand-plan deviation 15% ≤ 20% ceiling → *met*.

### Surfaced in the UI

`/missions` section "Which targets were met — and which were missed": one
expandable card per mission (13 register missions have RBB data), showing a
met/partial/not-met status bar and, on expand, the mission's **latest** reported
period grouped by status with each target's reason. Missions are ordered
worst-missed first. Component `MissionTargets.tsx`; data helper
`lib/mission-targets.ts`.

## The renewal "mini heartbeat" join

The heartbeat renewal extraction (`sc-renewals.json`, sibling branch) keys each
chain by an `id` that **is the mission acronym**, so the join to the mission
register is direct: 20 of the 29 register missions carry a renewal chain (the 9
without are the open-ended mandates — UNTSO, UNMOGIP, UNMIK, and the
letter-renewed regional offices). Each mission row on `/missions` now carries a
`MissionRenewalStrip` (server-rendered SVG): one segment per Security Council
extension, from adoption to the expiry it set, coloured by leash bucket
(≤ 3 months / ≈ 6 months / ≈ 1 year+), with a dashed data-cut-off marker. The
characteristic six-month rhythm of UNDOF and UNFICYP shows as solid amber; missions
kept on technical rollovers show red segments. The `/secretariat` heartbeat
expander is untouched and still works (same `lib/sc-renewals.ts`, new exports
`getMissionChain` / `renewalsGenerated` added alongside).

## Map with timeline

`/missions` section "Where the blue helmets go, and when": a dependency-free
equirectangular SVG world map with a year scrubber (1948→2026, play/pause + slider).
Built by `data-processing/scripts/build_mission_map.py` →
`website/src/data/mission-map.json`; component `MissionMap.tsx`,
helper `lib/mission-map.ts`.

- **No map library.** A low-res Natural Earth 110m land outline
  (`data/references/ne_110m_land.geojson`, public domain) is projected to an SVG
  path *at build time* with a plain linear lon/lat→x/y equirectangular projection,
  cropped to the Atlantic-to-South-Asia band where every current mission sits. The
  runtime plots markers with the identical projection, so coastlines and markers
  stay in register. No d3-geo, no topojson, no tiles.
- **Coordinates** are a curated mission→operational-location table (host country /
  HQ) committed in the build script — the P&S hub deployment data carries no
  per-location geometry, so a curated table is the honest option; overlapping
  cities (two Haiti, two Somalia, two Lebanon missions) are nudged apart.
- **Time.** A marker appears for each year a mission is active
  (`startYear ≤ year ≤ endYear`; endYear = expiry year, or the data's current year
  if open). Marker **size** ∝ mean uniformed strength deployed that year (the
  monthly series starts 2010, so pre-2010 years and the uniformed-less special
  political missions show a small hollow marker). Marker **colour** = still open
  today (un-blue) vs since closed (trout).
- **Scope caveat.** The map covers the *current* DPPA register (29 missions:
  21 open + 8 recently closed). Missions that closed before the register's scope
  (UNPROFOR, UNMEE, MINUSTAH-era, …) are **not** on the map, so scrubbing to the
  1990s shows the long-running survivors (UNFICYP, UNDOF, UNTSO, UNMOGIP, UNIFIL,
  MINURSO), not the full historical roster. The renewal-chain data does reach those
  older missions, but they have no register row / coordinate.

## Alternatives rejected at the join stage

See the scored table in SOURCES.md. The decisive criterion was a *native* shared
identifier: PSData is the only surveyed source that speaks our exact ID language
(mission acronyms + UN document symbols) with bulk machine-readable access.
Programme-performance reports (A/79/73) and JIU implementation rates scored well
on story but are PDF/dashboard-locked; SDG and humanitarian data would have
required inventing a mandate→country/goal mapping that the mandates themselves do
not carry.
