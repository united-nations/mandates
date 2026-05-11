import pandas as pd


def parse_subjects_to_list(subjects_str):
    """Convert subjects string to a clean Python list."""
    if pd.isna(subjects_str) or subjects_str is None:
        return []

    # Split by pipe separator and clean each subject
    subjects_list = [subject.strip() for subject in str(subjects_str).split("|")]

    # Remove any empty strings that might result from splitting
    subjects_list = [subject for subject in subjects_list if subject]

    # Remove duplicates while preserving order
    seen = set()
    deduplicated_list = []
    for subject in subjects_list:
        if subject not in seen:
            seen.add(subject)
            deduplicated_list.append(subject)

    return deduplicated_list


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
