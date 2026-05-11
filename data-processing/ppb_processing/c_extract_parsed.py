import json
import os
import re
from copy import deepcopy
from pathlib import Path

import pandas as pd
from natsort import natsorted
from rich import print
from tqdm import tqdm

from utils.data_cleaning import link_to_symbol
from utils.llm_extract_mandates import llm_extract_mandates


def find_section_with_heading(
    data: dict, heading_title: str, current_hierarchy: list = []
):
    found_blocks = []
    for block in data:
        if block["text"] == heading_title:
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


def normalize_title(title: str):
    if isinstance(title, str):
        return re.sub(r"\s+", " ", title).strip()
    return title


def normalize_symbol(symbol: str):
    # normali
    if isinstance(symbol, str):
        # remove leading non-alphanumeric characters
        symbol = re.sub(r"^[^a-zA-Z0-9]+", "", symbol)
        # remove leading and trailing spaces
        return symbol.strip()
    return symbol


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
                if row[0]["hyperlinks"]:
                    for text, url in row[0]["hyperlinks"]:
                        description = row[1]["text"].strip() if len(row) > 1 else None
                        mandate = (
                            text,
                            url,
                            description,
                            mandate_source,
                            subprogramme,
                            entity,
                        )
                        mandates.append(mandate)
                else:
                    description = row[1]["text"].strip() if len(row) > 1 else None
                    mandate = (
                        row[0]["text"],
                        None,
                        description,
                        mandate_source,
                        subprogramme,
                        entity,
                    )
                    mandates.append(mandate)
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
            mandates.extend(
                get_mandates(
                    block,
                    subprogramme=block["text"],
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
    if subprogramme and not pd.isna(subprogramme) and subprogramme.startswith("Subprogramme"):
        number = re.match(r"^Subprogramme\s+(\d+)", subprogramme).group(1)
        try:
            title = subprogramme.split("–")[1].strip()
            return (number, title)
        except IndexError:
            print(f"Warning: Could not extract subprogramme title: {subprogramme}")
            return (number, None)
    return (None, None)


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
    df["subprogramme_title"] = df["subprogramme"].apply(get_subprogramme).str[1]
    df["subprogramme"] = df["subprogramme"].apply(get_subprogramme).str[0]
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


def find_entity(row):
    if not pd.isna(row["entity-long"]):
        return row["entity-long"]
    try:
        entity = df_sections_and_entities[
            df_sections_and_entities["section"] == row["section_title"]
        ]["entity"].values[0]
    except:
        print(f"Could not find entity for section: {row['section_title']}, {row}")
        # raise ValueError(
        #     f"Could not find entity for section: {row['section_title']}, {row}"
        # )
        entity = None
    return entity


df_sections_and_entities = pd.read_csv(
    "../data/references/ppb_sections_and_entities.tsv", sep="\t"
)
df_entity_names = pd.read_csv("../data/references/entity_names.tsv", sep="\t")


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
    dfs = []
    q = tqdm(
        natsorted(Path(f"../data/processed/ppb{year}/json").glob("*.json")),
        desc="Processing files",
    )
    for file in q:
        q.set_description(f"Processing file: {file.name}")
        with open(file, "r") as f:
            data = json.load(f)
        df = extract_mandates_for_file(data, file.name)
        if df is not None:
            df["file"] = file.name
            addendum = re.search(r"ADD\.(\d+)(\.|_)", file.name.upper())
            df["addendum"] = addendum.group(1) if addendum else None
            dfs.append(df)
        q.update(1)
    df = pd.concat(dfs)
    # when entity long is na, infer from section title and lookup table
    df["entity-long"] = df.apply(find_entity, axis=1)
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
    # df_priority_areas = pd.read_csv(
    #     "../data/processed/ppb2026/share/mandates_plan_outline.csv"
    # )
    # df_priority_areas = df_priority_areas.rename(
    #     columns={
    #         "Mandate Symbol Full": "mandate_symbol_full",
    #         "Priority Area": "priority_area",
    #     }
    # )
    # df_priority_areas = df_priority_areas[["mandate_symbol_full", "priority_area"]]
    # df = df.merge(
    #     df_priority_areas,
    #     right_on="mandate_symbol_full",
    #     left_on="full_document_symbol",
    #     how="left",
    # )
    # df_entity_priority_areas = pd.read_csv("../data/references/entity_priority_areas.csv")
    # df["priority_area"] = df["priority_area"].fillna(
    #     df["entity"].map(df_entity_priority_areas.set_index("entity")["priority_area"])
    # )

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
