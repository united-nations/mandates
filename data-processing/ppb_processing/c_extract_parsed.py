import json
import re
from copy import deepcopy
from pathlib import Path

import pandas as pd
from natsort import natsorted
from rich import print
from tqdm import tqdm

from utils.data_cleaning import link_to_symbol, normalize_title, normalize_symbol
from utils.llm_extract_mandates import llm_extract_mandates


def find_section_with_heading(
    data: dict, heading_title: str, current_hierarchy: list | None = None
):
    if current_hierarchy is None:
        current_hierarchy = []
    found_blocks = []
    for block in data:
        block_text = block["text"] or ""
        if block_text == heading_title or block_text.endswith(" – " + heading_title):
            block["hierarchy"] = deepcopy(current_hierarchy)
            found_blocks.append(block)
        if block["children"] and len(block["children"]) > 0:
            current_hierarchy.append((block["block_type"], block["text"]))
            found_blocks.extend(
                find_section_with_heading(
                    block["children"], heading_title, current_hierarchy
                )
            )
            current_hierarchy.pop()
    return found_blocks



def get_mandates(
    section: dict,
    mandate_source: str | None = None,
    subprogramme: str | None = None,
    entity: str | None = None,
    file_name: str | None = None,
):
    if entity is None and "hierarchy" in section:
        h = dict(section["hierarchy"])
        entity = h.get("entity", h.get("entity-group", None))
        entity = (
            normalize_title(re.sub(r"^[0-9IVXLCDM]+\.\s*", "", entity))
            if entity
            else None
        )

    mandates = []
    current_subprogramme = subprogramme  # tracks last-seen SP heading across siblings
    for block in section["children"]:
        # the filename check is a dirty hack
        if block["block_type"].startswith("paragraph-") or "ACABQ" in file_name:
            if block["hyperlinks"]:
                sentences = block["text"].split(".")
                # remove numbers at start of sentences
                sentences = [
                    re.sub(r"^[0-9.]+\s*", "", s) for s in sentences if s.strip()
                ]
                sentences = [f"{s.strip()}." for s in sentences if s.strip()]
                for text, url in block["hyperlinks"]:
                    sentence = next((s for s in sentences if text in s), None)
                    mandate = (
                        text,
                        url,
                        sentence,
                        mandate_source,
                        subprogramme,
                        entity,
                    )
                    mandates.append(mandate)
        elif block["block_type"] == "table-content":
            for row in block["table_content"]:
                cell_text = row[0]["text"].strip()
                if not cell_text and not row[0]["hyperlinks"]:
                    continue  # skip empty rows
                description = row[1]["text"].strip() if len(row) > 1 else None
                hyperlinks = row[0]["hyperlinks"]
                cell_parts = [p.strip() for p in cell_text.split(";") if p.strip()]

                if hyperlinks:
                    used = set()
                    for anchor, url in hyperlinks:
                        symbol = anchor  # fallback if no cell part matches
                        for i, part in enumerate(cell_parts):
                            if i not in used and anchor in part:
                                symbol = part
                                used.add(i)
                                break
                        mandates.append((symbol, url, description, mandate_source, subprogramme, entity))
                    # emit unlinked parts that weren't covered by a hyperlink
                    for i, part in enumerate(cell_parts):
                        if i not in used:
                            mandates.append((part, None, description, mandate_source, subprogramme, entity))
                else:
                    for part in cell_parts or [cell_text]:
                        # secondary split for space-concatenated symbols like "ECE/CES/105 ECE/CES/107"
                        sub_parts = re.split(r'\s+(?=[A-Z][A-Z0-9]*/)', part)
                        for sub in sub_parts:
                            if sub.strip():
                                mandates.append((sub.strip(), None, description, mandate_source, subprogramme, entity))
        elif block["block_type"] in ["italic", "heading-x"]:
            mandates.extend(
                get_mandates(
                    block,
                    mandate_source=block["text"],
                    subprogramme=subprogramme,
                    entity=entity,
                    file_name=file_name,
                )
            )
        elif block["block_type"] in ["subprogramme", "heading-sub-sub"]:
            if block["block_type"] == "subprogramme" or re.match(r"^Subprog[ar]?amme\s+\d+", block["text"]):
                current_subprogramme = block["text"]
            mandates.extend(
                get_mandates(
                    block,
                    subprogramme=current_subprogramme,
                    entity=entity,
                    file_name=file_name,
                )
            )
        # elif block["block_type"] == "other":
        #     mandate = (block["text"], None, None, mandate_title, subprogramme, entity)
        #     mandates.append(mandate)
        else:
            print(f"Weird block type: {block['block_type']} – {block['text']}")
    return mandates


def get_subprogramme(subprogramme):
    if not subprogramme or pd.isna(subprogramme):
        return (None, None)
    m = re.match(r"^Subprog[ar]?amme\s+(\d+)", subprogramme)
    if not m:
        return (None, None)
    number = m.group(1)
    try:
        title = subprogramme.split("–")[1].strip()
        return (number, title)
    except IndexError:
        print(f"Warning: Could not extract subprogramme title: {subprogramme}")
        return (number, None)


def get_section_text(section: dict):
    text = ""
    hyperlinks = []
    for block in section["children"]:
        if block["block_type"] == "table-content":
            for row in block["table_content"]:
                for cell in row:
                    text += cell["text"] + " "
        else:
            text += (
                re.sub(r"^[0-9A-Z]+\.[0-9A-Z]+\s+", " ", block["text"]).strip() + " "
            )
        if "children" in block:
            for child in block["children"]:
                child_text, _, child_hyperlinks = get_section_text(child)
                text += child_text
                hyperlinks.extend(child_hyperlinks)
        if block["hyperlinks"]:
            hyperlinks.extend(block["hyperlinks"])
    entity = None
    if "hierarchy" in section:
        h = dict(section["hierarchy"])
        entity = h.get("entity", h.get("entity-group", None))
        entity = (
            normalize_title(re.sub(r"^[0-9IVXLCDM]+\.\s*", "", entity))
            if entity
            else None
        )
    return text.strip(), entity, hyperlinks


def add_metadata(df: pd.DataFrame, data):
    frontmatter = [block for block in data if block["block_type"] == "frontmatter"][0][
        "children"
    ]
    df["part"] = next(
        (
            block["text"].split(" ")[1]
            for block in frontmatter
            if block["text"].startswith("Part")
        ),
        None,
    )
    section = next(
        (block for block in frontmatter if block["text"].startswith("Section")), None
    )
    df["section"] = section["text"].split(" ")[1] if section else None
    section_title = (
        next(
            (
                block["text"]
                for block in section["children"]
                if block["block_type"] == "heading-x"
            ),
            None,
        )
        if section
        else None
    )
    df["section_title"] = normalize_title(section_title) if section_title else None
    programme = (
        section["children"][1]["text"]
        if section and len(section["children"]) > 1
        else None
    )
    if programme and programme.startswith("Special political missions"):
        parts = programme.split("–")
        if len(parts) > 1:
            entity = parts[1].strip()
        else:
            entity = section["children"][1]["children"][0]["text"]
        df["entity-long"] = df["entity-long"].fillna(entity)
    if programme and programme.startswith("Subprogramme"):
        df["subprogramme"] = (
            re.match(r"(Subprogramme\s+\d+)", programme).group(1).strip()
        )
        programme = (
            re.search(r"\s+(programme.*)$", programme).group(1).strip().capitalize()
        )
    if programme and programme.startswith("Programme"):
        df["programme"] = float(re.match(r"^Programme\s+(\d+)", programme).group(1))
        parts = programme.split("–")
        df["programme_title"] = (
            normalize_title(parts[1].strip().capitalize()) if len(parts) > 1 else None
        )
    else:
        df["programme"] = pd.NA
        df["programme_title"] = normalize_title(programme)
    _subprogramme_parsed = df["subprogramme"].apply(get_subprogramme)
    df["subprogramme_title"] = _subprogramme_parsed.str[1]
    df["subprogramme"] = _subprogramme_parsed.str[0]
    return df


def extract_mandates_for_file(data: dict, file_name: str):
    # extract mandates
    mandates = []
    for section in find_section_with_heading(data, "Legislative mandates"):
        _mandates = get_mandates(section, file_name=file_name)
        _mandates = [(*d, "Legislative mandates") for d in _mandates]
        mandates.extend(_mandates)
    background_sections = find_section_with_heading(data, "Mandates and background")
    for section in background_sections:
        _mandates = get_mandates(section, file_name=file_name)
        _mandates = [(*d, "Mandates and background") for d in _mandates]
        mandates.extend(_mandates)
        section_text, entity, hyperlinks = get_section_text(section)
        _llm_mandates = llm_extract_mandates(section_text, hyperlinks)
        _llm_mandates = [
            (
                d["mandate_symbol"],
                None,
                d["mandate_context"],
                d["mandate_source"],
                None,
                entity,
                "Mandates and background (LLM)",
            )
            for d in _llm_mandates
        ]
        mandates.extend(_llm_mandates)
    df = pd.DataFrame(
        mandates,
        columns=[
            "symbol",
            "link",
            "mandate_description",
            "mandate_source",
            "subprogramme",
            "entity-long",
            "part_in_document",
        ],
    )
    df = add_metadata(df, data)
    return df


def find_entity(row, df_sections_and_entities):
    if not pd.isna(row["entity-long"]):
        return row["entity-long"]
    try:
        entity = df_sections_and_entities[
            df_sections_and_entities["section"] == row["section_title"]
        ]["entity"].values[0]
    except:
        print(f"Could not find entity for section: {row['section_title']}, {row}")
        entity = None
    return entity


def reconstruct_mandate_source(symbol: str):
    if not symbol or pd.isna(symbol):
        return None # TODO: investigate what is going wrong with these
    if symbol.startswith("A/RES/"):
        return "General Assembly resolutions"
    elif symbol.startswith("S/RES/"):
        return "Security Council resolutions"
    elif symbol.startswith("A/HRC/"):
        return "Human Rights Council resolutions"
    elif symbol.startswith("E/RES/"):
        return "Economic and Social Council resolutions"
    return None


def extract_mandates(year: int):
    df_sections_and_entities = pd.read_csv(
        "../data/references/ppb_sections_and_entities.tsv", sep="\t"
    )
    df_entity_names = pd.read_csv("../data/references/entity_names.tsv", sep="\t")

    dfs = []
    q = tqdm(
        natsorted(Path(f"../data/processed/ppb{year}/json").glob("*.json")),
        desc="Processing files",
    )
    for file in q:
        q.set_description(f"Processing file: {file.name}")
        try:
            with open(file, "r") as f:
                data = json.load(f)
            df = extract_mandates_for_file(data, file.name)
            if df is not None:
                df["file"] = file.name
                addendum = re.search(r"ADD\.(\d+)(\.|_)", file.name.upper())
                df["addendum"] = addendum.group(1) if addendum else None
                dfs.append(df)
        except Exception as e:
            print(f"[yellow]Warning: skipping {file.name}: {e}[/yellow]")
        q.update(1)
    df = pd.concat(dfs)
    # when entity long is na, infer from section title and lookup table
    df["entity-long"] = df.apply(lambda row: find_entity(row, df_sections_and_entities), axis=1)
    df["entity"] = df["entity-long"].map(
        df_entity_names.set_index("entity_full_name")["entity_short_name"]
    )
    df["origin_document"] = f"PPB {year}"
    df["symbol"] = df["symbol"].apply(normalize_symbol)
    df["symbol"] = (
        df["symbol"]
        .str.split(";")
        .apply(lambda x: [normalize_symbol(s) for s in x] if x else None)
    )
    df = df.explode("symbol")
    df["full_document_symbol"] = df["link"].apply(link_to_symbol)
    df["mandate_source"] = df["mandate_source"].fillna(
        df["full_document_symbol"].apply(reconstruct_mandate_source)
    )
    df_no_llm = df[df["part_in_document"] != "Mandates and background (LLM)"]
    df_llm = df[df["part_in_document"] == "Mandates and background (LLM)"]
    df_llm.to_csv(
        f"../data/processed/ppb{year}/mandates_background_llm.csv",
        index=False,
    )
    # df_llm = pd.read_csv(
    #     f"../data/processed/ppb{year}/mandates_background_llm_revised.csv"
    # )
    df_llm["part_in_document"] = df_llm["part_in_document"].str.replace(" (LLM)", "")
    df = pd.concat([df_no_llm, df_llm])
    df = df.rename(
        columns={"mandate_description": "description", "mandate_source": "source"}
    )
    df = df[
        [
            "origin_document",
            "part_in_document",
            "file",
            "addendum",
            "part",
            "section",
            "section_title",
            "entity-long",
            "entity",
            # "priority_area",
            "programme",
            "programme_title",
            "subprogramme",
            "subprogramme_title",
            # "component",
            "description",
            "link",
            "symbol",
            "full_document_symbol",
            "source",
        ]
    ]
    return df


def extract(year):
    print("Processing documents to extract mandates…")
    df = extract_mandates(year)
    _df = df.copy()
    for col in _df.columns:
        _df = _df.rename(columns={col: col.replace("_", " ").title()})
    _df.to_csv(
        f"../data/processed/ppb{year}/all_mandates.csv", index=False
    )
    _df.to_excel(
        f"../data/processed/ppb{year}/all_mandates.xlsx", index=False
    )


# --- Peacekeeping mission (PKM) extraction -------------------------------------
# PKM budget reports are ACABQ documents (A/<session>/<n>/Add.<x>) with a flat
# structure (no programmes/subprogrammes). The legislative mandates live in a
# single "A. Mandate ..." subsection; the responsible mission is not in the
# document body and is resolved from the lookup table instead.


def load_pkm_mission_lookup(year: int) -> dict:
    """Map parsed-JSON filename -> (short, full) mission name for a budget cycle.

    Filenames mirror b_parse_downloaded: ``<symbol with / -> _>.json`` upper-cased
    (e.g. ``A/80/604/Add.1`` -> ``A_80_604_ADD.1.json``).
    """
    df = pd.read_csv("../data/references/peacekeeping_mission_budgets.csv")
    df = df[df["budget_cycle"] == year]
    return {
        row["document_symbol"].replace("/", "_").upper() + ".json": (
            row["short_name"],
            row["full_name"],
        )
        for _, row in df.iterrows()
        if pd.notna(row["document_symbol"])
    }


# the mandate subsection is enumerated inconsistently across missions, e.g.
# "A. Mandate and planning assumptions" (heading-sub), "1. Mandate and planned
# results" (heading-sub-sub) or "II. Mandate and planning assumptions"
# (entity-group) -- match any heading block whose label starts with "Mandate".
PKM_HEADING_TYPES = {"heading", "heading-sub", "heading-sub-sub", "entity-group"}
PKM_MANDATE_RE = re.compile(
    r"^(?:[IVXLCDM]+|[A-Z]|\d+)[.\s]+Mandate", re.IGNORECASE
)


def find_pkm_mandate_section(data: list) -> dict | None:
    """Find the "<n>. Mandate ..." subsection (recursively) in a PKM document."""
    for block in data:
        if (
            block["block_type"] in PKM_HEADING_TYPES
            and block["text"]
            and PKM_MANDATE_RE.match(block["text"])
        ):
            return block
        if block["children"]:
            found = find_pkm_mandate_section(block["children"])
            if found:
                return found
    return None


def pkm_agenda_title(data: list) -> str | None:
    """The GA agenda-item title from the document's first heading-x.

    Format: "<session> – Agenda item <n> – <agenda title> – <report title>".
    The DB stores the third segment (the agenda title) as ``section_title``.
    """
    def first_heading_x(blocks):
        for b in blocks:
            if b["block_type"] == "heading-x" and b["text"]:
                return b["text"]
            if b["children"]:
                found = first_heading_x(b["children"])
                if found:
                    return found
        return None

    heading = first_heading_x(data)
    if not heading:
        return None
    parts = [p.strip() for p in heading.split(" – ") if p.strip()]
    return parts[2] if len(parts) >= 3 else None


def pkm_origin_and_section(file_name: str, year: int) -> tuple[str, str | None]:
    """Derive ``origin_document`` and ``section`` matching the existing DB rows.

    ``A_80_604_ADD.1.json`` -> origin "PKM 26/27 (A/80/604)", section "Add.1".
    """
    stem = Path(file_name).stem
    m = re.match(r"^(.*)_ADD\.(\d+)$", stem, re.IGNORECASE)
    if m:
        base = m.group(1).replace("_", "/")
        section = f"Add.{m.group(2)}"
    else:
        base = stem.replace("_", "/")
        section = None
    yy = year % 100
    origin = f"PKM {yy:02d}/{yy + 1:02d} ({base})"
    return origin, section


def _load_pkm_supplement(year: int) -> pd.DataFrame:
    """Read data/references/peacekeeping_mission_mandates.csv and shape it to
    match the extract_pkm DataFrame, so a few hand-curated rows can top up
    missions whose ACABQ summary doesn't carry mandate citations.

    The supplement file holds the columns a human owns (entity, symbol,
    source, description, origin_document, file); everything else is derived
    here from peacekeeping_mission_budgets.csv plus the symbol itself.
    """
    path = Path("../data/references/peacekeeping_mission_mandates.csv")
    if not path.exists():
        return pd.DataFrame()
    sup = pd.read_csv(path)
    if sup.empty:
        return sup

    missions = pd.read_csv("../data/references/peacekeeping_mission_budgets.csv")
    missions = missions[missions["budget_cycle"] == year][
        ["short_name", "full_name"]
    ].drop_duplicates()
    sup = sup.merge(missions, left_on="entity", right_on="short_name", how="left")

    def to_link(symbol: str, source: str) -> str | None:
        if source == "Security Council resolutions":
            m = re.fullmatch(r"(\d+)\s*\((\d{4})\)", symbol.strip())
            return f"https://docs.un.org/en/S/RES/{m.group(1)}({m.group(2)})" if m else None
        if source == "General Assembly resolutions":
            return f"https://docs.un.org/en/A/RES/{symbol.replace(' ', '')}"
        return None

    sup["entity-long"] = sup["full_name"]
    sup["section"] = None
    sup["section_title"] = (
        "Administrative and budgetary aspects of the financing of the "
        "United Nations peacekeeping operations"
    )
    sup["part_in_document"] = "Mandate"
    sup["link"] = sup.apply(lambda r: to_link(r["symbol"], r["source"]), axis=1)
    sup["full_document_symbol"] = sup["link"].apply(link_to_symbol)
    return sup[
        [
            "origin_document",
            "file",
            "entity",
            "entity-long",
            "section",
            "section_title",
            "part_in_document",
            "description",
            "link",
            "symbol",
            "full_document_symbol",
            "source",
        ]
    ]


def extract_pkm(year: int):
    """Extract legislative mandates from peacekeeping mission budget reports.

    ``year`` is the start year of the budget cycle (matching the ``budget_cycle``
    column and the ``pkm{year}`` download/parse folders).
    """
    print("Processing peacekeeping mission documents to extract mandates…")
    mission_lookup = load_pkm_mission_lookup(year)
    print(f"Loaded lookup table with {len(mission_lookup)} missions")

    rows = []
    files = natsorted(Path(f"../data/processed/pkm{year}/json").glob("*.json"))
    for file in tqdm(files, desc="Processing PKM files"):
        short_name, full_name = mission_lookup.get(file.name, (None, None))
        if short_name is None:
            print(f"[yellow]Warning: {file.name} not in lookup table[/yellow]")
        try:
            with open(file) as f:
                data = json.load(f)
            section = find_pkm_mandate_section(data)
            if section is None:
                print(f"[yellow]Warning: no mandate section in {file.name}[/yellow]")
                continue
            origin_document, section_no = pkm_origin_and_section(file.name, year)
            section_title = pkm_agenda_title(data)
            # strip the leading enumerator ("A.\t", "II.\t", "1.\t") so that
            # part_in_document matches the DB values ("Mandate and planning
            # assumptions", "Mandate", "Mandate and planned results")
            part_in_document = re.sub(
                r"^(?:[IVXLCDM]+|[A-Z]|\d+)[.\s]+", "", section["text"]
            ).strip()
            # reuse the shared paragraph/table mandate extractor
            for symbol, link, description, source, _sp, _ent in get_mandates(
                section, file_name=file.name
            ):
                rows.append(
                    {
                        "origin_document": origin_document,
                        "file": file.name,
                        "entity": short_name,
                        "entity-long": full_name,
                        "section": section_no,
                        "section_title": section_title,
                        "part_in_document": part_in_document,
                        "description": description,
                        "link": link,
                        "symbol": symbol,
                        "source": source,
                    }
                )
        except Exception as e:
            print(f"[yellow]Warning: skipping {file.name}: {e}[/yellow]")

    df = pd.DataFrame(rows)
    df["symbol"] = df["symbol"].apply(normalize_symbol)
    df["symbol"] = (
        df["symbol"].str.split(";").apply(lambda x: [normalize_symbol(s) for s in x] if x else None)
    )
    df = df.explode("symbol")
    df["full_document_symbol"] = df["link"].apply(link_to_symbol)
    # The mandate paragraphs hyperlink genuine legislative mandates (GA/SC/HRC/
    # ECOSOC resolutions) but also cross-reference SG/ACABQ reports, prior-year
    # budget documents and SG letters in the same sentences. Only the former are
    # mandates: derive the source purely from the document symbol and drop rows
    # that do not resolve to a resolution. This also removes budget-table cells
    # mis-parsed as symbols (no link -> no source).
    n_before = len(df)
    df["source"] = df["full_document_symbol"].apply(reconstruct_mandate_source)
    df = df[df["source"].notna()].copy()
    # same resolution is often hyperlinked several times within a paragraph;
    # keep distinct (entity, symbol, sentence) citations but drop exact repeats
    df = df.drop_duplicates(subset=["entity", "symbol", "description"])
    print(
        f"Filtered {n_before} -> {len(df)} rows "
        f"(dropped non-mandate cross-references and exact duplicates)"
    )
    # Append hand-curated rows for missions whose ACABQ summary does not
    # cite the underlying legislative mandates (currently just UNLB: its
    # ACABQ addendum A/80/604/Add.5 references only SG/ACABQ documents in
    # its Mandate subsection, not the founding GA resolutions, so we top
    # up from data/references/peacekeeping_mission_mandates.csv).
    supplement = _load_pkm_supplement(year)
    if not supplement.empty:
        df = pd.concat([df, supplement], ignore_index=True)
        print(
            f"Added {len(supplement)} hand-curated supplement rows for "
            f"{supplement['entity'].nunique()} mission(s)"
        )

    df = df[
        [
            "origin_document",
            "file",
            "entity",
            "entity-long",
            "section",
            "section_title",
            "part_in_document",
            "description",
            "link",
            "symbol",
            "full_document_symbol",
            "source",
        ]
    ]

    _df = df.copy()
    for col in _df.columns:
        _df = _df.rename(columns={col: col.replace("_", " ").title()})
    _df.to_csv(f"../data/processed/pkm{year}/all_mandates.csv", index=False)
    _df.to_excel(f"../data/processed/pkm{year}/all_mandates.xlsx", index=False)
    print(
        f"✅ Extracted {len(df)} mandate rows from {df['file'].nunique()} PKM files "
        f"({df['symbol'].notna().sum()} with a symbol)"
    )
