# External implementation sources — Round 2

Companion to [SOURCES.md](SOURCES.md) and [ANALYSIS.md](ANALYSIS.md). Round 1 built
`/missions` from the UN Peace & Security Data Hub (mission mandates, paper vs ground).
Round 2 adds **two more external sources**, each chosen by the same bar — bulk/machine
access, a *native* join key to our identifiers, and a genuine implementation/impact
story — and each deliberately covering a mandate type the missions work does **not**:

1. **SC Consolidated Sanctions List** — the *coercive* Security-Council side: does an
   authorised sanctions mandate translate into people and entities actually designated?
2. **UN Treaty Collection (MTDSG)** — the *normative* General-Assembly side: does a
   treaty the Assembly created actually get ratified, and enter into force?

Both join on identifiers we already hold (`S/RES/…` and `A/RES/…` document symbols /
UNBIS subjects), fetched by committed scripts, cached raw on
`/Volumes/SSDAStorage/un-mandates-impact2`, with small processed JSON in
`website/src/data/`.

---

## Source A — UN Security Council Consolidated Sanctions List

### What it is
The official, machine-readable roster of **every individual and entity currently
designated** under an active SC sanctions regime (asset freeze / travel ban / arms
embargo targets). One XML file, regenerated on every listing change.

### Access (score 3)
- Direct XML: `https://scsanctions.un.org/resources/xml/en/consolidated.xml`
  (2.1 MB, `dateGenerated` stamp; fetched 2026-07-21). Plain `curl`, no auth, no key.
- Schema `sc-sanctions.xsd`; `<INDIVIDUAL>` / `<ENTITY>` records carry `UN_LIST_TYPE`
  (the regime), `LISTED_ON` (designation date), `REFERENCE_NUMBER`, names, aliases.
- 736 individuals + 274 entities = **1,010 active designations** across **14 regimes**.

### Join key (score 3)
Every regime maps to (a) the SC resolution that **established** its sanctions committee
and (b) the country/thematic **UNBIS subject** its SC resolutions carry in our mirror.
Both are native to our data:

- All **14 establishing resolutions are present** in `digitallibrary.documents`
  (verified: 1267(1999), 751(1992), 1533(2004), 1718(2006), 1970(2011), 1988(2011),
  1591(2005), 2127(2013), 2140(2014), 2653(2022), 2048(2012), 2206(2015), 1518(2003),
  1737(2006)).
- **269 distinct `S/RES/…` sanctions resolutions** (and 5,475 total SC sanctions
  documents) join to the 14 regimes by `'SANCTIONS' = ANY(subjects)` + the regime's
  country/thematic subject.

### Implementation story (score 3)
The registry shows the **mandate** (resolutions authorising measures); this shows the
**enforcement output** (who was actually listed, and when). Paper vs ground, coercive side.

### Findings
1. **Every active sanctions mandate is grounded.** All 14 regimes' establishing
   resolution is in the registry, and 269 sanctions resolutions join to 1,010 live
   designations — a complete paper→enforcement ledger for SC coercive measures.
2. **Counter-terrorism dominates enforcement.** ISIL(Da'esh)/Al-Qaida alone accounts for
   **336 of 1,010** designations (33%) and is still actively adding names (last listing
   2026-03-30). One regime carries a third of the entire enforcement apparatus.
3. **The list outlives the mandate.** The Iran regime was *terminated* by res 2231 (2015),
   yet **121 Iran designations remain frozen** in the list; Iraq shows 46 sanctions
   resolutions and 1,256 sanctions documents but only 75 current listings — heavy paper,
   near-zero live enforcement (legacy 1518 Committee).
4. **Great-power deadlock freezes enforcement.** DPRK is the clearest case: **no new
   DPRK sanctions resolution since res 2397 (Dec 2017) and no new designation since March
   2018** — the mandate exists and is renewed politically but the committee has added
   nobody for 8 years. Taliban (last listing 2015) and Guinea-Bissau (2012) are similarly
   frozen while their regimes stay open.
5. **Designation cadence tracks crises.** Peak listing year is **2001 (141 designations)**,
   the post-9/11 Al-Qaida expansion; 2016–17 (DPRK) and 2010 are secondary peaks. Africa
   regimes (DRC, Sudan) are the only ones still adding names in 2026.

### Limitations
- The Consolidated List is a **snapshot of currently-listed** targets — delisted
  individuals are gone, so historical designation *volume* is undercounted (the
  `LISTED_ON` dates give the flow of *surviving* listings only).
- Regime→resolution join is by UNBIS subject, so thematic regimes (Al-Qaida via
  TERRORISM, Taliban via AFGHANISTAN) count fewer resolutions than the true lineage.
- The list proves designations happened, not that asset freezes were *implemented* by
  states — that is national-enforcement data we do not have.

### Data & scripts
- `data-processing/scripts/build_sanctions_implementation.py` → `website/src/data/sanctions-implementation.json`
- Raw XML cached at `/Volumes/SSDAStorage/un-mandates-impact2/consolidated.xml`.

---

## Source B — UN Treaty Collection (MTDSG) ratification status

### What it is
The UN's official depositary record for the multilateral treaties the **General Assembly
created**: for each treaty, its entry-into-force date and the full participation table
(every state's signature and ratification/accession date).

### Access (score 3, upgraded from Round 1's "1")
Round 1 scored UNTC low ("no official API"). Upgrade: the per-treaty status pages are
**plain-`curl` scriptable** — `https://treaties.un.org/Pages/ViewDetails.aspx?src=TREATY&mtdsg_no={IV-4}&chapter={4}&clang=_en`
returns the full participant table in a `…_tblgrid` HTML table. 23 treaties fetched and
parsed (party counts validated against known figures: CRC 196, CTBT 179, ATT 118, ICCPR 175).

### Join key (score 3)
The **GA resolution that adopted / opened each treaty** — an `A/RES/…` symbol, native to
our mirror. **22 of 23** adopting resolutions are present in `digitallibrary.documents`
(19 distinct; the covenants share res 2200(XXI)); the only miss is res 260(III) for the
1948 Genocide Convention, a known pre-1994 harvest gap. The join is **self-validating**:
each matched resolution's `display_title` literally names the treaty it adopted
(e.g. A/RES/61/106 → "Convention on the Rights of Persons with Disabilities").

### Implementation story (score 3)
The registry shows the **normative mandate** (the Assembly adopting a treaty); MTDSG shows
its **real-world uptake** (how many states became parties, whether it entered into force,
and the multi-decade ratification trajectory). Paper vs ground, normative side.

### Findings
1. **The normative mandate is grounded and vast.** 22 adopting resolutions in the registry
   link to treaties carrying **3,200+ state ratifications** in total — a concrete,
   dated impact chain from an `A/RES/…` symbol to a country's accession.
2. **A universality gradient by age and contestation.** The old core approaches
   universality (CRC 196, UNTOC 194, CRPD 193, UNCAC 192, ICERD 182); the newest and most
   contested lag far behind (ATT 118, CMW 60, CED 78) — newer mandates deliver a fraction
   of the uptake.
3. **CTBT: mandate produced, impact blocked for 30 years.** Adopted by GA res 50/245 in
   1996 with **188 signatories and 179 ratifications**, the Comprehensive Nuclear-Test-Ban
   Treaty **still has not entered into force** because Annex-2 hold-outs have not ratified.
   The registry holds the resolution; MTDSG shows the unfulfilled entry-into-force — the
   single starkest paper-vs-ground gap on the normative side.
4. **States accept the norm but resist the enforcement mechanism.** Every optional-
   protocol complaints procedure is dramatically under-ratified vs its parent treaty:
   CRC 196 → OP-CRC-IC 53 (−143); ICESCR 173 → OP-ICESCR 31 (−142); CAT 176 → OP-CAT 96;
   CEDAW 189 → OP-CEDAW 116. The mandate to create individual-complaint machinery lands
   far softer than the substantive-rights mandate.
5. **Implementation is measured in decades and still moving.** Median lag from adoption to
   entry into force is ~2 years but reaches 12.3 years (CMW); and core treaties are still
   gaining parties in 2025–2026 (CAT, CED, OP-CRPD) — a 1966/1984 mandate is still being
   "implemented" 40–60 years on.

### Limitations
- Curated treaty set (23 GA-created treaties across HR / crime / disarmament); MTDSG holds
  ~560 instruments but most were adopted at diplomatic conferences, not by a GA resolution,
  so are out of join scope. This is the *high-signal* GA-mandate subset, not all treaties.
- The adopting-resolution symbol is curated (one line per treaty, a documented fact); only
  the ratification data — the impact payload — is scraped live.
- Party counts can differ ±1–3 from headline figures where a cell holds two dates
  (definitive signature + ratification); parsing is transparent (last consent column).

### Data & scripts
- `data-processing/scripts/build_treaty_implementation.py` → `website/src/data/treaty-implementation.json`
- Raw HTML cached at `/Volumes/SSDAStorage/un-mandates-impact2/mtdsg/{mtdsg_no}.html`.

---

## Website integration — SHIPPED 2026-07-22

The spec below was **built** on this branch. What shipped and how it maps to the spec:

- **Route `/instruments`** (`website/src/app/instruments/page.tsx`) — one page, two
  anchored sections `#sanctions` and `#treaties`, added to the top nav as
  "Sanctions & Treaties" (`components/SiteHeader.tsx`, `Gavel` icon). Server Component,
  imports the two JSONs via typed accessors in `lib/sanctions-implementation.ts` and
  `lib/treaty-implementation.ts` (the `/missions` pattern; no DB at request time).
- **Charts** are server-rendered inline SVG in `components/InstrumentCharts.tsx`
  (`DesignationCadenceChart`, per-regime `RegimeCadenceSpark`, `ProtocolGapRow`) — same
  approach as `MissionDeploymentChart`, hover detail via native `<title>`.
- **Cross-link chips** (`components/MandateImplementationChips.tsx`) are wired into **both**
  the full mandate page and the intercepting modal (kept in sync); they render only when
  the document symbol matches a sanctions establishing resolution or a treaty adopting
  resolution, linking to `/instruments#sanctions` / `#treaties`.
- **Checks:** `pnpm typecheck` + `pnpm lint` clean on all new/edited files; verified at
  1440px and 390px (tables scroll within `overflow-x-auto`, no body overflow); chips
  validated against DRC/Al-Qaida/CRPD/covenants/CTBT via a temporary DB-free preview
  (removed before commit, since mandate pages need Postgres which is blocked locally).
- **Deviations from the spec below:** (1) a single `/instruments` route with two sections
  rather than a separate route each; (2) treaty "parties" bars scale to a 197 universality
  reference (not 193) because several non-member states are parties, so CRC's 196 would
  overflow a 193 scale; (3) the designation-cadence chart uses simple (not stacked) yearly
  bars — the list has no reliable per-regime delisting history to stack honestly.

Original spec (retained for reference):

Both datasets are static JSON in `website/src/data/`, so no DB call is needed at request
time — import directly in a Server Component, exactly like `/missions` imports
`mission-implementation.json`. Home: a **`/instruments`** route,
left-aligned, minimal, UN-blue accents per `website/docs/COLORS.md`.

### Sanctions section (`sanctions-implementation.json`)
- **Headline strip:** 14 regimes · 1,010 active designations (736 individuals / 274
  entities) · 269 sanctions resolutions in registry. Source + `list_generated` date footnote.
- **Regime table**, one row per `regimes[]`, sorted by `total_listed`:
  columns = regime `name`, `establishing_resolution` (link to
  `/mandate/…` or undocs.org via `symbol_normalized`), `sc_sanctions_resolutions_in_db`
  (the mandate volume), `individuals_listed` + `entities_listed` (the enforcement), and a
  "last designation" cell from `last_listing` — colour dormant (>3 yrs) vs active.
- **Designation-cadence chart:** stacked bars of `totals.listings_by_year` (or per-regime
  small multiples from `regimes[].listings_by_year`), highlighting the 2001 peak.
- **Callouts:** the Iran "list outlives the mandate" and DPRK "frozen since 2018" cases.

### Treaty section (`treaty-implementation.json`)
- **Headline strip:** 22 GA treaty-mandates in registry · 22 in force (CTBT the exception)
  · 3,200+ total ratifications.
- **Treaty table**, one row per `treaties[]`, grouped by `category`
  (Human Rights / Crime / Disarmament): columns = `short` (+ `name` tooltip),
  `adopting_resolution` (link to the mandate in our registry when
  `adopting_resolution_in_db`), `entry_into_force` (or a red "not in force" badge for CTBT),
  `parties` as a bar toward 193 (UN membership), and `signatories`.
- **Optional-protocol gap chart:** paired bars parent-vs-protocol
  (CRC/OP-CRC-IC, ICESCR/OP-ICESCR, CEDAW/OP-CEDAW, CAT/OP-CAT).
- **Callouts:** CTBT (adopted 1996, never in force) and the "still ratifying in 2026" note.

### Mandate-detail cross-links (both)
On a mandate/resolution detail page, if the resolution's `symbol_normalized` matches an
`establishing_resolution` (sanctions) or `adopting_resolution` (treaty), show an
"Implementation" chip: "→ 336 designations under this regime" / "→ 193 states parties,
in force since 2008". This is the tightest, most valuable surface — the impact lands on
the exact mandate that produced it.

### Refresh
Both build scripts take `--refresh`; re-run to re-pull the XML / MTDSG pages and rebuild
the JSON. Neither touches the DB except read-only `SELECT`s via `psql`.
