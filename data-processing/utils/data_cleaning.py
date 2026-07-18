import re
from functools import lru_cache

import pandas as pd


def normalize_title(title: str):
    if isinstance(title, str):
        return re.sub(r"\s+", " ", title).strip()
    return title


def normalize_symbol(symbol: str):
    if isinstance(symbol, str):
        symbol = symbol.replace('\n', '').replace('\r', '').replace('\xa0', ' ')
        symbol = re.sub(r"^[^a-zA-Z0-9]+", "", symbol)
        # hyperlink anchors sometimes swallow a trailing conjunction or comma
        # from the surrounding sentence ("2535 (2020) and")
        symbol = re.sub(r"[\s,]+and\s*$", "", symbol)
        symbol = re.sub(r"[\s,;]+$", "", symbol)
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

@lru_cache(maxsize=1)
def _body_source_map():
    """(pattern_lower, organ_short) rules ordered by ascending priority.

    Loaded once from data/references/ppb_body_source_map.tsv (the canonical
    body-header -> organ mapping, mirrored in SQL migration 028).
    """
    df = pd.read_csv(
        "../data/references/ppb_body_source_map.tsv", sep="\t", comment="#"
    ).sort_values("priority")
    return [(str(p).lower(), str(o)) for p, o in zip(df["pattern"], df["organ_short"])]


def map_body_source_to_organ(source):
    """Map a mandate body-header (ppb_document_source) to an organ short code.

    The fascicles group unlinked mandates under body headers such as "Commission
    on Narcotic Drugs resolutions" and only hyperlink the principal-organ
    families, so the organ is not otherwise recoverable. Returns the first
    matching pattern's organ, or None when nothing matches (empty/generic
    source). Kept in sync with ppb2026.body_source_organ_map (migration 028).
    """
    if not isinstance(source, str) or not source.strip():
        return None
    s = source.lower()
    for pattern, organ in _body_source_map():
        if pattern in s:
            return organ
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
