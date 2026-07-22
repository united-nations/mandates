# Should there be a `/missions`-style page for Special Political Missions?

**Verdict: NO — do not build a separate SPM analogue of `/missions`.**

The engine that makes `/missions` worth a page — the *paper-vs-ground* comparison of
mandated uniformed strength against actual deployment, plus budget execution and
results-based-budgeting (RBB) targets — is structurally PKO-only. For Special
Political Missions (SPMs) three of the six data facets are entirely empty, one is a
marginal by-product rather than the mission's substance, and the two facets that *do*
populate (renewal cadence, mandate-task components) are already shown on `/missions`,
which folds SPMs in as a secondary table. A standalone SPM page would be ~70 % empty
columns pretending to be an implementation ledger.

Assessed 2026-07-22 against the same UN Peace & Security Data Hub CSVs and DB join that
back `/missions` (see [SOURCES.md](SOURCES.md), [ANALYSIS.md](ANALYSIS.md)). All numbers
below are measured, not estimated — from `website/src/data/mission-implementation.json`
(which already contains 13 SPMs) and the cached HDX CSVs.

## What SPMs exist in the joinable data

The DPPA field-missions register (`dppa-fieldmissions-missions.csv`) tags each mission by
`lead_entity`. It lists **13 SPMs** (10 open, 3 closed) alongside 14 PKOs:

| SPM | Status | Established by | SC renewal chain? |
|---|---|---|---|
| UNAMA | open | S/RES/1401 (2002) | yes — 26 renewals |
| UNAMI | open | S/RES/1500 (2003) | yes — 22 |
| UNSMIL | open | S/RES/2009 (2011) | yes — 23 |
| BINUH | open | S/RES/2476 (2019) | yes — 7 |
| UNVMC (Colombia) | open | S/RES/2366 (2017) | yes — 9 |
| UNTMIS (Somalia) | open | S/RES/2753 (2024) | new — 0 yet |
| UNMHA (Yemen/Hudaydah) | closed | S/RES/2452 (2019) | yes — 9 |
| UNIOGBIS (Guinea-Bissau) | closed | S/RES/1876 (2009) | yes — 12 |
| UNSOM (Somalia) | closed | S/RES/2102 (2013) | yes — 15 |
| UNOWAS (West Africa) | open | S/2016/89 (letters) | **no** — 0 |
| UNOCA (Central Africa) | open | S/2009/697 (letters) | **no** — 0 |
| UNRCCA (Central Asia) | open | S/2007/279 (letters) | **no** — 0 |
| UNSCOL (Lebanon) | open | S/2007/86 (letters) | **no** — 0 |

Two structural facts already visible here:

1. **Two governance modes.** 9 SPMs are SC-resolution-mandated and have a renewal chain
   in our DB; 4 (the regional offices/centres) are established and renewed by *exchange
   of letters* between the SG and the Council — no `S/RES`, so no renewal timeline exists
   to show. This split is real and interesting, but it is a *governance* story, not an
   *implementation* story.
2. **The register is not the SPM universe.** The UN's actual SPM portfolio (SG budget
   A/80/6, Sect. 3) is ~35–40 missions grouped in clusters: special/personal envoys and
   advisers, sanctions panels and groups of experts, regional offices, and the two large
   country missions (UNAMA, UNAMI). The register's 13 are only the large *field-based*
   ones. A page titled "Special Political Missions" would silently drop the entire
   envoy and sanctions-panel clusters — which have **zero** field-data footprint — and so
   would misrepresent 13 of ~40 as the whole.

## Which `/missions` facets an SPM can and cannot fill

Measured per-mission coverage (rows present in `mission-implementation.json`):

| `/missions` facet | Data source | PKO | SPM | Why SPMs are empty |
|---|---|---|---|---|
| Mandate renewals | our DB (DL title 245) | ✓ | **partial (9/13)** | 4 regional offices renewed by letters, not `S/RES` |
| **Mandated vs actual uniformed strength** (the flagship "gap") | `dpo-postsapproved/actual` | ✓ (10 PKOs) | **✗ (0/13)** | dataset is budgeted-PKO-only; SPMs have no GA uniformed ceiling |
| Monthly uniformed deployment | `dpo-uchistorical` | ✓ | technically present, **marginal** | see below |
| Budget appropriation vs expenditure | `dpo-pkbudget/pkexp` | ✓ (14) | **✗ (0/13)** | peacekeeping-account only; SPMs sit in the *regular* budget |
| Human cost (fatalities) | `dppadposs-fatalities` | ✓ | **sparse** | civilian missions: UNAMA 21, UNAMI 19, UNSMIL 7, most ≤5, six SPMs = 0 |
| RBB performance targets | `dos-indicators` | ✓ (13) | **✗ (0/13)** | indicator dataset is PKO-scoped |

**The "deployment" facet is a trap for SPMs.** SPMs do appear in the uniformed-personnel
series, but only because a few carry military advisers, UN police, or a guard unit. The
magnitudes are marginal and are *not what an SPM does*: UNAMA's uniformed count peaks at
~30 and is now **1**, against a mission of ~1,000 mostly-civilian staff; MONUSCO by
contrast runs 9,000–21,000. Worse, there is **no mandated ceiling** (`posts = 0`) to plot
it against, so the single chart that defines `/missions` — approved ceiling vs actual
deployment, small-multiples per mission — literally cannot be drawn for any SPM. Showing
an SPM's handful of military advisers as its "deployment" would imply that civilian
political missions are lightly-staffed troop deployments, which is false.

## Net: what an honest standalone SPM page could show

Only the two facets that already exist on `/missions`:

- **Renewal cadence** for the 9 SC-mandated SPMs (and a "renewed by exchange of letters"
  annotation for the other 4) — already a column in the `/missions` active-missions table.
- **Mandate-task components** (`dppa-fieldmissions`, para-level mandated tasks) — the one
  dimension where SPMs have genuine parity with PKOs, already carried as `mandateTasks` /
  `mandateParagraphs` on each mission.
- Sparse fatalities.

That is not enough distinct, non-empty content for its own page without padding. Every
other section would be an empty-state ("no mandated-strength data for special political
missions", "no peacekeeping-budget data", "no RBB indicators") — i.e. the page would
mostly explain what it *cannot* show.

## The better alternatives (recommendation, not built here)

`/missions` **already includes SPMs** — it filters `type !== 'Peacekeeping Mission'` and
renders them as a second table under the PKOs, with the strength/target columns simply
blank. That is the correct home for the SPM data that exists. Concretely:

1. **Keep SPMs folded into `/missions`** (status quo). The marginal reader value of a
   separate page is low because the joinable SPM data is a strict subset of what
   `/missions` shows. (Another agent is concurrently enhancing `/missions`; this
   assessment does **not** touch those files.)
2. **If `/missions` wants to serve SPMs better, add an SPM-appropriate lens *there*,**
   not a replica of the PKO charts: (a) the SC-resolution vs exchange-of-letters
   governance split; (b) the mandate-task/component richness (what each SPM is tasked to
   do), which is the SPMs' real analytical surface. Both use data already in the JSON.
3. **A genuinely distinct SPM page would need a different spine entirely** — "what SPMs
   are mandated to do, how often it is renewed, and what it costs in the *regular*
   budget" — sourced from PPB Section 3 (the SPM budget addenda), not from the DPO
   peacekeeping datasets. Our `ppb2026` schema does **not** currently expose per-SPM
   budget lines (its `organs` table is mandating bodies — GA/SC/ECOSOC/commissions — not
   missions; no SPM entity resolves there), and per project memory the 2027 Section 3
   addenda are not yet published. So this spine is not buildable today with honest data;
   the in-progress `spm-2027-coverage` branch is the place that work would land.

## Bottom line

A `/missions`-style page for SPMs would inherit a chassis (mandated-vs-actual strength,
peacekeeping budget execution, RBB targets) whose three load-bearing datasets are
PKO-only, applied to civilian missions whose substance those datasets do not measure. The
honest SPM signal (renewals for 9/13, mandate-task components) is a subset of what
`/missions` already displays. **Don't build it. Keep SPMs on `/missions`; if more is
wanted, add a components/governance lens there, or — separately — a regular-budget-based
SPM view once PPB Section 3 per-mission budget data is exposed.**
