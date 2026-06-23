from ppb_processing.a_download import download_budget_docs
from ppb_processing.b_parse_downloaded import parse_budget_docs
from ppb_processing.c_extract_parsed import extract, extract_pkm
from ppb_processing.d_validate_extracted import validate, validate_pkm
from ppb_processing.e_export_excel import export_excel, export_excel_pkm

if __name__ == "__main__":
    year = 2027
    symbol = "A/81/6"
    # a
    download_budget_docs(symbol, year)
    # b
    parse_budget_docs(year)
    # c
    extract(year)
    extract_pkm(year - 1)
    # d
    validate(year)
    validate_pkm(year - 1)
    # e
    export_excel(year, symbol)
    export_excel_pkm(year - 1)
