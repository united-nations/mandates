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

## Alternatives rejected at the join stage

See the scored table in SOURCES.md. The decisive criterion was a *native* shared
identifier: PSData is the only surveyed source that speaks our exact ID language
(mission acronyms + UN document symbols) with bulk machine-readable access.
Programme-performance reports (A/79/73) and JIU implementation rates scored well
on story but are PDF/dashboard-locked; SDG and humanitarian data would have
required inventing a mandate→country/goal mapping that the mandates themselves do
not carry.
