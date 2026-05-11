import re

import pandas as pd


def normalize_title(title: str):
    if isinstance(title, str):
        return re.sub(r"\s+", " ", title).strip()
    return title


def normalize_symbol(symbol: str):
    if isinstance(symbol, str):
        symbol = re.sub(r"^[^a-zA-Z0-9]+", "", symbol)
        return symbol.strip()
    return symbol


def link_to_symbol(link: str):
    if isinstance(link, str):
        if link.startswith("https://undocs.org/en/"):
            return link.replace("https://undocs.org/en/", "").upper()
        elif link.startswith("https://docs.un.org/en/"):
            return link.replace("https://docs.un.org/en/", "").upper()
        else:
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
