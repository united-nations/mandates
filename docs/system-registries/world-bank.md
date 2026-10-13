# World Bank — World Bank

Dossier on registry-like systems for governing-body mandates. Part of the
survey behind the `/system` mandate-registry column; taxonomy and scoring
scheme in [`../un-system-registries.md`](../un-system-registries.md).

## Governing bodies

Bodies that adopt the World Bank's own mandates:

- **Boards of Governors** — <https://www.worldbank.org/en/about/leadership/governors>
  — one Governor and one Alternate per member country, usually the finance
  minister or central-bank governor. Top decision-making authority; most
  powers are delegated to the Executive Directors, but the Governors retain
  admission and suspension of members, changes to authorized capital stock,
  distribution of net income, and Articles amendments, and they adopt the
  annual resolutions approving the financial statements and the
  administrative budget (e.g. IBRD Resolution No. 717, FY26 budget).
  Mandate-adopting: **yes** (resolutions). Separate Boards for IBRD, IDA and
  IFC, and a Council of Governors for MIGA.
- **Boards of Executive Directors** — <https://www.worldbank.org/en/about/leadership/directors>
  — 25 Executive Directors "exercise powers delegated by the Boards of
  Governors", are "responsible for conducting the day-to-day business of the
  World Bank", "consider and decide on loan and credit proposals made by the
  President, and … decide policy issues that guide the general operations of
  the Bank". Mandate-adopting: **yes** in substance — this is where the
  operative decisions are taken. Proposed for addition this round.

**Excluded:** the **Development Committee** (`devcommittee.org`) is a joint
ministerial advisory committee of the Boards of Governors of the Bank and
the IMF; it issues communiqués and advice, not mandates. Its "parallel
resolutions" are adopted by the two Boards of Governors, not by it.

## Systems

- **Governors' Resolutions** (Resolutions Database) — <https://www.worldbank.org/en/about/leadership/governors>
  — live, re-verified 2026-08-13. The Governors page is the hub; it links
  four separate Documents & Reports collections, one per institution.
  Collection sizes measured via the public Documents & Reports API on
  2026-08-13:

  | Collection | Documents |
  | --- | --- |
  | IBRD Board of Governors Resolution | 732 |
  | IFC Board of Governors Resolution | 286 |
  | IDA Board of Governors Resolution | 256 |
  | MIGA Council of Governors Resolution | 122 |
  | **Total** | **1,396** |

  Current to the day: the newest IBRD entry is Resolution No. 720 of
  14 July 2026 (rules for the 2026 regular election of Executive Directors),
  stored 22 July 2026. Each record carries an abstract, document type, date,
  language and disclosure class.

## Point assessment

| Point | Assessment |
| --- | --- |
| 1 documents | yes — 1,396 Governors resolutions across four institutions in Documents & Reports, faceted by collection title and searchable, with a public JSON API |
| 2 mandates (active) | no — re-verified: the records carry disclosure class and dates, never an in-force/superseded status |
| 3 budget-linked | no — financial transparency (Finances One) is organized by institution and dataset (lending, guarantees, statements, admin budgets), not by Governors or Board resolutions; resolution texts (e.g. IDA replenishments, the FY26 administrative budget) contain amounts, but no system links the two |
| 4 implementation-linked | no — no per-resolution implementation status published |
| 5 results-linked | no — the WBG Scorecard tracks corporate-strategy indicators, not results against specific resolutions |
| 6 interoperability | deferred — but note the D&R API (`search.worldbank.org/api/v3/wds`, JSON, filterable by collection) is the strongest export capability found in this batch |

Total unchanged: **1**.

## Related portals (not linked to mandates)

- **Finances One** — <https://financesone.worldbank.org/> — live, data as of
  June 2026. WBG public financial data platform (IBRD/IDA lending, IFC
  investments, MIGA guarantees, financial statements, trust funds and FIFs,
  procurement, administrative budgets).
- **WBG Scorecard** — <https://scorecard.worldbank.org/> — live but
  JS-rendered; non-browser clients get only the loading shell
  ("Measuring Impact | World Bank Group Scorecard"). Corporate results
  indicators.
- **Governors' Portal** — <https://governorsportalext.worldbank.org> —
  **new this round, deliberately not listed**: gated behind Microsoft
  Entra ID sign-in ("for registered accounts only"), so its contents cannot
  be assessed. Raises the members-only question for the inclusion rule.

## Notes

- Documents & Reports is the disclosure channel for Board documents under
  the Access to Information Policy; Board and Committee minutes are
  referenced from the Executive Directors page but are not published as a
  resolution-style series.
- The Governors page URL doubles as the registry link because it is the only
  page that aggregates all four institutions' resolution collections; the
  per-institution `documentlist?colti=…` URLs are the actual lists.

## Open questions

- Round 3+: interoperability (point 6) — the D&R API is public and worth
  scoring properly; Finances One also has an API.
- Whether Executive Directors' decisions are published anywhere as a
  series (only minutes are referenced), which would matter if the Boards of
  Executive Directors are added as a governing body.

## Changes in this round

- Added a Governing bodies section; proposed adding the Boards of Executive
  Directors; Development Committee explicitly excluded as advisory.
- Quantified the Governors' resolutions corpus (1,396 documents, four
  collections) and confirmed currency to July 2026, via the public D&R API.
- Recorded the credential-gated Governors' Portal.
- Score unchanged at 1.

_Last verified: 2026-08-13 (research round 3, re-verification)._
