"""Issuing namespaces, deliberately finer than the registry's organ facets."""

import re

# Specific bodies precede their parent organisations. Generic governing-body
# headings are scoped to the citing entity rather than treated as one body.
ISSUERS = (
    (
        "governing council of the united nations environment programme",
        "UNEP Governing Council",
    ),
    ("governing council of unep", "UNEP Governing Council"),
    ("environment assembly", "UNEA"),
    ("habitat assembly", "UN-Habitat Assembly"),
    ("convention against corruption", "UNCAC COSP"),
    ("convention against transnational organized crime", "UNTOC COP"),
    ("commission on human rights", "Commission on Human Rights"),
    ("human rights council", "HRC"),
    ("general assembly", "GA"),
    ("security council", "SC"),
    ("economic and social council", "ECOSOC"),
    ("ecosoc", "ECOSOC"),
    ("commission on narcotic drugs", "E/CN.7"),
    ("crime prevention and criminal justice", "E/CN.15"),
    ("commission on population and development", "E/CN.9"),
    ("commission for social development", "E/CN.5"),
    ("status of women", "CSW"),
    ("economic commission for africa", "ECA"),
    ("economic commission for europe", "ECE"),
    ("economic commission for latin america", "ECLAC"),
    ("eclac", "ECLAC"),
    ("economic and social commission for asia", "ESCAP"),
    ("escap", "ESCAP"),
    ("economic and social commission for western asia", "ESCWA"),
    ("charter of the united nations", "UN Charter"),
)


def clean_text(value: object) -> str:
    return re.sub(r"\s+", " ", value).strip() if isinstance(value, str) else ""


def issuing_body(row: dict[str, str]) -> str:
    source = clean_text(row.get("source"))
    for pattern, issuer in ISSUERS:
        if pattern in source.lower():
            return issuer
    if source.lower().startswith(
        ("governing council", "executive board", "committee of permanent")
    ):
        return f"{clean_text(row.get('entity'))} {source}".strip()
    return source


def instrument_kind(source: str) -> str:
    source = source.lower()
    if "statement" in source and "president" in source:
        return "Statement"
    kinds = [
        kind
        for token, kind in (
            ("resolution", "Resolution"),
            ("decision", "Decision"),
            ("declaration", "Declaration"),
            ("conclusion", "Conclusion"),
        )
        if token in source
    ]
    return kinds[0] if len(kinds) == 1 and "statement" not in source else "Outcome"
