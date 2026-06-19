from ppb_processing.a_download import download_budget_docs
from ppb_processing.b_parse_downloaded import parse_budget_docs
from ppb_processing.c_extract_parsed import extract, load_pkm_mandates
from ppb_processing.d_validate_extracted import validate, validate_pkm
from ppb_processing.e_export_excel import export_excel, export_excel_pkm

if __name__ == "__main__":
    year = 2027
    symbol = "A/81/6"
    # a: download PPB + PKM source docs (PKM kept for verification of the
    #    curated mandate citations)
    download_budget_docs(symbol, year)
    # b: only PPB needs parsing - PKM citations are maintained by hand
    parse_budget_docs(year)
    # c: PPB pipeline + load curated PKM mandates
    extract(year)
    load_pkm_mandates(year - 1)
    # d
    validate(year)
    validate_pkm(year - 1)
    # e
    export_excel(year, symbol)
    export_excel_pkm(year - 1)
