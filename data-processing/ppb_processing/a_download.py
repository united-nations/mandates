from rich import print
from utils.ods_api import search, get
import re
from natsort import natsorted
from pathlib import Path
import pandas as pd

def get_ppb_symbols(symbol):
    data = search(symbol)
    # The budget is split across section fascicles: "A/81/6 (SECT. 3)" etc.
    sections = [
        d["symbol"]
        for d in data
        if re.match(rf"{re.escape(symbol)}\s\(SECT.*\)", d["symbol"])
    ]
    # Special political missions are issued as addenda to section 3, e.g.
    # "A/81/6 (Sect. 3)/Add.2" … "Add.6" (UNAMA is Add.5, UNAMI Add.6), released
    # in the autumn after the main fascicles. The section regex above is not
    # right-anchored, so it already happens to match these section-3 addenda; keep
    # an explicit, title-based match as well so capture does not depend on that
    # accident or on the exact symbol punctuation, and so a year whose estimates
    # are issued as a plain "A/81/6/Add.N" is still covered. Matching on the title
    # ("special political missions") also skips the non-SPM overview addendum.
    spm_addenda = [
        d["symbol"]
        for d in data
        if "/Add." in d["symbol"]
        and "special political mission" in (d.get("title") or "").lower()
    ]
    symbols = natsorted(set(sections + spm_addenda))
    return symbols

def get_pkm_symbols(year):
    df = pd.read_csv("../data/references/peacekeeping_mission_budgets.csv")
    df = df[df["budget_cycle"] == year] # start year of budget cycle
    symbols = df["document_symbol"].to_list()
    return symbols

def download_budget_docs(symbol, year):
    inputs = [
        (f"ppb{year}", get_ppb_symbols(symbol)),
        (f"pkm{year-1}", get_pkm_symbols(year - 1))
    ]
    for (name, symbols) in inputs:
        doc_dir = Path(f"../data/downloads/{name}")
        doc_dir.mkdir(parents=True, exist_ok=True)
        for doc_symbol in symbols:
            for doc_type in ("pdf", "docx",):
                res = get(doc_symbol, doc_type)
                safe_symbol = doc_symbol.replace("/", "_")
                path = doc_dir / f"{safe_symbol}.{doc_type}"
                path.write_bytes(res.content)
                print(f"Saved {path}")

