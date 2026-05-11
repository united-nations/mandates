from ppb_processing.a_download import download_ppb_docs
from ppb_processing.b_parse_downloaded import parse_ppb_docs
from ppb_processing.c_extract_parsed import extract
from ppb_processing.d_validate_extracted import validate

if __name__ == "__main__":
    year = 2027
    symbol = "A/81/6"
    # a
    download_ppb_docs(symbol, year)
    # b
    parse_ppb_docs(year)
    # c
    extract(year)
    # d
    validate(year)
