# The Mandate Heartbeat — how long a leash the Security Council grants

New analytical lens on `/secretariat` (expander card **"Mandate renewals: how
long a leash the Security Council grants"**, deep-linkable as
`/secretariat#renewals`). Every time the Security Council extends or renews a
mandate it sets an expiry date; the gap between adoption and expiry — the
*leash* — is a direct, quantitative read on how much confidence (or how little
agreement) the Council has in each mission, sanctions regime, or standing
authorization.

## Method

### Extraction pipeline

`website/scripts/extract-sc-renewals.mjs` (Node, `pg`; **SELECT-only**) pulls
every English S/RES paragraph from `digitallibrary.document_paragraphs` +
`digitallibrary.documents` (join on `symbol_normalized`; `date_publication` is
day-precise for S/RES from 1980 on — 1960s/70s dates are partly year-only,
which is irrelevant for the 1990+ scope) whose text contains an extend/renew
verb near one of three expiry phrasings:

- **A. `until 31 December 2024`** — the dominant modern formula (811 kept rows);
- **B. `for a (further) period ending/expiring/terminating (on) 15 June 1994`**
  — the UNFICYP/Group-of-Experts formula (122 rows);
- **C. `for a (further interim) period of six months`** — expiry computed from
  the adoption date, or from an explicit `from/beyond 20 December 2002` anchor
  (~116 rows).

Filtering and attachment:

1. **Operative paragraphs only** (`paragraph_type`, with two fallbacks: a
   participle blacklist where the type is NULL, and an operative-verb
   whitelist — `Decides/Extends/Renews/To renew/To extend` — where old scanned
   "Resolutions and Decisions" dossiers mistag operative decision items as
   preambular; that fallback alone recovers the complete 1990s UNDOF series).
2. **Chain attachment** — every clause is attached to one *chain*:
   - **Missions**: curated dictionary of ~75 missions (acronym + full-name +
     OCR-tolerant regexes; e.g. `United Nations Interim Force` catches the
     scanned "l.ebanon" dossiers). Clauses that only say "extends the present
     mandate" are resolved through the resolution's other paragraphs, accepted
     only when exactly one mission matches.
   - **Sanctions regimes / panels / authorizations**: the resolution numbers
     cited in each clause (`resolution 2140 (2014)`, year optional) are
     clustered transitively (union-find, incl. the adopting resolution's own
     number and, for citation-less clauses, the numbers cited by sibling
     clauses of the same resolution). Clusters are labelled through ~45 anchor
     numbers (751 → Somalia/Eritrea, 1267 → ISIL & Al-Qaida, 2140 → Yemen, …).
     Cross-regime "hub" citations (2664 humanitarian carve-out, 1452, 2462,
     2178, 1373) are excluded from clustering — resolution 2664 alone
     otherwise merges the DPRK and South Sudan regimes into one chain.
   - **Target-first rule**: when the extend/renew verb directly governs a
     panel or the measures ("extend … the mandate of the Panel of Experts"),
     the clause belongs to the sanctions regime even when a mission is
     mentioned in passing (Mali panel renewals reference MINUSMA support).
3. **Kind** ∈ `mission | sanctions | panel | authorization` (the spec's three
   kinds plus `authorization` for renewals of non-UN forces and standing
   authorizations — ISAF, EUFOR Althea, AMISOM/ATMIS, Syria cross-border,
   counter-piracy — which are the same heartbeat dynamic).
4. **Dedupe** to one renewal per (resolution, chain): prefer the clause that
   extends the *mandate* itself, then explicitly dated clauses; on ties keep
   the shortest positive leash (old dossiers bundle neighbouring resolutions'
   clauses under one symbol — the bundled copy always has an implausibly long
   leash). A second pass keeps, per (chain, expiry date), only the
   latest-adopted resolution, removing the same dossier duplicates in the
   other direction. Verified: UNDOF 1990–92 comes out as 655→679→695→722→756…
   with the correct 6-month cadence.
5. **Plausibility filter**: `0 < leash < 1500 days`, adoption year ≥ 1990.

Output: `website/src/data/sc-renewals.json` — **1,049 renewals in 90 chains**
(~205 KB, committed).

### Precision (hand-check)

26 stratified random extractions (13 missions, 6 panels, 3 sanctions, 4
authorizations; `website/scripts/handcheck-sc-renewals.mjs` reprints any
sample against the source paragraphs) were verified against the resolution
texts:

- **26/26 correct chain attachment** (symbol, chain, kind);
- **25/26 exact expiry dates**; the one miss (S/RES/1444: "one year *beyond*
  20 December 2002" was anchored at the adoption date, 23 days short) was
  fixed by extending the anchor regex — re-verified exact after the fix.
- Two rows involve defensible scope choices rather than errors: S/RES/1647
  renews Liberia arms/travel measures for 12 months and diamonds/timber for 6
  months (one row is kept, the 6-month one, per the shortest-leash tie rule);
  S/RES/1859's Development-Fund-for-Iraq arrangements ride in the
  "Multinational force in Iraq" chain.

An earlier 26-row sample from the first extraction pass surfaced (and led to
fixes for) the Mali-panel/MINUSMA misattachment and the "beyond" anchor;
combined hand-checked rows across both rounds: 52. Estimated precision of the
final dataset: **≥ 96 % exact dates, ~100 % correct chain attachment**.

### Recall

Benchmarked against the canonical UNIFIL renewal list (54 renewals 1990–2025,
S/RES/648 … S/RES/2790): **54/54 after fixes = 100 %** (three were initially
missed: OCR-garbled "31 J uly 1992" in S/RES/734, recovered via the period
pattern; S/RES/1583/1614 name UNIFIL only in the preamble, recovered via the
context fallback). UNDOF (73), UNFICYP (72 of 74 — see limitations) and
MINURSO (66) similarly read as complete series. Across all chains, 7 clauses
remain unresolved-and-dropped (each individually reviewed: troop-ceiling
adjustments and an inter-mission redeployment — correctly excluded).

## Findings

- **The typical leash has doubled.** Median leash of all renewals: ~180 days
  through the 1990s (low point 136 d in 1995–99), jumping to ~365 days around
  2007 and staying there. The Council moved from semiannual to annual
  housekeeping — the once-common one-, two- and three-month extension has
  almost disappeared from routine practice.
- **Technical rollovers are the distress signal.** MINURSO's row is a solid
  band of red/amber micro-extensions through the 1990s (referendum
  negotiations); recent red slivers mark UNMISS 9-day (2016), UNISFA 10-day
  (2021) and UNSMIL 15-day rollovers — each one a Council deadlock visible at
  a glance.
- **The 6-month club is structural, not conjunctural.** UNDOF (every renewal
  183–193 d since the 1970s), UNFICYP and UNIFIL-until-2000 sit on permanent
  semiannual leashes tied to the Middle East files; UNIFIL switched to annual
  leashes after the 2006 war (res. 1701).
- **Sanctions regimes beat annually, slightly out of phase**: measures renewed
  to month X, the panel of experts to X+1 (the panel must report before the
  measures expire) — visible as regular 13-month panel segments.
- **Sorting by current leash works as designed**: UNDOF, Somalia/Eritrea
  sanctions and MINURSO float to the top of the active list; the calm annual
  chains (UNIFIL, ISIL & Al-Qaida sanctions) sink to the bottom.

## Implementation

- `website/scripts/extract-sc-renewals.mjs` — extraction (re-run to refresh);
  `website/scripts/handcheck-sc-renewals.mjs` — verification sampler.
- `website/src/data/sc-renewals.json` — committed dataset.
- `website/src/lib/sc-renewals.ts` — typed loader; splits chains into
  active/ended, computes the median trend.
- `website/src/components/MandateHeartbeat.tsx` — client component: median
  trend (SVG line, semantic gridlines at 3 mo / 6 mo / 1 yr) + heartbeat gantt
  (one row per chain, segments coloured by leash bucket: ≤ 3 mo red `tier-1`,
  ≈ 6 mo amber `tier-2`, ≈ 1 yr+ `un-blue`; palette validated for CVD
  separation — the un-blue contrast warning is relieved by the always-visible
  legend and hover readout). Hover shows chain, resolution, dates and leash in
  a fixed status line (no clipping tooltips); every segment links to the
  site's own `/mandate/S/RES/…` page (all S/RES symbols exist in
  `unified_documents`). Ended chains (64) sit behind a "Show ended…" toggle.
  On narrow screens the timeline starts scrolled to the present with sticky
  row labels.
- Wired into `website/src/app/secretariat/page.tsx`, Organs section, as an
  `ExpandableCard` with `id="renewals"`.

## Limitations

- **Renewal-clause scope**: only *extend/renew* language is captured.
  Authorizations phrased "authorizes Member States … to maintain … until"
  without extend/renew (many AMISOM cycles) are out of scope, so the
  AMISOM/ATMIS row is sparse. Initial *establishments* ("decides to establish
  … for a period of …") are intentionally excluded — the chart is about
  renewals.
- **Open-ended mandates never appear** (UNTSO, UNMOGIP, UNMIK post-1999): no
  expiry, no heartbeat. Stated in the chart's source note.
- **Old dossier OCR**: two UNFICYP renewals of 1993 are unrecoverable — one
  garbled beyond the verb ("Extmdsot1ce"), one truncated mid-clause *in the
  source table itself* ("…(UNFICYP) for a"). Visible as a small 1993–94 gap.
- **Leashes > 1500 days are dropped** as implausible; this also drops a
  handful of genuine 4–10-year extensions (some 1267 Monitoring Team and 1540
  Committee cycles), slightly thinning those chains.
- **Kind for mixed resolutions** is the kind of the clause that won the
  dedupe (usually the panel clause, the later expiry), so a regime's row mixes
  measures- and panel-dated segments; the underlying resolution is one click
  away.
- The DB was accessed strictly read-only throughout (single SELECT per run).

## Screenshots (committed)

| File | View |
| --- | --- |
| `screenshots/heartbeat-1440-final2.png` | Desktop 1440 px, default (22 active chains) |
| `screenshots/heartbeat-1440-ended.png` | Desktop, ended chains expanded — the 1990s mission "waterfall" |
| `screenshots/heartbeat-1440-hover.png` | Hover readout (UNDOF, S/RES/1605(2005), 197 days) |
| `screenshots/heartbeat-390-sticky.png` | Mobile 390 px — sticky labels, auto-scrolled to the present |
