# Mandate registries across the UN system

A taxonomy and survey of systems that compile governing-body mandates,
resolutions and decisions across the UN system, used to populate the
"Mandate Registry" column on the `/system` page
(`website/src/data/un-system.json`).

Method: four parallel research agents surveyed all 29 organizations in the
dataset (July 2026). Every URL below was fetched and verified at the time of
the survey; several sites (imf.org, unicef.org, undp.org, e-unwto.org,
unido.org, iaea.org, ifad.org) block non-browser clients and were verified
via a headless browser.

## Feature taxonomy

Six binary features describe what such a system does. They are largely
independent; the tiers below are the combinations that actually occur.

| Feature | Question it answers |
| --- | --- |
| `sources` | Are the resolution/decision texts compiled and publicly findable? |
| `searchable` | Structured cross-session search (not per-session PDF lists)? |
| `inForce` | Does it track which decisions are current vs superseded/repealed? |
| `requests` | Are decisions decomposed into individual operative requests? |
| `implementation` | Is there public per-request/resolution implementation status? |
| `resources` | Are mandates linked to budgets/resources? |

## Tiers

An ordinal ladder of "registry-ness", derived from the features:

| Tier | Name | Criteria (roughly) | Who |
| --- | --- | --- | --- |
| 0 | None | nothing public | CTBTO, UNCDF (via UNDP), UNESCO¹ |
| 1 | Document archive | `sources` only: per-session lists or PDF compilations | IFAD, IMO, UNIDO, UPU, UN Tourism, WIPO, ICC, ISA, OPCW |
| 2 | In-force compilation | `sources` + `inForce`: curated consolidation of currently-valid decisions, periodically republished | ICAO, ITU |
| 3 | Resolutions database | + `searchable`: structured cross-session query interface; may add `inForce` lineage | WHO, FAO, IAEA, IOM, IMF, WTO, ILO, WFP, World Bank, **mandates.un.org** |
| 4 | Implementation tracker | + `requests` and/or `implementation`: per-decision status | WMO, UN-Habitat, UNEP, UNDP, UNFPA, UNICEF |

¹ UNESCO has publicly acknowledged the gap: document 43 C/OEWG/2/INF.3.REV.2
(18 May 2026) recommends to "establish a centralized decision-tracking
system, to improve accountability, transparency and effective monitoring by
governing bodies, aligned with the United Nations Mandate Register".

### Notable findings

- **WMO is the closest peer to a full mandate registry** anywhere in the
  system: a resolutions/decisions database (filterable by body, session,
  in-force status, strategic objective) plus a public requests tracker —
  545 individual requests from Congress/EC, each with addressee, deadline
  and status (including "Delayed").
- **UN-Habitat is the only organization linking mandates to resources**: its
  Assembly resolution tracker shows per-resolution implementation status,
  financial requirements and funding gaps.
- **mandates.un.org itself is tier 3 by these criteria**: `sources`,
  `searchable`, `inForce` (version/supersession tracking) and — uniquely at
  system scale — `resources`, but no `implementation` status. On the
  implementation axis, WMO, UN-Habitat and UNEP are ahead of it.
- The tier-4 funds/programmes (UNDP, UNFPA, UNICEF) qualify only in weak
  form: annual PDF tracking tables covering time-bound Executive Board
  requests, not a queryable system.
- No organization combines sources, requests, implementation status and
  resources. That combination is the open ambition.

## Survey results by organization

Tier in parentheses; all URLs verified July 2026.

### UN Secretariat

- **UN Secretariat & PKO** (3): [UN Mandate Source Registry](https://mandates.un.org/) — mandate sources cited in the programme budget, searchable, version-aware, linked to budget structure. No implementation status.

### Funds and Programmes

- **UNDP** (4, weak): [Decisions of the Executive Board](https://www.undp.org/executive-board/decisions-of-the-board) — decision compilations 1994–2026 + annual decision-tracking tables (implementation status) 2016–2025, PDFs. Covers the joint UNDP/UNFPA/UNOPS Board.
- **UNFPA** (4, weak): [Decisions of the Board](https://www.unfpa.org/executive-board/decisions-board-listing) — decision texts in 6 languages + annual decision-tracking tables 2018–2026 monitoring time-bound requests.
- **UNICEF** (4, weak): [Decision monitoring tables](https://www.unicef.org/executiveboard/documents/decision-monitoring-tables) — annual matrices 2017–2026, status per time-bound request; decisions compendium at [/executiveboard/decisions](https://www.unicef.org/executiveboard/decisions).
- **WFP** (3): [Executive Board documents database](https://executiveboard.wfp.org/documents) — ~10,000 documents, filters by type/topic/session/year. Oversight-recommendation dashboards exist but are members-only.
- **UNEP** (4): [UNEA Monitoring & Reporting Portal](https://unea.unep.org/monitoring/) — inventory of UNEA resolutions/declarations/decisions with implementation-status and secretariat-reporting dashboards (created per UNEA res 4/22).
- **UN-Habitat** (4): [UN-Habitat Assembly Resolution Tracker](https://unhabitat.org/unhabitat-resolutions) — all Assembly resolutions with programmatic status, financial requirements and funding gaps; updated semi-annually (mandated by Assembly res 2/10).
- **UNCDF** (0): no system of its own; governed by the UNDP/UNFPA/UNOPS Board — see UNDP.

### Specialized Agencies

- **FAO** (3): [FAO Conference Resolutions Portal](https://resolutionsportal.fao.org/) — 1,287 resolutions since 1945, full-text search, tracks repeal/substitution lineage (`inForce`).
- **ICAO** (2): [Assembly Resolutions in Force](https://www.icao.int/events/a41/resolutions) (Doc 10184) — consolidated texts of all Assembly resolutions in force, periodic 6-language editions.
- **IFAD** (1): [Members Platform](https://webapps.ifad.org/members/gc) — per-session document sets incl. compiled Governing Council resolutions; no cross-session search.
- **ILO** (3): [Governing Body documents](https://www.ilo.org/governing-body/all-gb-documents) — filterable by session/type incl. "Record of decisions"; individual decision pages in EN/FR/ES. (NORMLEX covers standards, not GB decisions.)
- **IMF** (3): [Selected Decisions and Selected Documents](https://www.imf.org/en/publications/selected-decisions/selected-decisions-list) — Executive Board decisions and Board of Governors resolutions, per-decision pages, searchable.
- **IMO** (1): [Index of IMO Resolutions](https://www.imo.org/en/knowledgecentre/indexofimoresolutions/pages/default.aspx) + [IMODOCS](https://docs.imo.org/) (free registration) — indexes and meeting documents, no structured resolutions database.
- **ITU** (2): [Resolutions and Decisions of the Council](https://www.itu.int/pub/S-CONF-CL) — annual consolidated in-force compilation; PP Final Acts published per conference.
- **UN Tourism** (1): [E-Library General Assembly documents series](https://www.e-unwto.org/loi/unwtogad) — session documents incl. adopted-resolutions compilations 1975–2025 on a keyword-searchable publications platform.
- **UNESCO** (0/1): per-session [Executive Board decisions finding aid](https://www.unesco.org/en/legal-affairs/decisions-exb) via UNESDOC; centralized decision-tracking system explicitly absent and proposed (see footnote 1).
- **UNIDO** (1): per-session decisions-and-resolutions PDFs on [policymaking-organs pages](https://www.unido.org/resources/policymaking-organs/general-conference/sessions/14th-session/decisions-and-resolutions-general-conference).
- **UPU** (1): [Acts of the Union + Compendium of Congress decisions](https://www.upu.int/en/Universal-Postal-Union/About-UPU/Acts) — chronological PDF compilations since 1947, no search.
- **WHO** (3): [Portal of Resolutions and Decisions](https://resolutionsportal.who.int/) — WHA, Executive Board and all six regional committees, 1998–2025, 6 languages, filters incl. SDG/topic. The "mandate-tracking tool" from the AKN4UN project (EB154/33) is internal agenda management; public tracking exists only for governance-reform actions ([SIP tracking](https://www.who.int/about/governance/member-states-portal/tracking-secretariat-implementation-plan-(sip)-actions)).
- **WIPO** (1): annual [Assemblies decision lists](https://www.wipo.int/export/sites/www/about-wipo/en/assemblies/docs/a-65-list-decisions.pdf) + [meeting-documents browser](https://www.wipo.int/meetings/en/topic_bodies.jsp) per body.
- **WMO** (4): [Resolutions and Decisions database](https://tools.wmo.int/wmo-resolutions/index.php) — in-force resolutions/decisions filterable by body/session/type/strategic objective — plus [requests tracker](https://tools.wmo.int/wmo-resolutions/requests.php): 545 Congress/EC requests with addressee, deadline and implementation status.
- **World Bank** (3): [Boards of Governors resolutions](https://www.worldbank.org/en/about/leadership/governors) via the searchable Documents & Reports database (IBRD/IFC/IDA/MIGA collections).

### Related Organizations

- **CTBTO** (0): PrepCom documents distributed via a members-only system; nothing public.
- **IAEA** (3): [GC resolutions archive](https://www.iaea.org/gc-archives/type/resolutions) — 4,087 General Conference resolutions, filterable by session/type. General Conference only; no Board of Governors documents.
- **ICC** (1): [ASP resolutions by session](https://asp.icc-cpi.int/resolutions) 2002–2025 + [topical index](https://asp.icc-cpi.int/resolutions/ResolutionsTopical).
- **IOM** (3): [Council Resolutions database](https://governingbodies.iom.int/council-resolutions) — searchable table with category filters, PDF per resolution.
- **ISA** (1): per-session document pages (e.g. [30th session](https://isa.org.jm/sessions/30th-session-2025/)) with adopted decisions by symbol; no cross-session search.
- **OPCW** (1): [documents catalogue](https://www.opcw.org/resources/documents) — CSP/EC decisions as per-session PDF lists.
- **WTO** (3): [WTO Documents Online](https://docs.wto.org/dol2fe/Pages/FE_Search/FE_S_S001.aspx) — 310k documents, full-text search — plus a structured [Ministerial declarations list](https://www.wto.org/english/thewto_e/minist_e/min_declaration_e.htm).

## Display scheme (planned)

The `/system` page's Mandate Registry column shows one flagship system per
organization: a link chip with a four-dot fill meter (filled count = tier)
and a category label (Mandate Registry / Implementation Tracker / Decision
Tracking / Resolutions Database / Decisions Database / Documents Database /
Resolutions in Force / Session Documents). The tooltip gives the system's
proper name plus the six-feature checklist (absent features struck through).
Tier 0 renders as an em dash with an explanatory tooltip (UNESCO: proposal
pending; CTBTO: restricted; UNCDF: see UNDP). Data lives in the
`mandateRegistry` / `registryNote` fields of
`website/src/data/un-system.json`; rendering in
`website/src/components/UnSystemRegistryCell.tsx`.
