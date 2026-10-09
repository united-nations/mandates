"""Resolve short PPB references before they become global document keys.

The legacy full_document_symbol column is also used for readable non-ODS keys
(see migration 039). Identity.official_symbol distinguishes the two explicitly.
"""

import re
from dataclasses import dataclass
from urllib.parse import unquote, urlparse

from utils.mandate_issuers import clean_text, instrument_kind, issuing_body

OFFICIAL = re.compile(
    r"^(?:A|S|E|ST|UNEP|HSP|WT|ECE|CAC|CTOC|CD|TD|ESCAP)/[^\s]+$", re.IGNORECASE
)
DOC_HOSTS = {"docs.un.org", "undocs.org", "www.undocs.org"}
RESOLUTION_PREFIXES = {"GA": "A/RES/", "HRC": "A/HRC/RES/", "ECOSOC": "E/RES/"}


@dataclass(frozen=True)
class Identity:
    key: str
    official_symbol: str | None
    issuer: str
    status: str


def symbol_from_link(link: str) -> str:
    parsed = urlparse(link)
    if parsed.hostname not in DOC_HOSTS:
        return ""
    symbol = unquote(parsed.path).lstrip("/")
    symbol = re.sub(r"^(?:en|fr|es|ru|ar|zh)/", "", symbol, flags=re.IGNORECASE)
    return symbol.upper() if OFFICIAL.fullmatch(symbol) else ""


def explicit_symbol(row: dict[str, str]) -> str:
    linked = symbol_from_link(clean_text(row.get("link")))
    candidates = (
        linked,
        clean_text(row.get("full_document_symbol")),
        clean_text(row.get("symbol")),
    )
    return next((s.upper() for s in candidates if OFFICIAL.fullmatch(s)), "")


def infer_symbol(row: dict[str, str], issuer: str) -> str:
    symbol = clean_text(row.get("symbol"))
    kind = instrument_kind(clean_text(row.get("source")))
    if issuer == "SC" and kind in {"Resolution", "Outcome"}:
        match = re.fullmatch(r"(\d+)\s*\((\d{4})\)", symbol)
        return f"S/RES/{match[1]}({match[2]})" if match else ""
    if not re.fullmatch(r"\d+/\d+", symbol):
        return ""
    if kind == "Resolution" and issuer in RESOLUTION_PREFIXES:
        return RESOLUTION_PREFIXES[issuer] + symbol
    if issuer == "UNEA" and kind == "Resolution":
        session, number = symbol.split("/")
        return f"UNEP/EA.{session}/RES.{number}"
    return f"A/HRC/PRST/{symbol}" if issuer == "HRC" and kind == "Statement" else ""


def resolve_identity(row: dict[str, str]) -> Identity:
    issuer = issuing_body(row)
    explicit = explicit_symbol(row)
    if explicit:
        return Identity(explicit, explicit, issuer, "explicit")
    inferred = infer_symbol(row, issuer)
    if inferred:
        return Identity(inferred, inferred, issuer, "inferred")
    symbol = clean_text(row.get("symbol"))
    if not symbol:
        raise ValueError("Empty mandate reference")
    if not issuer:
        raise ValueError(f"No issuing body for mandate reference {symbol!r}")
    kind = instrument_kind(clean_text(row.get("source")))
    return Identity(f"{issuer} {kind} {symbol}", None, issuer, "scoped")


def reference_key(row: dict[str, str]) -> tuple[str, str, str]:
    return (
        issuing_body(row),
        instrument_kind(clean_text(row.get("source"))),
        clean_text(row.get("symbol")),
    )


def known_identities(
    rows: list[dict[str, str]], identities: list[Identity]
) -> dict[tuple[str, str, str], set[str]]:
    known: dict[tuple[str, str, str], set[str]] = {}
    for row, identity in zip(rows, identities, strict=True):
        key = reference_key(row)
        if identity.official_symbol or key[1] != "Outcome":
            known.setdefault(key, set()).add(identity.key)
    # A provisional alias of the SAME instrument type is not a competitor to
    # an evidenced symbol. A different type (even scoped) IS a competitor.
    return {
        key: {s for s in values if OFFICIAL.fullmatch(s)} or values
        for key, values in known.items()
    }


def resolve_rows(rows: list[dict[str, str]]) -> list[Identity]:
    identities = [resolve_identity(row) for row in rows]
    known = known_identities(rows, identities)
    return [
        reuse_evidence(row, identity, known)
        for row, identity in zip(rows, identities, strict=True)
    ]


def reuse_evidence(
    row: dict[str, str], identity: Identity, known: dict[tuple[str, str, str], set[str]]
) -> Identity:
    issuer, kind, reference = reference_key(row)
    matches = known.get((issuer, kind, reference), set())
    if kind == "Outcome":
        matches = set().union(
            *(
                values
                for (body, _, symbol), values in known.items()
                if body == issuer and symbol == reference
            )
        )
    if (
        identity.status == "scoped"
        and len(matches) == 1
        and OFFICIAL.fullmatch(next(iter(matches)))
    ):
        symbol = next(iter(matches))
        return Identity(symbol, symbol, identity.issuer, "matched")
    return identity
