import re

import pandas as pd
from rich import print

from utils.data_cleaning import link_to_symbol, normalize_title, normalize_symbol


def compare_value_counts(series_1, series_2):
    c1 = series_1.apply(normalize_title).value_counts(dropna=False)
    c2 = series_2.apply(normalize_title).value_counts(dropna=False)
    diff = c1.subtract(c2, fill_value=0)
    return diff.head(100)


def normalize_hard(s):
    s = s.strip().lower()
    s = re.sub(r"[^a-zA-Z0-9\s]", "", s)  # remove all non-alphanumeric characters
    s = re.sub(r"\s+", " ", s)  # squeeze spaces
    s = re.sub(r"the\s+", "", s)  # remove the
    s = re.sub(r"united\s+nations", "un", s)  # replace united nations with un
    return s.strip().lower()


def _validate(df_manual, df_auto):
    # df_manual = df_manual[df_manual["part_in_document"] == "Mandates and background"]
    # df_auto = df_auto[df_auto["part_in_document"] == "Mandates and background"]
    print("---------- Mandate types ----------")
    print(
        compare_value_counts(df_auto["part_in_document"], df_manual["part_in_document"])
    )

    print("---------- Links ----------")
    urls_manual = (
        df_manual["link"]
        .dropna()
        .apply(link_to_symbol)
        .apply(normalize_symbol)
        .tolist()
    )
    urls_auto = (
        df_auto["link"].dropna().apply(link_to_symbol).apply(normalize_symbol).tolist()
    )
    print(len(urls_manual), len(urls_auto))
    print(len(set(urls_manual)), len(set(urls_auto)))
    print(len(set(urls_manual) & set(urls_auto)))

    print("---------- Sections ----------")
    print(compare_value_counts(df_auto["section"], df_manual["section"]))
    print(compare_value_counts(df_auto["section_title"], df_manual["section_title"]))

    print("---------- Entities ----------")
    print(compare_value_counts(df_auto["entity-long"], df_manual["entity-long"]))
    print(compare_value_counts(df_auto["entity"], df_manual["entity"]))

    print("---------- Programmes ----------")
    print(compare_value_counts(df_auto["programme"], df_manual["programme"]))
    print(
        compare_value_counts(df_auto["programme_title"], df_manual["programme_title"])
    )

    print("---------- Subprogrammes ----------")
    print(df_auto["subprogramme"].value_counts(dropna=False))
    print(df_auto["subprogramme_title"].value_counts(dropna=False))

    print("---------- Mandate sources ----------")
    print(compare_value_counts(df_auto["source"], df_manual["source"]).to_string())

    print("---------- Descriptions ----------")
    descriptions_manual = (
        df_manual["description"].dropna().apply(normalize_hard).tolist()
    )
    descriptions_auto = df_auto["description"].dropna().apply(normalize_hard).tolist()
    print(len(descriptions_manual), len(descriptions_auto))
    print(len(set(descriptions_manual)), len(set(descriptions_auto)))
    print(len(set(descriptions_manual) & set(descriptions_auto)))
    extra_descriptions_manual = sorted(
        list({d for d in descriptions_manual if d not in descriptions_auto})
    )
    extra_descriptions_auto = sorted(
        list({d for d in descriptions_auto if d not in descriptions_manual})
    )
    print(len(extra_descriptions_manual), len(extra_descriptions_auto))
    # for more thorough inspection:
    # with open("desc_manual_extra.json", "w") as f:
    #     json.dump(extra_descriptions_manual, f)
    # with open("desc_auto_extra.json", "w") as f:
    #     json.dump(extra_descriptions_auto, f)

    print("---------- Symbols ----------")
    symbols_manual = df_manual["symbol"].dropna().tolist()
    symbols_auto = df_auto["symbol"].dropna().tolist()
    print(len(symbols_manual), len(symbols_auto))
    print(len(set(symbols_manual)), len(set(symbols_auto)))
    print(len(set(symbols_manual) & set(symbols_auto)))
    extra_symbols_manual = sorted(
        list({s for s in symbols_manual if s not in symbols_auto})
    )
    extra_symbols_auto = sorted(
        list({s for s in symbols_auto if s not in symbols_manual})
    )
    print(len(extra_symbols_manual), len(extra_symbols_auto))
    # with open("symbols_manual_extra.json", "w") as f:
    #     json.dump(extra_symbols_manual, f, indent=4)
    # with open("symbols_auto_extra.json", "w") as f:
    #     json.dump(extra_symbols_auto, f, indent=4)

    print("---------- Full document symbols ----------")
    symbols_manual = df_manual["full_document_symbol"].dropna().tolist()
    symbols_auto = df_auto["full_document_symbol"].dropna().tolist()
    print(len(symbols_manual), len(symbols_auto))
    print(len(set(symbols_manual)), len(set(symbols_auto)))
    print(len(set(symbols_manual) & set(symbols_auto)))
    extra_symbols_manual = sorted(
        list({s for s in symbols_manual if s not in symbols_auto})
    )
    extra_symbols_auto = sorted(
        list({s for s in symbols_auto if s not in symbols_manual})
    )
    print(len(extra_symbols_manual), len(extra_symbols_auto))
    # with open("full_symbols_manual_extra.json", "w") as f:
    #     json.dump(extra_symbols_manual, f, indent=4)
    # with open("full_symbols_auto_extra.json", "w") as f:
    #     json.dump(extra_symbols_auto, f, indent=4)
    print("---------- Entity x Part in Document ----------")
    ex_manual = df_manual[["entity-long", "part_in_document"]]
    ex_auto = df_auto[["entity-long", "part_in_document"]]
    diff = ex_auto.value_counts(dropna=False).subtract(
        ex_manual.value_counts(dropna=False), fill_value=0
    )
    print(diff.to_string())

    print("---------- Section x Part in Document ----------")
    sxp_manual = df_manual[["section", "part_in_document"]]
    sxp_auto = df_auto[["section", "part_in_document"]]
    diff = sxp_auto.value_counts(dropna=False).subtract(
        sxp_manual.value_counts(dropna=False), fill_value=0
    )
    print(diff.to_string())


def check_missing_values(df):
    print("Missing entity-long:")
    print(df[df["entity-long"].isna()]["entity-long"])
    print("Missing entity[-short]:")
    print(df[df["entity"].isna()][["entity-long", "entity"]])
    print("Missing symbol:")
    print(df[df["symbol"].isna()][["section", "symbol", "link", "description"]])
    print("Missing subprogramme title:")
    print(
        df[df["subprogramme"].notna() & df["subprogramme_title"].isna()][
            ["section", "subprogramme", "subprogramme_title"]
        ]
    )
    print("Missing section title:")
    print(df[df["section_title"].isna()][["section", "section_title"]])
    print("Missing part in document:")
    print(df[df["part_in_document"].isna()][["section", "part_in_document"]])
    print("Missing source:")
    print(df[df["source"].isna()][["section", "source"]])


def validate_ppb(year):
    df = pd.read_csv(f"../data/processed/ppb{year}/all_mandates.csv")
    for column in df.columns:
        df = df.rename(columns={column: column.replace(" ", "_").lower()})
    df["section_title"] = df["section_title"].apply(normalize_title)
    df["entity-long"] = df["entity-long"].apply(normalize_title)
    df["programme_title"] = df["programme_title"].apply(normalize_title)
    df["symbol"] = df["symbol"].apply(normalize_symbol)

    manual_df = pd.read_csv(f"../data/references/ppb2025_mandates_validation.csv")
    for column in manual_df.columns:
        manual_df = manual_df.rename(columns={column: column.replace(" ", "_").lower()})
    manual_df["section_title"] = manual_df["section_title"].apply(normalize_title)
    manual_df["entity-long"] = manual_df["entity-long"].apply(normalize_title)
    manual_df["programme_title"] = manual_df["programme_title"].apply(normalize_title)
    manual_df["symbol"] = manual_df["symbol"].apply(normalize_symbol)
    manual_df["link"] = manual_df["link_id"]
    _validate(manual_df, df)
    # check_missing_values(df)


def validate_pkm(year):
    """Sanity-check the PKM extraction.

    There is no manual ground-truth file for peacekeeping missions, so instead
    of a manual-vs-auto diff this runs structural checks that surface the known
    failure modes: non-mandate cross-references extracted as mandates, mandate
    citations without resolvable links, missions with no extracted mandates,
    and duplicates.
    """
    df = pd.read_csv(f"../data/processed/pkm{year}/all_mandates.csv")
    for column in df.columns:
        df = df.rename(columns={column: column.replace(" ", "_").lower()})
    df["symbol"] = df["symbol"].apply(normalize_symbol)

    lookup = pd.read_csv("../data/references/peacekeeping_mission_budgets.csv")
    expected = set(lookup[lookup["budget_cycle"] == year]["short_name"])

    print("---------- Rows per mission ----------")
    counts = df["entity"].value_counts(dropna=False)
    print(counts.to_string())
    missing_missions = expected - set(df["entity"].dropna())
    if missing_missions:
        print(f"[red]Missions with NO extracted mandates: {sorted(missing_missions)}[/red]")

    print("---------- Rows missing entity ----------")
    print(df[df["entity"].isna()][["file", "symbol", "link"]].to_string())

    print("---------- Rows without a resolvable link ----------")
    no_link = df[df["link"].isna()]
    print(f"{len(no_link)} of {len(df)} rows have no link")
    print(no_link[["entity", "symbol", "description"]].to_string())

    print("---------- Likely non-mandate cross-references ----------")
    # real mandates are GA/SC/HRC/ECOSOC resolutions; anything else extracted
    # from the mandate section (A/80/604, A/80/605, S/2025/..., etc.) is a
    # report cross-reference, not a legislative mandate
    fds = df["full_document_symbol"].fillna("")
    is_resolution = fds.str.contains(r"/RES/|RES/\d|\bresolution\b", case=False, regex=True)
    not_res = df[~is_resolution]
    print(f"{len(not_res)} of {len(df)} rows are not */RES/* documents")
    print(
        not_res[["entity", "symbol", "full_document_symbol", "source"]]
        .value_counts(dropna=False)
        .to_string()
    )

    print("---------- Duplicate (entity, symbol) ----------")
    dups = df[df.duplicated(subset=["entity", "symbol"], keep=False)]
    print(
        dups[["entity", "symbol"]]
        .value_counts()
        .loc[lambda s: s > 1]
        .to_string()
    )

    print("---------- Symbols with no link (possible un-linked mandates) ----------")
    print(
        df[df["link"].isna() & df["source"].notna()][
            ["entity", "symbol", "source"]
        ].to_string()
    )

def validate(year):
    validate_ppb(year)
    validate_pkm(year - 1)
    