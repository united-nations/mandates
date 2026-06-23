from rich import print
from utils.ods_api import search, get
import re
from natsort import natsorted
from pathlib import Path
import pandas as pd

def get_ppb_symbols(symbol):
    data = search(symbol)
    symbols = [d["symbol"] for d in data]
    symbols = [s for s in symbols if re.match(rf"{symbol}\s\(SECT.*\)" , s)]
    symbols = natsorted(symbols)
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

