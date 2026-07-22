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
