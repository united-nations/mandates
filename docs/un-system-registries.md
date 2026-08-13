# Mandate registries across the UN system

Scoring scheme and survey of systems that compile governing-body mandates,
resolutions and decisions across the UN system, used to populate the
"Mandate Registry" column on the `/system` page
(`website/src/data/un-system.json`). Per-organization detail lives in the
dossiers under [`system-registries/`](system-registries/README.md); this
file holds the scope rule, the scheme and the rollup.

Method: three verified research rounds (July 2026). Round 1: four parallel
agents surveyed all 29 organizations for registry-like systems (every URL
fetched; bot-blocking sites verified via headless browser). Round 2:
targeted follow-up on budget linkage, results linkage, active-mandate
status, and related-but-unlinked portals, written directly into the
dossiers. Gap-fill round (19 July 2026): six parallel agents added 13
entities missing from the original survey — surfaced by comparing the
`/system` list against CEB financial statistics and the UN system chart
(`un-system-chart-navigator`).

The ad-hoc grouping used in that round (two new sections taken from the
chart's `system_grouping`) is **superseded** by the CEB-anchored scope and
category rule below, which was adopted after the round closed. The
per-entity research in the dossiers stands; only scope and grouping change.

## Scope: which entities are listed

Ad-hoc inclusion produced inconsistencies (UNEP and UN-Habitat grouped by
one field, UNCTAD and ITC by another; entities excluded as "roll-ups" that
have their own governing bodies). The list is therefore defined by a rule
anchored entirely in the UN System Chief Executives Board (CEB), so that
every boundary is externally sourced and auditable.

### The rule

An entity is listed if **any** of the following holds:

1. it is a **CEB member organization** (31, per <https://unsceb.org/board-members/>);
2. it is named as **invited to CEB meetings** on the same page;
3. it **reports financial data to CEB** — i.e. appears in an expenses file
   or a main revenue file of the CEB financial statistics dataset.

**Exception (folding):** an entity that is part of the UN Secretariat, or a
UN organ with no governing body of its own, is *not* listed separately; it
is absorbed into the UN Secretariat row. This removes OHCHR (invited),
UNDRR and DPO (reporting), and IRMCT (reporting) — none of which has an
intergovernmental body that approves its own budget and programme.

No further exceptions are needed. The IMF and World Bank, excluded from
CEB financial reporting by their Bretton Woods arrangements, qualify under
leg 1 as full members; UNCTAD, whose spending consolidates into `UN`,
likewise qualifies as a member; the regional commissions qualify under
leg 2.

Result: **57 entities**, 14 more than the 43 carried after the gap-fill
round.

### Leg 3 in detail: what counts as "reporting to CEB"

The dataset (`/Users/david/UN/transparency/data/ceb/raw`, 9 CSVs, calendar
years 2011–2024) contains **75 distinct entity codes**, but they are not
equivalent:

- **55 codes** appear in an expenses file and/or `revenue.csv` /
  `revenue_sub_agency.csv`. These are CEB's genuine *reporting entities*
  and are what leg 3 means.
- **20 codes** appear only in donor-detail files — 18 of them solely in
  `revenue_non_gov_donors.csv`, which breaks out which office received a
  given private or foundation donation. These are reporting *granularity*,
  not separate reporting entities: 12 Secretariat departments (`UN-DESA`,
  `UN-OCHA`, `UN-OHCHR`, `UN-DPPA`, `UN-DCO`, `UN-OCT`, `UN-DSS`,
  `UN-DGC`, `UN-DGACM`, `UN-DMSPC`, `UN-DOS`, `UN-UNISDR`), the 5 regional
  commissions, `UN-UNCTAD`, and 2 spelling duplicates.

Using the wider 75 would add the 12 departments as rows with no governing
body of their own; using the narrower 55 alone would drop UNCTAD and the
regional commissions. Legs 1 and 2 supply exactly those, which is why all
three legs are needed.

### Deriving the CEB member categories

CEB states its composition — *"the United Nations, its 12 Funds and
Programmes, the 15 Specialized Agencies, and 3 Related Organizations"* —
but publishes the 31 members as a **flat, undifferentiated list**, with no
headings, badges or ordering by category. The per-entity mapping below is
therefore **derived, not quoted**. It is nonetheless forced:

- the **15 specialized agencies** are a legally fixed set (relationship
  agreements under Charter Arts. 57 and 63) — ILO, FAO, UNESCO, ICAO, WHO,
  World Bank Group, IMF, UPU, ITU, WMO, IMO, WIPO, IFAD, UNIDO, UN Tourism
  — exactly 15, all present in the list;
- of the 15 remaining non-UN members, the **3 related organizations** can
  only be IAEA, WTO and IOM, the sole three that are independent
  intergovernmental organizations rather than UN subsidiary organs;
- the **12 funds and programmes** follow by elimination.

Re-verify this derivation if CEB membership changes. Retrieved
19 July 2026.

### Categories

CEB's financial data carries **no organization-category column**, and its
published categories cover only the 31 members. The remaining entities are
placed using CEB's own two organizing principles, made explicit:

- **Funds and Programmes** = UN subsidiary organ with its own governing
  body (the property shared by all 12 CEB members in this category,
  including UNCTAD and UNODC);
- **Related Organizations** = independent intergovernmental organization
  linked to the UN by agreement, not a specialized agency.

Two further categories are needed. **Regional Commissions** are named as a
group by CEB itself. **Joint and hosted bodies** is not a residual
dustbin: all four members share one property — co-sponsored or hosted by
one or more CEB members while having their own governing body.

`*` marks entities whose secretariat is part of the UN Secretariat (the
convention the UN80 Mandate Implementation Review chart uses). It applies
to every regional commission as well.

| Category | n | Entities |
| --- | --- | --- |
| UN | 1 | UN Secretariat ᴹ — absorbing OHCHR ᴵ, UNDRR ᴿ, DPO ᴿ, IRMCT ᴿ |
| Specialized Agencies | 15 | FAO ᴹ, ICAO ᴹ, IFAD ᴹ, ILO ᴹ, IMF ᴹ, IMO ᴹ, ITU ᴹ, UN Tourism ᴹ, UNESCO ᴹ, UNIDO ᴹ, UPU ᴹ, WHO ᴹ, WIPO ᴹ, WMO ᴹ, World Bank ᴹ |
| Funds and Programmes | 22 | UNCTAD\* ᴹ, UNDP ᴹ, UNEP\* ᴹ, UNFPA ᴹ, UN-Habitat\* ᴹ, UNHCR ᴹ, UNICEF ᴹ, UNODC\* ᴹ, UNOPS ᴹ, UNRWA ᴹ, UN Women ᴹ, WFP ᴹ, UNU ᴵ, ITC\* ᴿ, Tech Bank ᴿ, UNCDF ᴿ, UNICRI ᴿ, UNIDIR ᴿ, UNITAR ᴿ, UNRISD ᴿ, UNSSC ᴿ, UNV ᴿ |
| Related Organizations | 10 | IAEA ᴹ, IOM ᴹ, WTO ᴹ, UNFCCC ᴵ, CTBTO ᴿ, ICC ᴿ, ISA ᴿ, ITLOS ᴿ, OPCW ᴿ, UNCCD ᴿ |
| Regional Commissions\* | 5 | ECA ᴵ, ECE ᴵ, ECLAC ᴵ, ESCAP ᴵ, ESCWA ᴵ |
| Joint and hosted bodies | 4 | UNAIDS ᴵ, IARC ᴿ, PAHO ᴿ, UNITAID ᴿ |

Provenance: ᴹ CEB member · ᴵ invited · ᴿ reports financial data.

### Regional commissions are both organ and entity

Each regional commission is simultaneously an ECOSOC subsidiary organ
whose member States meet in session and adopt resolutions, **and** a
Secretariat entity with an Executive Secretary at USG level and its own
PPB section under Part V. The abbreviation denotes both.

This is the same dual nature as UNEP/UNEA and UNCTAD/Trade and Development
Board, and it is modelled the same way: the commission is added to the
`bodies` dictionary and referenced as the `governingBody` of its own
entity row. Because they adopt resolutions, they carry a real mandate
corpus and are scored on the point scheme rather than left blank.

### Name aliases in the CEB data

CEB spells entities inconsistently across files. Canonical mapping:

| CEB code(s) | Canonical |
| --- | --- |
| `UN`, `DPO`, `UN-DPO` | UN Secretariat (DPO folded) |
| `UNHABITAT`, `UN-HABITAT` | UN-Habitat |
| `UNWOMEN` | UN Women |
| `UNWTO` | UN Tourism |
| `WB`, `WBG` | World Bank |
| `Tech Bank`, `UN-Tech Bank` | Technology Bank for LDCs |
| `UN-UNIDIR` | UNIDIR |
| `UNRISD`, `UN-UNRISD` | UNRISD |
| `UN-UNDRR`, `UN-UNISDR` | UNDRR (folded) |
| `UN-UNCTAD` | UNCTAD |
| `UN-ECA`, `UN-ECE`, `UN-ECLAC`, `UN-ESCAP`, `UN-ESCWA` | ECA, ECE, ECLAC, ESCAP, ESCWA |
| `UN-DESA`, `UN-OCHA`, `UN-OHCHR`, `UN-DPPA`, `UN-DCO`, `UN-OCT`, `UN-DSS`, `UN-DGC`, `UN-DGACM`, `UN-DMSPC`, `UN-DOS` | UN Secretariat (folded) |

### Known limitations

- **Treaty-secretariat asymmetry.** UNFCCC and UNCCD are listed because
  they report to CEB; the convention secretariats whose finances
  consolidate into UNEP are not — CBD, CITES, Basel/Rotterdam/Stockholm,
  Ozone/Montreal, CMS — despite identical COP governance. This survives
  every scope variant tested and is a known boundary, not an oversight.
- **Other bodies with their own governing bodies but no CEB standing** are
  likewise out: IOC (UNESCO), Codex Alimentarius, CFS, ITPGRFA, IPCC,
  CERF, UNGEGN, UNGGIM, ICSC, JIU, GEF, the Green Climate Fund and the
  Adaptation Fund.
- **Leg 2 is the soft leg.** The wording is *"the Executive Heads of other
  UN entities **may be invited by the Chair** of the Board to the CEB
  meetings"* — discretionary, and the named entities read as illustrative
  rather than a closed roster. It may drift; re-check on each round.
- **The category mapping for the 31 is derived, not published** (see
  above).
- **CEB financial data covers 2011–2024** and is not a complete picture of
  system spending: it excludes the Bretton Woods institutions entirely and
  reports regular-budget entities only inside the `UN` aggregate.

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
    **ITLOS** carries `on_display: false` there — open question whether
    either belongs on the `/system` page. Included pending a call.
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
