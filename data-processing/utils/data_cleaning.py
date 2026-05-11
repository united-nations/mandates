import re

import pandas as pd


def normalize_title(title: str):
    if isinstance(title, str):
        return re.sub(r"\s+", " ", title).strip()
    return title


def normalize_symbol(symbol: str):
    if isinstance(symbol, str):
        symbol = symbol.replace('\n', '').replace('\r', '').replace('\xa0', ' ')
        symbol = re.sub(r"^[^a-zA-Z0-9]+", "", symbol)
        return symbol.strip()
    return symbol


def link_to_symbol(link: str):
    if isinstance(link, str):
        for prefix in [
            "https://undocs.org/en/",
            "https://docs.un.org/en/",
            "https://www.undocs.org/en/",
            "https://docs.un.org/",
            "https://www.undocs.org/",
        ]:
            if link.startswith(prefix):
                return link[len(prefix):].upper()
        return None
    return None

def extract_organ(symbol_prefix):
    """Extract UN organ from symbol prefix."""
    if pd.isna(symbol_prefix):
        return None

    symbol_prefix = str(symbol_prefix).upper()

    organ_mapping = {
        "A/": "General Assembly",
        "E/": "Economic and Social Council",
        "S/": "Security Council",
        "A/HRC/": "Human Rights Council",
        "A/HRC/OS/": "Human Rights Council",
        "A/HRC/OM/": "Human Rights Council",
        "ST/": "Secretariat",
        "T/": "Trusteeship Council",
    }

    # Check for exact matches first
    for prefix, organ in organ_mapping.items():
        if symbol_prefix == prefix:
            return organ

    return symbol_prefix
