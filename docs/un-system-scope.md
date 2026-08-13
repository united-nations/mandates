# Scope of the UN system entity list

Which entities appear on the `/system` page
(`website/src/data/un-system.json`), and how they are categorized. The
mandate-registry scoring scheme that is applied to them lives in
[`un-system-registries.md`](un-system-registries.md); per-organization
detail lives in the dossiers under
[`system-registries/`](system-registries/README.md).

Adopted 19 July 2026, superseding the ad-hoc inclusion used in the
gap-fill round (two page sections taken from the UN system chart's
`system_grouping`). The per-entity research in the dossiers stands; only
scope and grouping change.

Ad-hoc inclusion produced inconsistencies (UNEP and UN-Habitat grouped by
one field, UNCTAD and ITC by another; entities excluded as "roll-ups" that
have their own governing bodies). The list is therefore defined by a rule
anchored entirely in the UN System Chief Executives Board (CEB), so that
every boundary is externally sourced and auditable.

## The rule

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

## Leg 3 in detail: what counts as "reporting to CEB"

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

## Deriving the CEB member categories

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

## Categories

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

## Regional commissions are both organ and entity

Each regional commission is simultaneously an ECOSOC subsidiary organ
whose member States meet in session and adopt resolutions, **and** a
Secretariat entity with an Executive Secretary at USG level and its own
PPB section under Part V. The abbreviation denotes both.

This is the same dual nature as UNEP/UNEA and UNCTAD/Trade and Development
Board, and it is modelled the same way: the commission is added to the
`bodies` dictionary and referenced as the `governingBody` of its own
entity row. Because they adopt resolutions, they carry a real mandate
corpus and are scored on the point scheme rather than left blank.

## Name aliases in the CEB data

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

## Known limitations

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
