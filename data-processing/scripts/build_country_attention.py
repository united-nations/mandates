#!/usr/bin/env python3
"""Build the Country Attention Map dataset.

Reads two inputs produced from the read-only DB export step:
  /tmp/catalog_docs.csv   one row per catalog resolution: recid, yr, is_mandate, un_body, subjects_json
  /tmp/world-countries.json  cca3<->ccn3<->name lookup (npm world-countries)

Emits:
  website/src/data/country-attention.json        the precomputed choropleth dataset
  data/references/country-subject-mapping.csv     the auditable subject -> iso3 mapping

Attribution is DOCUMENT-LEVEL: a resolution counts once for every country any of
its subjects resolves to. Resolution rules (in order): exact curated match,
innermost parenthetical country (cities/provinces), then " SITUATION"/" QUESTION"
suffix strip. Regions/continents/seas and multi-successor historical states are
NOT attributed to a single country (documented as excluded).

DB access is read-only; this script only reads the exported CSV.
"""
import csv
import json
import os
import re
import sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DOCS_CSV = "/tmp/catalog_docs.csv"
WC_JSON = "/tmp/world-countries.json"
OUT_JSON = os.path.join(ROOT, "website", "src", "data", "country-attention.json")
OUT_MAP = os.path.join(ROOT, "data", "references", "country-subject-mapping.csv")

# ---------------------------------------------------------------------------
# Curated mapping: UNBIS geographic descriptor -> ISO-3166 alpha-3, or a
# non-country decision. The value is either an iso3 code, or one of the tokens
# REGION / SEA / EXCLUDE (with a note). Historical states resolve to their UN
# continuator/successor where one is unambiguous; ambiguous splits are EXCLUDE.
# ---------------------------------------------------------------------------
COUNTRY = {
    # --- Africa ---
    "ALGERIA": "DZA", "ANGOLA": "AGO", "BENIN": "BEN", "BOTSWANA": "BWA",
    "BURKINA FASO": "BFA", "BURUNDI": "BDI", "CABO VERDE": "CPV", "CAMEROON": "CMR",
    "CENTRAL AFRICAN REPUBLIC": "CAF", "CHAD": "TCD", "COMOROS": "COM", "CONGO": "COG",
    "CÔTE D'IVOIRE": "CIV", "DEMOCRATIC REPUBLIC OF THE CONGO": "COD", "DJIBOUTI": "DJI",
    "EGYPT": "EGY", "EQUATORIAL GUINEA": "GNQ", "ERITREA": "ERI", "ESWATINI": "SWZ",
    "ETHIOPIA": "ETH", "GABON": "GAB", "GAMBIA": "GMB", "GHANA": "GHA", "GUINEA": "GIN",
    "GUINEA-BISSAU": "GNB", "KENYA": "KEN", "LESOTHO": "LSO", "LIBERIA": "LBR",
    "LIBYA": "LBY", "MADAGASCAR": "MDG", "MALAWI": "MWI", "MALI": "MLI",
    "MAURITANIA": "MRT", "MAURITIUS": "MUS", "MOROCCO": "MAR", "MOZAMBIQUE": "MOZ",
    "NAMIBIA": "NAM", "NIGER": "NER", "NIGERIA": "NGA", "RWANDA": "RWA",
    "SAO TOME AND PRINCIPE": "STP", "SENEGAL": "SEN", "SEYCHELLES": "SYC",
    "SIERRA LEONE": "SLE", "SOMALIA": "SOM", "SOUTH AFRICA": "ZAF", "SOUTH SUDAN": "SSD",
    "SUDAN": "SDN", "TOGO": "TGO", "TUNISIA": "TUN", "UGANDA": "UGA",
    "UNITED REPUBLIC OF TANZANIA": "TZA", "ZAMBIA": "ZMB", "ZIMBABWE": "ZWE",
    # African territories (own iso3, may or may not render at 110m)
    "BRITISH INDIAN OCEAN TERRITORY": "IOT", "COMORIAN ISLAND OF MAYOTTE": "MYT",
    "SAINT HELENA": "SHN", "WESTERN SAHARA": "ESH",
    # --- Asia ---
    "AFGHANISTAN": "AFG", "ARMENIA": "ARM", "AZERBAIJAN": "AZE", "BAHRAIN": "BHR",
    "BANGLADESH": "BGD", "BHUTAN": "BTN", "BRUNEI DARUSSALAM": "BRN", "CAMBODIA": "KHM",
    "CHINA": "CHN", "CYPRUS": "CYP", "DEMOCRATIC PEOPLE'S REPUBLIC OF KOREA": "PRK",
    "GEORGIA": "GEO", "HONG KONG": "HKG", "INDIA": "IND", "INDONESIA": "IDN",
    "IRAN (ISLAMIC REPUBLIC OF)": "IRN", "IRAQ": "IRQ", "ISRAEL": "ISR", "JAPAN": "JPN",
    "JORDAN": "JOR", "KAZAKHSTAN": "KAZ", "KUWAIT": "KWT", "KYRGYZSTAN": "KGZ",
    "LAO PEOPLE'S DEMOCRATIC REPUBLIC": "LAO", "LEBANON": "LBN", "MACAU": "MAC",
    "MALAYSIA": "MYS", "MALDIVES": "MDV", "MONGOLIA": "MNG", "MYANMAR": "MMR",
    "NEPAL": "NPL", "OMAN": "OMN", "PAKISTAN": "PAK", "PHILIPPINES": "PHL",
    "QATAR": "QAT", "REPUBLIC OF KOREA": "KOR", "SAUDI ARABIA": "SAU",
    "SINGAPORE": "SGP", "SRI LANKA": "LKA", "STATE OF PALESTINE": "PSE",
    "SYRIAN ARAB REPUBLIC": "SYR", "TAJIKISTAN": "TJK",
    "TERRITORIES OCCUPIED BY ISRAEL": "PSE", "THAILAND": "THA", "TIMOR-LESTE": "TLS",
    "TÜRKİYE": "TUR", "TURKMENISTAN": "TKM", "UNITED ARAB EMIRATES": "ARE",
    "UZBEKISTAN": "UZB", "VIET NAM": "VNM", "YEMEN": "YEM",
    # --- Americas ---
    "ANGUILLA": "AIA", "ANTIGUA AND BARBUDA": "ATG", "ARGENTINA": "ARG",
    "BAHAMAS": "BHS", "BARBADOS": "BRB", "BELIZE": "BLZ",
    "BOLIVIA (PLURINATIONAL STATE OF)": "BOL", "BRAZIL": "BRA",
    "BRITISH VIRGIN ISLANDS": "VGB", "CANADA": "CAN", "CAYMAN ISLANDS": "CYM",
    "CHILE": "CHL", "COLOMBIA": "COL", "COSTA RICA": "CRI", "CUBA": "CUB",
    "DOMINICA": "DMA", "DOMINICAN REPUBLIC": "DOM", "ECUADOR": "ECU",
    "EL SALVADOR": "SLV", "FALKLAND ISLANDS (MALVINAS)": "FLK", "FRENCH GUIANA": "GUF",
    "GRENADA": "GRD", "GUATEMALA": "GTM", "GUYANA": "GUY", "HAITI": "HTI",
    "HONDURAS": "HND", "JAMAICA": "JAM", "MEXICO": "MEX", "MONTSERRAT": "MSR",
    "NICARAGUA": "NIC", "PANAMA": "PAN", "PARAGUAY": "PRY", "PERU": "PER",
    "PUERTO RICO": "PRI", "SAINT KITTS AND NEVIS": "KNA", "SAINT LUCIA": "LCA",
    "SAINT VINCENT AND THE GRENADINES": "VCT", "SINT MAARTEN": "SXM",
    "SURINAME": "SUR", "TRINIDAD AND TOBAGO": "TTO", "TURKS AND CAICOS ISLANDS": "TCA",
    "UNITED STATES": "USA", "UNITED STATES VIRGIN ISLANDS": "VIR", "URUGUAY": "URY",
    "VENEZUELA (BOLIVARIAN REPUBLIC OF)": "VEN",
    # --- Europe ---
    "ALBANIA": "ALB", "ANDORRA": "AND", "AUSTRIA": "AUT", "BELARUS": "BLR",
    "BELGIUM": "BEL", "BOSNIA AND HERZEGOVINA": "BIH", "BULGARIA": "BGR",
    "CROATIA": "HRV", "CZECHIA": "CZE", "DENMARK": "DNK", "ESTONIA": "EST",
    "FINLAND": "FIN", "FRANCE": "FRA", "GERMANY": "DEU", "GIBRALTAR": "GIB",
    "GREECE": "GRC", "HOLY SEE": "VAT", "HUNGARY": "HUN", "ICELAND": "ISL",
    "IRELAND": "IRL", "ITALY": "ITA", "LATVIA": "LVA", "LIECHTENSTEIN": "LIE",
    "LITHUANIA": "LTU", "LUXEMBOURG": "LUX", "MALTA": "MLT", "MONACO": "MCO",
    "MONTENEGRO": "MNE", "NETHERLANDS (KINGDOM OF THE)": "NLD", "NORTH MACEDONIA": "MKD",
    "NORWAY": "NOR", "POLAND": "POL", "PORTUGAL": "PRT", "REPUBLIC OF MOLDOVA": "MDA",
    "ROMANIA": "ROU", "RUSSIAN FEDERATION": "RUS", "SAN MARINO": "SMR", "SERBIA": "SRB",
    "SLOVAKIA": "SVK", "SLOVENIA": "SVN", "SPAIN": "ESP", "SWEDEN": "SWE",
    "SWITZERLAND": "CHE", "UKRAINE": "UKR", "UNITED KINGDOM": "GBR",
    # --- Oceania ---
    "AMERICAN SAMOA": "ASM", "AUSTRALIA": "AUS", "COCOS (KEELING) ISLANDS": "CCK",
    "COOK ISLANDS": "COK", "FIJI": "FJI", "FRENCH POLYNESIA": "PYF", "GUAM": "GUM",
    "KIRIBATI": "KIR", "MARSHALL ISLANDS": "MHL", "MICRONESIA (FEDERATED STATES OF)": "FSM",
    "NAURU": "NRU", "NEW CALEDONIA": "NCL", "NEW ZEALAND": "NZL", "NIUE": "NIU",
    "NORTHERN MARIANA ISLANDS": "MNP", "PALAU": "PLW", "PAPUA NEW GUINEA": "PNG",
    "PITCAIRN": "PCN", "SAMOA": "WSM", "SOLOMON ISLANDS": "SLB", "TOKELAU": "TKL",
    "TONGA": "TON", "TUVALU": "TUV", "VANUATU": "VUT", "WALLIS AND FUTUNA ISLANDS": "WLF",
    "BERMUDA": "BMU", "NETHERLANDS ANTILLES": "ANT",
}

# Historical / superseded states -> continuator successor (with note). Only the
# unambiguous continuator lineage is mapped; clean multi-way splits are EXCLUDE.
HISTORICAL = {
    "USSR": ("RUS", "Successor state: Russian Federation (UN seat continuator)"),
    "YUGOSLAVIA": ("SRB", "Successor lineage: Serbia (via FR Yugoslavia / Serbia and Montenegro)"),
    "SERBIA AND MONTENEGRO": ("SRB", "Successor: Serbia (continuator of the 2003-06 union)"),
    "GERMAN DEMOCRATIC REPUBLIC": ("DEU", "Absorbed into Germany (1990)"),
    "DEMOCRATIC YEMEN": ("YEM", "Merged into Yemen (1990)"),
    "TANGANYIKA": ("TZA", "Merged into United Republic of Tanzania"),
    "ZANZIBAR": ("TZA", "Merged into United Republic of Tanzania"),
    "SOUTHERN RHODESIA": ("ZWE", "Became Zimbabwe (1980)"),
    "RUANDA-URUNDI": ("EXCLUDE", "Split into Rwanda + Burundi (ambiguous)"),
    "CZECHOSLOVAKIA": ("EXCLUDE", "Split into Czechia + Slovakia (no continuator)"),
    "FEDERATION OF MALAYA": ("MYS", "Became Malaysia"),
    "FEDERATION OF MALI": ("EXCLUDE", "Split into Senegal + Mali (ambiguous)"),
    "TRIESTE (FREE TERRITORY)": ("EXCLUDE", "Divided between Italy + Yugoslavia (historical)"),
    "PANAMA CANAL ZONE": ("PAN", "Reverted to Panama"),
    # colonial administration territories (mostly tiny counts) -> excluded, documented
    "CAMEROONS UNDER BRITISH ADMINISTRATION": ("EXCLUDE", "Colonial trust territory (Nigeria/Cameroon)"),
    "CAMEROONS UNDER FRENCH ADMINISTRATION": ("CMR", "Became Cameroon"),
    "TOGOLAND UNDER BRITISH ADMINISTRATION": ("EXCLUDE", "Colonial trust territory (Ghana)"),
    "TOGOLAND UNDER FRENCH ADMINISTRATION": ("TGO", "Became Togo"),
    "SOMALILAND UNDER ITALIAN ADMINISTRATION": ("SOM", "Became part of Somalia"),
    "TERRITORIES UNDER PORTUGUESE ADMINISTRATION": ("EXCLUDE", "Multiple colonies (ambiguous)"),
    "PACIFIC ISLANDS (TRUST TERRITORY)": ("EXCLUDE", "Split into FSM/MHL/PLW/MNP (ambiguous)"),
    "NEW GUINEA": ("PNG", "Became Papua New Guinea"),
}

# Non-country geographic descriptors: regions, continents, oceans/seas.
REGIONS = {
    "AFRICA", "AFRICA SOUTH OF SAHARA", "CENTRAL AFRICA", "EAST AFRICA", "NORTH AFRICA",
    "NORTHEAST AFRICA", "SOUTHERN AFRICA", "WEST AFRICA", "PORTUGUESE-SPEAKING AFRICA",
    "SUDANO-SAHELIAN REGION", "INDIAN OCEAN REGION",
    "ASIA", "ASIA AND THE PACIFIC", "CENTRAL ASIA", "SOUTH ASIA", "SOUTHEAST ASIA",
    "SOUTHWEST ASIA", "WESTERN ASIA", "ARAB COUNTRIES", "MIDDLE EAST",
    "PERSIAN GULF REGION", "KOREAN PENINSULA", "INDO-CHINA",
    "AMERICAS", "ANDEAN REGION", "CARIBBEAN REGION", "CENTRAL AMERICA", "LATIN AMERICA",
    "LATIN AMERICA AND THE CARIBBEAN", "NORTH AMERICA", "SOUTH AMERICA",
    "SOUTH ATLANTIC OCEAN REGION",
    "EUROPE", "BALKAN REGION", "EASTERN EUROPE", "MEDITERRANEAN REGION",
    "SOUTHERN EUROPE", "WESTERN EUROPE",
    "OCEANIA",
}
SEAS = {
    "AEGEAN SEA", "ANTARCTICA", "CARIBBEAN SEA", "INDIAN OCEAN", "MEDITERRANEAN SEA",
    "RED SEA", "SOUTH ATLANTIC OCEAN", "POLAR REGIONS",
}

# Curated non-thesaurus / demonym / "question" geographic descriptors that
# appear as document subjects and clearly denote a country or territory.
EXTRA = {
    "PALESTINE": ("PSE", "curated", "Palestine"),
    "PALESTINE QUESTION": ("PSE", "curated", "Palestine question"),
    "PALESTINIANS": ("PSE", "curated", "Demonym -> State of Palestine"),
    "PALESTINE REFUGEES": ("PSE", "curated", "Palestine refugees"),
    "EAST JERUSALEM (STATE OF PALESTINE)": ("PSE", "curated", "East Jerusalem (occupied Palestinian territory)"),
    "GOLAN HEIGHTS": ("SYR", "curated", "Syrian territory occupied by Israel -> attributed to Syria"),
    "KOSOVO (SERBIA)": ("XKX", "curated", "Kosovo (own map polygon)"),
    "SYRIANS": ("SYR", "curated", "Demonym -> Syrian Arab Republic"),
    "AFGHAN REFUGEES": ("AFG", "curated", "Demonym -> Afghanistan"),
    "WESTERN SAHARAN REFUGEES": ("ESH", "curated", "Demonym -> Western Sahara"),
}

# Descriptors that look geographic but must NOT be attributed to a country.
EXCLUDE_EXPLICIT = {
    "JERUSALEM": "Contested final-status city (Israel/Palestine) - excluded, documented",
    "FORMER YUGOSLAVIA SITUATION": "Multi-successor situation - excluded",
    "FORMER YUGOSLAVIA": "Multi-successor - excluded",
    "KOREAN QUESTION": "Two-state peninsula question - excluded",
    "NAGORNY KARABAKH SITUATION": "Contested territory (Armenia/Azerbaijan) - excluded",
    "NAGORNY KARABAKH": "Contested territory (Armenia/Azerbaijan) - excluded",
    "GREAT LAKES REGION (AFRICA)": "Sub-continental region - excluded",
    "MALAGASY ISLANDS QUESTION": "Islands sovereignty dispute - excluded",
}

# Additional exact aliases (short forms UNBIS uses in QUESTION/SITUATION contexts).
ALIASES = {
    "EAST TIMOR": ("TLS", "Historical name of Timor-Leste"),
    "BRUNEI": ("BRN", "Short form of Brunei Darussalam"),
    "ANTIGUA": ("ATG", "Short form of Antigua and Barbuda"),
    "TANZANIA": ("TZA", "Short form"),
    "MALVINAS": ("FLK", "Falkland Islands (Malvinas)"),
    "KOSOVO": ("XKX", "Short form of Kosovo (Serbia)"),
    "WEST BANK": ("PSE", "Occupied Palestinian territory"),
    "GAZA STRIP": ("PSE", "Occupied Palestinian territory"),
    "GAZA": ("PSE", "Occupied Palestinian territory"),
    "ENGLAND": ("GBR", "Part of the United Kingdom"),
    "SCOTLAND": ("GBR", "Part of the United Kingdom"),
    "WALES": ("GBR", "Part of the United Kingdom"),
    "NORTHERN IRELAND": ("GBR", "Part of the United Kingdom"),
    "GREAT BRITAIN": ("GBR", "United Kingdom"),
    "SAINT KITTS-NEVIS": ("KNA", "Short form of Saint Kitts and Nevis"),
    "SAINT KITTS-NEVIS-ANGUILLA": ("KNA", "Historical federation -> Saint Kitts and Nevis"),
}

# Bilateral / multi-country situations -> every country involved.
MULTI = {
    "IRAQ-KUWAIT SITUATION": (["IRQ", "KWT"], "Bilateral situation -> Iraq + Kuwait"),
    "INDIA-PAKISTAN QUESTION": (["IND", "PAK"], "Bilateral question -> India + Pakistan"),
    "IRAN-IRAQ WAR (1980-1988)": (["IRN", "IRQ"], "Bilateral war -> Iran + Iraq"),
}

SUFFIXES = [" SITUATION", " QUESTION"]
PAREN_RE = re.compile(r"\(([^()]*(?:\([^()]*\)[^()]*)*)\)")


def build_resolver(name_by_iso, demonym_by_iso):
    """Return resolve(subject) -> (isos:list, method, note).

    isos is a possibly-empty list of iso3 codes; method is None for purely
    thematic (non-geographic) subjects.
    """
    exact = {}  # form -> (isos_list, method, note)
    for k, v in COUNTRY.items():
        exact[k] = ([v], "exact", name_by_iso.get(v, v))
    for k, (v, note) in HISTORICAL.items():
        exact[k] = (([] if v == "EXCLUDE" else [v]), "historical", note)
    for k, (v, m, note) in EXTRA.items():
        exact[k] = ([v], m, note)
    for k, (v, note) in ALIASES.items():
        exact.setdefault(k, ([v], "alias", note))
    for k, (vs, note) in MULTI.items():
        exact[k] = (vs, "multi", note)
    # demonym -> iso3 (e.g. "SUDANESE" -> SDN); used only after stripping REFUGEES
    dem = {d: iso for iso, ds in demonym_by_iso.items() for d in ds}

    def _lookup_base(base):
        if base in exact:
            return exact[base]
        if base in dem:
            iso = dem[base]
            return ([iso], "demonym", f"Demonym of {name_by_iso.get(iso, iso)}")
        return None

    def resolve(subject):
        s = subject.strip().upper()
        if s in EXCLUDE_EXPLICIT:
            return ([], "excluded", EXCLUDE_EXPLICIT[s])
        if s in REGIONS:
            return ([], "region", "Region/continent - not a single country")
        if s in SEAS:
            return ([], "sea", "Ocean/sea/polar - not a country")
        if s in exact:
            return exact[s]
        # innermost parenthetical: CITY (COUNTRY) / PROVINCE (COUNTRY : DISTRICT)
        matches = PAREN_RE.findall(s)
        for m in matches:
            inner = m.split(" : ")[0].strip()
            if inner in exact and exact[inner][1] in ("exact", "historical", "alias"):
                isos = exact[inner][0]
                return (isos, "parenthetical", f"Sub-national place in {name_by_iso.get(isos[0], isos[0]) if isos else inner}")
        # "REFUGEES FROM X" / "DISPLACED PERSONS FROM X"
        for pref in ("REFUGEES FROM ", "DISPLACED PERSONS FROM ", "REFUGEES FROM THE ", "PERSONS DISPLACED FROM "):
            if s.startswith(pref):
                base = s[len(pref):].strip()
                hit = _lookup_base(base)
                if hit:
                    return (hit[0], "refugees", f"Refugees/displaced from {name_by_iso.get(hit[0][0], base) if hit[0] else base}")
        # "X REFUGEES" (demonym or country form)
        if s.endswith(" REFUGEES"):
            base = s[: -len(" REFUGEES")].strip()
            hit = _lookup_base(base)
            if hit and hit[0]:
                return (hit[0], "refugees", f"Refugees of {name_by_iso.get(hit[0][0], base)}")
        # suffix strip: "X SITUATION" / "X QUESTION"
        for suf in SUFFIXES:
            if s.endswith(suf):
                base = s[: -len(suf)].strip()
                hit = _lookup_base(base)
                if hit:
                    return (hit[0], "suffix", f"{suf.strip().lower()} of {name_by_iso.get(hit[0][0], base) if hit[0] else base}")
                if base in REGIONS or base in SEAS or base in EXCLUDE_EXPLICIT:
                    return ([], "excluded", f"{suf.strip().lower()} of a region/excluded term")
        return ([], None, None)

    return resolve


def main():
    wc = json.load(open(WC_JSON))
    ccn3_by_iso = {c["cca3"]: c["ccn3"] for c in wc}
    name_by_iso = {c["cca3"]: c["name"]["common"] for c in wc}
    # patch entries world-countries lacks / names we prefer
    ccn3_by_iso.setdefault("XKX", "-99")
    name_by_iso.setdefault("XKX", "Kosovo")
    name_by_iso["PSE"] = "State of Palestine"
    name_by_iso["ESH"] = "Western Sahara"
    name_by_iso["COD"] = "DR Congo"
    name_by_iso["PRK"] = "North Korea"
    name_by_iso["KOR"] = "South Korea"
    name_by_iso["TZA"] = "Tanzania"
    name_by_iso["SYR"] = "Syria"
    name_by_iso["IRN"] = "Iran"
    name_by_iso["VEN"] = "Venezuela"
    name_by_iso["BOL"] = "Bolivia"
    name_by_iso["GBR"] = "United Kingdom"
    name_by_iso["USA"] = "United States"
    name_by_iso["RUS"] = "Russia"
    name_by_iso["LAO"] = "Laos"
    name_by_iso["MDA"] = "Moldova"
    name_by_iso["TUR"] = "Türkiye"
    name_by_iso["ARE"] = "United Arab Emirates"

    # demonym index: iso3 -> {DEMONYM forms}. Only used after stripping REFUGEES.
    demonym_by_iso = defaultdict(set)
    for c in wc:
        iso = c["cca3"]
        eng = (c.get("demonyms") or {}).get("eng") or {}
        for form in {eng.get("m"), eng.get("f")}:
            if form:
                demonym_by_iso[iso].add(form.upper())
    # manual demonym additions for UNBIS forms world-countries lacks/differs on
    for iso, forms in {
        "MMR": ["MYANMAR", "BURMESE"], "PSE": ["PALESTINIAN"], "ESH": ["WESTERN SAHARAN", "SAHRAWI"],
        "COD": ["CONGOLESE"], "TLS": ["EAST TIMORESE", "TIMORESE"], "PRK": ["NORTH KOREAN"],
        "KOR": ["SOUTH KOREAN"], "SYR": ["SYRIAN"], "LAO": ["LAO", "LAOTIAN"],
        "TJK": ["TAJIK", "TADZHIK"], "SLV": ["SALVADORIAN", "SALVADORAN"],
    }.items():
        demonym_by_iso[iso].update(forms)

    resolve = build_resolver(name_by_iso, demonym_by_iso)

    # accumulate
    rows = list(csv.DictReader(open(DOCS_CSV)))
    # per-subject stats for the audit CSV
    subj_all = defaultdict(int)
    subj_mandate = defaultdict(int)
    # per-country
    ctry = defaultdict(lambda: {
        "all": 0, "mandate": 0,
        "decades": defaultdict(lambda: [0, 0]),  # decade -> [all, mandate]
        "cosubj": defaultdict(int),
    })
    n_docs = 0
    n_docs_mandate = 0
    geo_doc_all = 0  # docs with >=1 resolvable geographic subject
    for r in rows:
        n_docs += 1
        is_m = r["is_mandate"] == "t"
        if is_m:
            n_docs_mandate += 1
        yr = int(r["yr"]) if r["yr"] else 0
        decade = (yr // 10 * 10) if yr else 0
        try:
            subs = json.loads(r["subjects_json"]) if r["subjects_json"] else []
        except Exception:
            subs = []
        isos = set()
        thematic = []  # subjects that carry no country (for co-subject tooltip)
        for s in subs:
            subj_all[s] += 1
            if is_m:
                subj_mandate[s] += 1
            r_isos, method, note = resolve(s)
            if r_isos:
                isos.update(r_isos)
            elif method is None:
                thematic.append(s)
        if isos:
            geo_doc_all += 1
        for iso in isos:
            c = ctry[iso]
            c["all"] += 1
            if is_m:
                c["mandate"] += 1
            if decade:
                d = c["decades"][decade]
                d[0] += 1
                if is_m:
                    d[1] += 1
            for s in thematic:
                c["cosubj"][s] += 1

    # build subject -> iso audit map (only geographic-relevant subjects)
    audit = []
    for s in sorted(subj_all, key=lambda x: -subj_all[x]):
        isos, method, note = resolve(s)
        if method is None:
            continue  # purely thematic, not geographic
        audit.append({
            "subject": s,
            "all_docs": subj_all[s],
            "mandate_docs": subj_mandate[s],
            "iso3": "+".join(isos),
            "ccn3": "+".join(ccn3_by_iso.get(i, "") for i in isos),
            "method": method,
            "note": note or "",
        })

    os.makedirs(os.path.dirname(OUT_MAP), exist_ok=True)
    with open(OUT_MAP, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["subject", "all_docs", "mandate_docs", "iso3", "ccn3", "method", "note"])
        w.writeheader()
        w.writerows(audit)

    # assemble country records
    countries = {}
    all_iso = set(ctry) | set(ccn3_by_iso)
    for iso in sorted(all_iso):
        ccn3 = ccn3_by_iso.get(iso)
        if not ccn3:
            continue
        c = ctry.get(iso)
        if c:
            top = sorted(c["cosubj"].items(), key=lambda kv: -kv[1])[:5]
            decades = {str(d): v for d, v in sorted(c["decades"].items())}
            rec = {
                "iso3": iso, "name": name_by_iso.get(iso, iso),
                "all": c["all"], "mandate": c["mandate"],
                "decades": decades,
                "topSubjects": [{"subject": s, "n": n} for s, n in top],
            }
        else:
            rec = {
                "iso3": iso, "name": name_by_iso.get(iso, iso),
                "all": 0, "mandate": 0, "decades": {}, "topSubjects": [],
            }
        countries[ccn3] = rec

    # never-mentioned = UN member states with 0 attention
    un_members = {c["cca3"] for c in wc if c.get("unMember")}
    never = sorted(
        [name_by_iso.get(iso, iso) for iso in un_members
         if (iso not in ctry or ctry[iso]["all"] == 0)]
    )
    # least-mentioned UN members (the honest inverse story when never is empty)
    member_counts = sorted(
        ((name_by_iso.get(iso, iso), (ctry[iso]["all"] if iso in ctry else 0)) for iso in un_members),
        key=lambda kv: (kv[1], kv[0]),
    )
    bottom = [{"name": n, "all": a} for n, a in member_counts[:20]]

    # coverage: geographic subject occurrences resolved vs total geographic-looking
    total_geo_occ = sum(subj_all[a["subject"]] for a in audit if a["iso3"])
    total_geo_occ_all = sum(subj_all[a["subject"]] for a in audit)

    meta = {
        "generated": "build_country_attention.py",
        "universe": "UN catalog resolutions (A/RES, A/DEC, S/RES, S/PRST, E/RES, E/DEC, A/HRC/RES, A/HRC/PRST) in the Digital Library, not deleted",
        "totalDocs": n_docs,
        "totalMandateDocs": n_docs_mandate,
        "docsWithCountry": geo_doc_all,
        "distinctCountriesMentioned": sum(1 for c in ctry.values() if c["all"] > 0),
        "geoSubjectsMapped": sum(1 for a in audit if a["iso3"]),
        "geoSubjectsTotal": len(audit),
        "geoOccurrencesMapped": total_geo_occ,
        "geoOccurrencesTotal": total_geo_occ_all,
        "neverMentionedCount": len(never),
    }

    out = {"meta": meta, "countries": countries, "neverMentioned": never, "leastMentioned": bottom}
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    json.dump(out, open(OUT_JSON, "w"), ensure_ascii=False, separators=(",", ":"))

    # report
    print("=== COVERAGE ===")
    for k, v in meta.items():
        print(f"  {k}: {v}")
    print(f"  geo subject mapping coverage (by occurrence): "
          f"{100*total_geo_occ/max(1,total_geo_occ_all):.1f}%")
    print("\n=== TOP 25 COUNTRIES (all resolutions) ===")
    ranked = sorted(ctry.items(), key=lambda kv: -kv[1]["all"])
    for iso, c in ranked[:25]:
        print(f"  {name_by_iso.get(iso, iso):28s} all={c['all']:5d} mandate={c['mandate']:4d}")
    print(f"\n  neverMentioned (UN members, {len(never)}): {', '.join(never) or '(none)'}")
    print(f"  leastMentioned (bottom UN members): "
          + ", ".join(f"{b['name']}({b['all']})" for b in bottom))

    # unmapped geographic-looking subjects for manual review
    print("\n=== UNMAPPED SUBJECTS containing a mapped-country token or looking geographic (review) ===")
    suspicious = []
    for s in sorted(subj_all, key=lambda x: -subj_all[x]):
        _isos, method, note = resolve(s)
        if method is not None:
            continue
        # heuristic: contains a country form as a token or a paren
        up = s.upper()
        if "(" in up or any(f in up for f in ("REFUGEES", "SITUATION", "QUESTION")):
            suspicious.append((s, subj_all[s]))
    for s, n in suspicious[:60]:
        print(f"  [{n:4d}] {s}")


if __name__ == "__main__":
    main()
