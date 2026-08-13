# The mandates → reports lens: method, coverage, and audit

_2026-07-22 · builds `website/src/data/reports-lens.json` via
`website/scripts/build-reports-lens.mjs` (read-only over Azure Postgres);
consumed by `/reports` and the mandate detail pages through
`website/src/lib/data/reports-lens.ts`._

## What the lens is

Many mandates are requests for paper: a resolution asks the Secretary-General
(or a High Commissioner, Special Rapporteur, panel, …) to report back, and the
resulting report states which resolution it responds to. The lens links the two
sides **inside the mandate registry**:

1. **REQUESTED** — reporting obligations extracted from the operative
   paragraphs of registry resolutions with parsed full text
   (`mandates.paragraphs`). A paragraph counts when a requesting verb
   (_Requests, Also requests, Invites, Calls upon, …_) is followed in the same
   paragraph by a recognized addressee and a report-flavoured obligation
   (_to submit/present/prepare a report, to report, to keep the Council
   informed, …_). The reporting frequency (monthly … biennial, session-tied,
   "regularly", unspecified) is classified from the same sentence.
2. **DELIVERED** — UN Digital Library report records
   (`digitallibrary.documents`) whose notes or title carry a provenance
   statement ("Submitted pursuant to General Assembly resolution 77/205 …").
   These statements are parsed into normalized resolution symbols
   (`A/RES/…`, `A/HRC/RES/…`, `S/RES/n(yyyy)`, `E/RES/…`, decision variants).
3. **JOIN** — both sides are matched against `public.unified_documents` (the
   registry) on whitespace/case-normalized symbols. Only registry resolutions
   are kept in the JSON; dangling references are counted in the stats only.

## Coverage (build of 2026-07-22)

| Measure | Value |
| --- | --- |
| Resolutions with parsed full text (request denominator) | 2,829 |
| Reporting-request paragraphs detected | 2,586 |
| Resolutions with ≥ 1 detected request | 1,513 (53% of parsed) |
| DL report records with ≥ 1 parsed resolution link | 7,505 |
| Report→resolution link edges parsed | 9,286 |
| **Edges resolving to a registry resolution (linkage rate)** | **9,066 / 9,286 = 97.6%** |
| Requesting resolutions with ≥ 1 linked report (round-trip rate) | 904 / 1,513 = 59.7% |
| Registry resolutions carried in the lens (either side) | 4,850 |
| UNBIS topic overlap between report and resolution (Jaccard, n=8,997) | median 0.22 (p25 0.13, p75 0.40) |

Notes on the denominators:

- The 97.6% linkage rate is the share of *parsed* pursuant-links that point at
  a resolution the registry knows. The remaining 2.4% mostly reference
  resolutions outside the registry scope (e.g. very old or non-mandate
  resolutions).
- The 59.7% round-trip rate is deliberately conservative: it requires the
  *same* resolution to appear on both sides. Misses are dominated by recall
  limits on the delivered side (see failure modes), not by wrong links.
- Reports without a machine-readable pursuant note — common before the
  mid-1990s — contribute nothing, so the per-year series understates early
  decades.

## Hand-checked precision

Two independent random samples (the builder's `--probe` mode) of 20 requests +
20 delivered links each were audited by hand, n = 40 per side. For truncated
request excerpts, the full paragraph text was fetched from
`mandates.paragraphs` before judging.

### Requests — is the paragraph really a reporting obligation?

**40 / 40 correct detections** (95% binomial lower bound ≈ 91%). Two borderline
cases were counted as correct: A/HRC/RES/47/22 ¶2 and A/HRC/RES/35/31 ¶2 ask
the High Commissioner to *present findings orally* — a reporting obligation,
but not a written report.

Attribute quality within the correct detections (addressee + frequency):
**37 / 40 fully right (~93%)**. The three misattributions:

| Case | Problem |
| --- | --- |
| A/RES/423(V) ¶2 | Obligation is on **Member States** ("Invites all States to report annually **through** the Secretary-General"); the SG is only the conduit but is recorded as addressee. |
| A/RES/75/217 ¶24 | Addressee is the **UNFCCC secretariat**, recorded as generic "Secretariat". |
| A/HRC/RES/45/12 ¶11 | "submit … **prior to** its fiftieth session" not matched by the session rule → frequency recorded as `unspecified` instead of session-tied. |

### Delivered links — does the parsed symbol match the note?

**40 / 40 correct** (95% lower bound ≈ 91%). Every parsed edge in both samples
matches the verbatim "submitted/prepared pursuant to …" statement, including
multi-reference notes (A/80/75 → A/RES/46/182 + A/RES/79/140 + E/RES/2024/8),
Security Council year-style symbols (S/RES/2145(2014)), part letters, and
paragraph-scoped references ("pursuant to para. 249 of GA resolution 66/231").

### Observed recall misses (not precision errors)

- "**ECOSOC** resolution 2004/50" — the body-phrase regex only recognizes the
  spelled-out council name, so the abbreviation is skipped (A/60/89).
- "resolution 75/225 **and decision 74/537 B**" — a decision reference after a
  resolution list is not picked up (A/77/253).
- GA/HRC symbols cited without a body phrase at all are never attempted, by
  design (avoids false positives from annex listings).

## Reproduction

```bash
cd website
node --env-file=../.env scripts/build-reports-lens.mjs          # rebuild JSON
node --env-file=../.env scripts/build-reports-lens.mjs --probe  # fresh random audit samples + stats
```

The script is strictly `SELECT`-only. The JSON (~5 MB) is bundled server-side;
`src/lib/data/reports-lens.ts` is the sole accessor.

## Where it surfaces in the product

- `/reports` — overview page: headline stats, reports-per-year timeline,
  frequency and addressee distributions, per-organ table, "deepest reporting
  pipelines" ranking, and a methodology expander mirroring this document.
- `/mandate/[symbol]` (full page **and** intercepting modal) — a "Reporting
  cycle" section listing the resolution's detected requests and every report
  submitted pursuant to it, linking to the UN Digital Library records.

## Request → response: mapping report contents back to resolution paragraphs (2026-07-22)

The lens above links a report to its requesting resolution; this section goes a
level deeper for a curated set of pairs: what does the report actually *say*
about each individual request?

### Sample

Nine resolution→report pairs were selected from the lens for variety of organ,
topic and report type (data: `website/src/data/report-implementation-samples.json`):

| Resolution | Report | Topic |
| --- | --- | --- |
| A/RES/79/138 | A/80/292 | Humanitarian personnel safety |
| A/RES/77/205 | A/78/197 | Elimination of racism (Durban follow-up) |
| A/RES/79/40 | A/80/111 | Illicit small arms trade |
| A/RES/79/116 | A/80/239 | Criminal accountability of UN officials |
| A/RES/76/203 | A/77/218 | SIDS / Samoa Pathway |
| A/RES/73/346 | A/75/798 | Multilingualism |
| A/HRC/RES/42/7 | A/HRC/45/24 | World Programme for Human Rights Education |
| S/RES/1925(2010) | S/2010/512 | MONUSCO (DRC) |
| E/RES/2020/8 | E/CN.5/2022/4 | Madrid Plan of Action on Ageing |

### Method

1. English report PDFs were fetched from the UN Digital Library record files
   (cached on the external SSD at `/Volumes/SSDAStorage/report-mapping-cache/`,
   never the internal disk) and extracted with `pdftotext -layout`
   (`website/scripts/fetch-sample-reports.mjs`).
2. The full text of each requesting paragraph was pulled from
   `mandates.paragraphs` and decomposed into **individual deliverables** — a
   paragraph often bundles several (e.g. A/RES/79/138 ¶36 asks both for road-
   incident data collection *and* for preventive trainings; each is mapped
   separately). 39 requesting paragraphs → **43 mapped deliverables**.
3. Each deliverable was mapped against the report text (structure skim +
   targeted keyword search + close reading of candidate sections) and given:
   - a status: `addressed` / `partial` / `mention` (covered by reference to a
     third party's separate deliverable) / `silent`;
   - the report locations (section/paragraph citations);
   - a 1–2 sentence quote-grounded summary;
   - a **verbatim quote** where a response exists.

### Results

Status distribution across the 43 mapped deliverables:

| Status | n | Reading |
| --- | --- | --- |
| addressed | 20 | the report substantively answers the request |
| partial | 9 | answered incompletely, late, or with the requested angle missing |
| mention | 3 | covered only by reference to a separate deliverable |
| silent | 11 | nothing in the report responds |

Notable patterns:

- **The umbrella "report on implementation" request is always addressed** — it
  is the report's own raison d'être and typically restated in its first
  paragraph.
- **Silence is usually structural, not negligent**: most `silent` cases are
  deliverables owed to a *different* venue or date (a study due to the 2026
  Biennial Meeting, a panel summary due two sessions later, an oral Sixth
  Committee briefing), or conditional obligations ("report any failure…")
  where silence is ambiguous between "no incident" and "not reported".
- **`partial` often encodes honest bad news**: the multilingualism report shows
  language imbalances *deepening* despite the guidelines (A/75/798 ¶73), and
  the human-rights-education evaluation is built on only 26 State responses
  (A/HRC/45/24 ¶6).
- Secretary-General reports frequently answer several resolutions at once
  (A/80/111 answers 79/40 + 79/31; A/80/239 covers only one strand of its
  umbrella paragraph and defers the rest to companion reports).

### Validation and honest limits

- **Quote integrity (all 9 pairs)**: every quote in the dataset was checked
  programmatically against the extracted report text; all 44 quote segments
  match verbatim after normalizing PDF artifacts (line-break hyphenation,
  inline footnote markers). Four quotes were corrected during this check.
- **End-to-end re-check (2 pairs)**: pairs A/RES/79/40→A/80/111 and
  S/RES/1925(2010)→S/2010/512 were re-audited deliverable by deliverable with
  fresh searches. Outcome: 10 of 11 statuses confirmed; one was **downgraded**
  (79/40 ¶32 from `addressed` to `partial` — the UN-system support stocktake
  exists, but the requested best-practices/lessons-learned angle is only
  passing). One borderline stands documented: A/80/111 does mention "the
  alteration or obliteration of the markings of weapons", but as a CTED gap
  analysis, not the ¶34 study, so ¶34 remains `silent`.
- **Limits**: statuses are analyst judgments on a 4-point scale; `partial` vs
  `addressed` is genuinely fuzzy at the margins. The sample is small and
  hand-picked for interpretability — the UI labels it as curated samples, not
  coverage. Reports that answer a request in annexes not included in the main
  PDF text layer would be misclassified as silent (none observed in this set).

### Where it surfaces

- `/reports#implementation-samples` — "Inside the reports: from request to
  response": sample selector, two-column request/response alignment,
  status-coloured with expandable verbatim quotes.
- Mandate detail pages of the nine sampled resolutions link to the mapping
  from their "Reporting cycle" section.
