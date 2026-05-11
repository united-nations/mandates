from rich import print
from utils.ods_api import search, get
import re
from natsort import natsorted
from pathlib import Path

def get_ppb_symbols(symbol):
    data = search(symbol)
    symbols = [d["symbol"] for d in data]
    symbols = [s for s in symbols if re.match(rf"{symbol}\s\(SECT.*\)" , s)]
    symbols = natsorted(symbols)
    return symbols

def download_ppb_docs(symbol, year):
    doc_dir = Path(f"../data/downloads/ppb{year}")
    doc_dir.mkdir(parents=True, exist_ok=True)
    for doc_symbol in get_ppb_symbols(symbol):
        for doc_type in ("pdf", "docx",):
            res = get(doc_symbol, doc_type)
            safe_symbol = doc_symbol.replace("/", "_")
            path = doc_dir / f"{safe_symbol}.{doc_type}"
            path.write_bytes(res.content)
            print(f"Saved {path}")

