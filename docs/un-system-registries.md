# Mandate registries across the UN system

Scoring scheme and survey of systems that compile governing-body mandates,
resolutions and decisions across the UN system, used to populate the
"Mandate Registry" column on the `/system` page
(`website/src/data/un-system.json`). Per-organization detail lives in the
dossiers under [`system-registries/`](system-registries/README.md); this
file holds the scheme and the rollup; which entities are listed at all,
and how they are categorized, is defined in
[`un-system-scope.md`](un-system-scope.md).

Method: three verified research rounds (July 2026). Round 1: four parallel
agents surveyed all 29 organizations for registry-like systems (every URL
fetched; bot-blocking sites verified via headless browser). Round 2:
targeted follow-up on budget linkage, results linkage, active-mandate
status, and related-but-unlinked portals, written directly into the
dossiers. Gap-fill round (19 July 2026): six parallel agents added 13
entities missing from the original survey — surfaced by comparing the
`/system` list against CEB financial statistics and the UN system chart
(`un-system-chart-navigator`).

The ad-hoc grouping used in that round is **superseded** by the
CEB-anchored scope and category rule in
[`un-system-scope.md`](un-system-scope.md), adopted after the round closed.
The per-entity research in the dossiers stands; only scope and grouping
change.

## The point scheme

Five content points plus one reserved interoperability point. A point is
earned only where the information is tied to **specific governing-body
decisions/mandates** — budget transparency organized by strategic plan,
programme, or org-wide totals does not count (nearly every organization has
that via open.un.org, IATI, or its own transparency portal; those appear as
unscored "related" links instead).

| # | Point | Earned when… |
| --- | --- | --- |
| 1 | documents | decision/resolution texts are compiled and publicly findable |
| 2 | mandates | the system knows which decisions are active vs superseded/lapsed |
| 3 | budget | specific mandates are linked to budget/financial information |
| 4 | implementation | implementation status is reported per decision/request |
| 5 | results | results/outcomes are reported against specific decisions |
| 6 | interoperability | *(reserved)* aggregate of per-point form ratings (pdf 0 · searchable web ⅓ · download ⅔ · API 1), averaged over earned points |

Values are `true`, `'partial'` (half a point — linked but in weak form,
e.g. a document series rather than a system), or `false`. Intended
dependency: 2 ⇒ 1 and 3/4/5 ⇒ 2 — but this is enforced only as a
*warning*, because reality violates it: the funds and programmes (and WHO)
track implementation of recent decisions without maintaining any
active-mandate registry. That violation is itself a finding — they track
the new without knowing the stock.

## Scores (July 2026; round 2 + gap-fill round)

Entities marked † were added in the 19 July gap-fill round.

| Score | Organizations |
| --- | --- |
| 3.5 | **UN-Habitat** (documents, budget, implementation, partial results) |
| 3 | **WMO** (documents, mandates, implementation) |
| 2 | **UN Secretariat / mandates.un.org** (documents, mandates), UNDP, UNEP, UNFPA, UNICEF (documents, implementation), FAO, ICAO, IMF, ITU (documents, mandates), WHO (documents, partial budget, partial results), UN Women† (documents, implementation) |
| 1.5 | ILO (documents, partial implementation), UNFCCC† (documents, partial mandates) |
| 1 | WFP, IFAD, IMO, UN Tourism, UNIDO, UPU, WIPO, World Bank, IAEA, ICC, IOM, ISA, OPCW, WTO (documents only); UNHCR†, UNOPS†, UNODC†, UNAIDS†, UNCTAD†, UNCCD† (documents only) |
| 0 | UNCDF (see UNDP), UNESCO (gap acknowledged, system proposed¹), CTBTO (members-only); UNRWA†, ITC†, UNU†, UNITAR† (no scorable system), ITLOS† (judicial body — registry inapplicable) |

¹ 43 C/OEWG/2/INF.3.REV.2 (18 May 2026) recommends establishing "a
centralized decision-tracking system … aligned with the United Nations
Mandate Register".

### Notable findings

- **UN-Habitat leads the system**: its Assembly Resolution Tracker shows
  per-resolution implementation status *and money* (resolution 2/1:
  $1,085K required, $384K mobilized, $701K gap) — the only budget-linked
  mandate system found anywhere.
- **WMO** is the only organization combining an in-force resolutions
  database with per-request implementation tracking (545 requests with
  addressee, deadline, status).
- **WHO** is the only near-miss on budget linkage: its Programme Budget
  costs specific resolutions/decisions in aggregate (2024–25: 29
  resolutions + 23 decisions ≈ US$1.75bn) — as budget-document tables, not
  a queryable system (`'partial'`).
- **mandates.un.org scores 2 of 5**: documents and active mandates. Its
  budget linkage is structural (programme/section) with no monetary
  amounts, which does not clear the bar this scheme sets. Roadmap in one
  line: show the money (→3), track implementation (→4), report results
  (→5).
- **Results linkage barely exists anywhere**: only partial credits (UN-Habitat
  narrative outcomes; WHO's consolidated WHA progress-report series).
- **IMF's Selected Decisions is in-force by design** — lapsed and
  superseded decisions are deleted from the compilation.
- **ICC's omnibus resolution annex** is a yearly refreshed list of active
  intersessional mandates with per-mandate report-backs — a mandate
  registry on paper, not scored because it is not a system.

### Gap-fill round (19 July 2026)

- **The convention secretariats come closest among the new entities.**
  **UNFCCC** (1.5) pairs a searchable 1,034-decision database with an
  "SB Mandates" compilation flagging live-vs-concluded subsidiary-body
  mandates — but the latter is a periodically-refreshed PDF (latest public
  2022), so `'partial'`, not a queryable registry.
- **UNODC's RDDB** is the strongest documents case in this round: a
  queryable faceted full-text database (2,306 entries; facets Topic /
  Mandate Type / Adopted By / Year, 1946–2026). "Mandate Type" means
  Resolution-vs-Decision, *not* active-vs-superseded, so it stops at
  documents.
- **UN Women** (2) is a structural twin of UNDP/UNICEF: an Executive Board
  Decision Monitoring Matrix tracking implementation of time-bound requests
  per decision paragraph, no money, no active-mandate registry.
- **Judicial and advisory bodies don't fit the scheme.** **ITLOS** issues
  case law, not mandates, and its Meeting of States Parties takes only
  administrative decisions — registry inapplicable (null). **ITC**'s Joint
  Advisory Group is advisory only.
- **Uncertainties flagged for human review:**
  - The `documents` bar is where most borderline calls sit: UNAIDS,
    UNITAR, UNCCD and ITC all publish per-session decision PDFs that a
    stricter or looser reading could push across the `true`/`partial`/`0`
    line — scored here for consistency with existing precedent (UNESCO 0,
    UNDP/WTO documents = yes).
  - **UNCCD** is absent from the `un-system-chart-navigator` dataset, and
    **ITLOS** carries `on_display: false` there. *Resolved:* both report
    financial data to CEB, so both are in scope under the rule in
    [`un-system-scope.md`](un-system-scope.md).
  - A login-gated UNCTAD page (`/about/evaluation/mandates-trade-and-development-board`)
    could be a hidden TDB-mandate compendium; not inspectable without
    delegate access.
  - Several org sites (UNRWA, UNAIDS UBRAF portal, UNOPS data portal) are
    Cloudflare/JS-gated; a few findings rest on corroborated search
    snippets rather than a live render — noted per dossier.

### Still to research (14)

Entities brought in by the CEB scope rule that have no dossier yet:

| Entity | Why in scope |
| --- | --- |
| ECA, ECE, ECLAC, ESCAP, ESCWA | invited; own ministerial sessions adopt resolutions |
| PAHO | reports ($17.5bn) — inter-American treaty organization that also serves as WHO's regional office |
| UNITAID | reports ($1.6bn) — own Executive Board, WHO-hosted |
| IARC | reports ($0.36bn) — own Governing Council |
| UNV | reports ($0.15bn) — UNDP/UNFPA/UNOPS Executive Board |
| UNSSC | reports ($0.11bn) — own Board of Governors |
| UNIDIR | reports ($0.04bn) — own Board of Trustees |
| UNICRI | reports ($0.04bn) — own Board of Trustees |
| UNRISD | reports ($0.02bn) — own Board |
| Tech Bank | reports ($0.01bn) — own Governing Council |

Amounts are 2011–2024 totals from `expenses_sub_agency.csv`.

## Display scheme

The `/system` page's Mandate Registry column shows, per organization:

- **Five positional dots**, one per content point in fixed order
  (documents · mandates · budget · implementation · results): filled =
  earned, ring = partial, gray = not. All colored dots of a row take one
  color from the traffic-light ramp by total score (≥3.5 green `#276b35`,
  ≥2.5 teal `#2aa392`, ≥1.5 amber `#c9820f`, else red `#ab3a2c`; tokens
  `--color-tier-1…4` in `globals.css`, CVD-validated as a set — teal
  replaces lime because amber↔lime collapses under protanopia). The fill
  pattern, not the color, is the primary signal. Tooltip: the five point
  names with this organization's state and the total.
- **A link named after the actual system** ("Resolution Tracker",
  "Resolutions Portal", "Acts of the Union"…), category in the tooltip.
- **Related portals** (org-specific budget/results portals not linked to
  mandates) as muted dotted-underline links marked "not mandate-linked".
- No system at all: an em dash with an explanatory tooltip.

Data: `mandateRegistry` / `registryNote` / `related` fields in
`website/src/data/un-system.json`; rendering in
`website/src/components/UnSystemRegistryCell.tsx`. The JSON follows the
dossiers, never the other way around.
