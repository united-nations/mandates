# Country Attention Map — analysis & method

**What it is.** A choropleth world map of *which countries UN resolutions are
about*, with a toggle between **all resolutions** and the subset that are
**mandate resolutions** (cited in the programme budget / mandate registry), plus
an era control (Cold War -> 2020s). It lives as an expander in the **Subjects**
section of `/secretariat` ("Which countries are the resolutions about?"), next to
the existing "Topic trends" expander.

- Component: `website/src/components/CountryAttentionMap.tsx` (client, inline SVG,
  d3-geo + world-atlas topojson — no heavyweight map library).
- Precomputed data: `website/src/data/country-attention.json` (84 KB).
- Basemap: `website/src/data/countries-110m.json` (world-atlas 110m, Kosovo id patched).
- Build script: `data-processing/scripts/build_country_attention.py`.
- Auditable mapping: `data/references/country-subject-mapping.csv` (542 rows).

## Universe

All non-deleted **catalog resolutions** in the UN Digital Library — the eight
symbol families the site already treats as the resolution catalog: `A/RES`,
`A/DEC`, `S/RES`, `S/PRST`, `E/RES`, `E/DEC`, `A/HRC/RES`, `A/HRC/PRST`.

- **41,811** resolutions total; **3,338** are mandate resolutions (their symbol is
  cited in `ppb2026.source_document_citations`).
- **11,229** resolutions name at least one country as a subject.

Attribution is **document-level**: a resolution counts once for every country any
of its subjects resolves to, deduplicated per document (so a resolution tagged
both `IRAN (ISLAMIC REPUBLIC OF)` and `TEHRAN (IRAN...)` counts once for Iran).

> Note on the brainstorm's "Ukraine = 1,393 since 2020": that figure is *all*
> Digital Library document types. Restricted to resolutions, Ukraine has 47 since
> 2020 (109 all-time). This lens is deliberately about **resolutions**, so its
> numbers are smaller and cleaner than the all-document tallies.

## Mapping method (subject -> ISO-3166)

Geographic subjects are UNBIS thesaurus descriptors in caps. The build script
resolves each subject with an ordered, curated rule set:

1. **Exact** curated country descriptor (226 forms, e.g. `SYRIAN ARAB REPUBLIC` ->
   SYR, `IRAN (ISLAMIC REPUBLIC OF)` -> IRN, decolonization territories like
   `GUAM` -> GUM).
2. **Parenthetical** — sub-national `CITY/PROVINCE (COUNTRY)` -> country
   (`DARFUR (SUDAN)` -> SDN, `ABKHAZIA (GEORGIA)` -> GEO, `CHORNOBYL (UKRAINE)` -> UKR).
3. **`REFUGEES FROM X` / `X REFUGEES`** -> country, via country form or demonym
   (`GEORGIAN REFUGEES` -> GEO, `MYANMAR REFUGEES` -> MMR).
4. **`X SITUATION` / `X QUESTION`** suffix strip -> re-match
   (`SOMALIA SITUATION` -> SOM, `EAST TIMOR QUESTION` -> TLS).
5. **Historical states** -> UN continuator/successor with a note (`USSR` -> Russia,
   `YUGOSLAVIA` -> Serbia, `SOUTHERN RHODESIA` -> Zimbabwe, `GERMAN DEMOCRATIC
   REPUBLIC` -> Germany). Clean multi-way splits with no continuator
   (`CZECHOSLOVAKIA`, `RUANDA-URUNDI`) are **excluded**.
6. **Curated territories / demonyms** — `WEST BANK`, `GAZA`, `TERRITORIES
   OCCUPIED BY ISRAEL`, `EAST JERUSALEM (STATE OF PALESTINE)` -> State of
   Palestine; `GOLAN HEIGHTS` -> Syria; `PALESTINIANS`/`SYRIANS` demonyms.
7. **Bilateral situations** -> every country involved
   (`IRAQ-KUWAIT SITUATION` -> Iraq + Kuwait; `INDIA-PAKISTAN QUESTION` -> both).

**Explicit non-country decisions (excluded from the choropleth, documented):**

- **Regions & continents** (39 terms): `AFRICA` (938 docs), `MIDDLE EAST` (391),
  `LATIN AMERICA`, `SOUTHERN AFRICA`, `CARIBBEAN REGION`... — no single flag.
- **Oceans/seas/polar** (7): `MEDITERRANEAN SEA`, `INDIAN OCEAN`, `ANTARCTICA`...
- **Contested final-status places** (9): `JERUSALEM`, `NAGORNY KARABAKH`,
  `KOREAN QUESTION`, `FORMER YUGOSLAVIA SITUATION` — attributing them to one state
  would be a political claim, so they are left off the map by design.

### Coverage

Of **28,284** geographic subject-occurrences on catalog resolutions:

| Outcome | Occurrences | Share |
|---|---|---|
| Attributed to a country | 23,673 | **83.7 %** |
| Non-country (region / sea / contested — excluded by design) | 4,611 | 16.3 % |

542 distinct geographic subjects are classified; **478** map to a country, and
**226** distinct countries/territories receive at least one mention. The 16.3 %
"unmapped" is almost entirely legitimate non-country geography (regions and seas),
not mapping failure — the largest single unmapped term is `AFRICA`.

### Hand-check (20 mappings, incl. tricky)

All verified correct against the source subjects:

| Subject | -> | Verdict |
|---|---|---|
| `USSR` | Russia | continuator ok |
| `YUGOSLAVIA` | Serbia | continuator lineage ok |
| `SOUTHERN RHODESIA` (+ QUESTION) | Zimbabwe | ok |
| `IRAQ-KUWAIT SITUATION` | Iraq + Kuwait | bilateral ok |
| `INDIA-PAKISTAN QUESTION` | India + Pakistan | bilateral ok |
| `DARFUR (SUDAN)`, `ABYEI (SUDAN)` | Sudan | sub-national ok |
| `ABKHAZIA (GEORGIA)`, `SOUTH OSSETIA (GEORGIA)` | Georgia | de-facto breakaway, de-jure Georgia ok |
| `CHORNOBYL (UKRAINE)` | Ukraine | ok |
| `EAST TIMOR SITUATION/QUESTION` | Timor-Leste | historical name ok |
| `FALKLAND ISLANDS (MALVINAS) QUESTION` | Falkland Islands | ok |
| `GOLAN HEIGHTS` | Syria | occupied Syrian territory ok |
| `WEST BANK` / `TERRITORIES OCCUPIED BY ISRAEL` | State of Palestine | ok |
| `GEORGIAN REFUGEES`, `SOUTH AFRICAN REFUGEES` | Georgia / South Africa | demonym ok |
| `GUAM/BERMUDA/CAYMAN... QUESTION` | own iso3 | C-24 decolonization list ok |
| `JERUSALEM` | — | contested, excluded ok |
| `KOREAN QUESTION` | — | two-state, excluded ok |
| `MIDDLE EAST` / `AFRICA` | — | region, excluded ok |
| `TERRITORIES UNDER PORTUGUESE ADMINISTRATION` | — | ambiguous colonial, excluded ok |
| `NAGORNY KARABAKH SITUATION` | — | contested, excluded ok |
| `ADDIS ABABA (ETHIOPIA)` | Ethiopia | city ok |

## Top findings

**All resolutions, all time (top 10):** State of Palestine **1,424**, Israel 921,
South Africa 799, Namibia 451, Syria 434, Lebanon 349, Somalia 346, Sudan 331,
DR Congo 323, Iraq 320. The distribution is a steep power law — Palestine alone is
named on ~1 in 30 of all resolutions ever adopted.

**The registry (mandate resolutions) tells a different story.** Top: Palestine 95,
Israel 63, Syria 57, Somalia 38, Libya 31, Yemen 31, DR Congo 29, South Sudan 28,
Afghanistan 28, Sudan 26. The apartheid/decolonization giants of the all-time list
(**South Africa 799 -> 2**, **Namibia 451 -> 4**) almost vanish, while **live peace
files rise** — Ukraine, Yemen, Libya, South Sudan, Myanmar, Belarus. The mandate
registry is a map of *today's* operations, not the historical agenda.

**The agenda moves with history (era control).**
- **Cold War (pre-1990):** South Africa 630, Palestine 505, Namibia 394, Israel
  293, Zimbabwe/Rhodesia 155 — apartheid, decolonization, the Middle East, Korea.
  (Russia/USSR's top co-subject in this era is *nuclear disarmament*.)
- **2020s:** the Middle East persists, but Ukraine, Myanmar and Belarus surface.

**The inverse story.** No UN member state is *entirely* absent from the resolution
record over eight decades — so "never on the agenda" is empty by construction, and
the lens says so honestly. But attention is astonishingly thin at the bottom:
**Singapore (2), Luxembourg (3), Iceland (4), Paraguay (6), Guyana/Malta/Trinidad
& Tobago/Uruguay (7)** — small, stable, uncontested states the Security Council and
Assembly essentially never name.

## Design notes (dataviz)

- **Sequential** single-hue ramp (UN blue, light -> deep navy); zero-mention shade
  is a distinct neutral blue-grey, no-data (territory absent from basemap) is a
  paler neutral — the three are visually separable.
- **Log-friendly binning** on a round 1-2-5 ladder, recomputed per active
  mode+era so the mandate view (max ~95) isn't washed out under the all view
  (max 1,424). Legend shows real count ranges.
- **Companion top-20 bar list** carries the countries the 110m basemap renders too
  small to read (and the whole thing at 390px, where the map is a thumbnail); it is
  the accessibility fallback for the choropleth.
- Hover tooltip: country, count (mode+era aware), all-vs-registry split, and the
  three thematic subjects it most co-occurs with.

## Limitations

- **Subject tagging is the ground truth**, not resolution text. A resolution about
  "peacekeeping financing" that never names a country contributes to no country;
  coverage of the *agenda* is therefore conservative.
- **Historical attribution is a judgement call.** Mapping USSR->Russia and
  Yugoslavia->Serbia loads Cold-War attention onto successor borders; the tooltip
  and this note make the choice explicit.
- **Occupied/contested places** are attributed to a single sovereign display for
  legibility (Golan->Syria, West Bank/Gaza->Palestine). Jerusalem and Nagorny
  Karabakh are excluded rather than assigned.
- **Small territories** (Montserrat, Bermuda, Cayman, Tokelau, Pitcairn and other
  C-24 Non-Self-Governing Territories, plus Kosovo) are in the data and the ranked
  list but several are absent from the low-resolution 110m basemap, so they do not
  receive a colour on the map.
- UNBIS geographic vocabulary evolves (e.g. `TURKIYE`, `ESWATINI`); the curated
  mapping is a snapshot and would need refreshing if the thesaurus changes.

## Screenshots

`screenshots/map-1440-all.png`, `map-1440-mandate.png`, `map-1440-coldwar.png`,
`map-390-all.png` (1440px desktop for each mode/era + 390px mobile).

## Reproduce

    # 1) export catalog docs (read-only) to /tmp/catalog_docs.csv via psql copy
    # 2) provide /tmp/world-countries.json (npm world-countries@5.1.0)
    python3 data-processing/scripts/build_country_attention.py

Outputs `website/src/data/country-attention.json` and
`data/references/country-subject-mapping.csv`, and prints coverage + top-country
diagnostics.
