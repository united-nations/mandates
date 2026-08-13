"""Scrape the Commission on the Status of Women (CSW) session outcomes list.

The 2027 Programme Budget (A/81/6, Sect. 17, UN-Women) no longer enumerates the
CSW political declarations and agreed conclusions individually. Instead it says:

    "The list of agreed conclusions from 1996 to 2025 is available at the
     following link: www.unwomen.org/en/csw/outcomes."

This module reproduces exactly that list, sourced solely from a scrape of that
page (no merge with the historical 2026 enumeration, and no attempt to match
items against the Digital Library). It emits one row per downloadable outcome
item (each agreed conclusion, each standalone declaration), which is then
imported as UN-Women legislative-mandate citations for the PPB 2027 vintage via
``sql/migrations/039_import_csw_outcomes.sql``.

Two identifier columns, and no invented document symbols:

``ods_symbol``
    The real UN document symbol, but *only* where the page links straight into
    ODS -- 4 of 40 items (E/CN.6/2020/L.1, E/CN.6/2021/L.3, E/CN.6/2022/L.7,
    E/2025/27). Empty for the rest: those link to UN Women's own branded PDF
    booklets, which carry no document symbol at all.

``document_key``
    The primary key to store. It is the ``ods_symbol`` when there is one, and
    otherwise a readable label in the house convention already used for
    commission outcomes published only inside a session report -- 'CSW Agreed
    conclusions 1998/I', 'CSW Declaration, 49th session (2005)' -- matching
    existing rows such as 'E/CN.15 Resolution 17/2' and 'E/CN.7 Decision 60/1'.
    It reads as a description and cannot be mistaken for a document symbol.

Run from anywhere; paths resolve relative to the repo root:

    uv run python -m utils.csw_outcomes           # refresh from the live page
    uv run python -m utils.csw_outcomes --offline # parse the saved snapshot only
"""

from __future__ import annotations

import argparse
import html as html_lib
import re
import subprocess
from pathlib import Path

import pandas as pd

URL = "https://www.unwomen.org/en/csw/outcomes"
BASE = "https://www.unwomen.org"
USER_AGENT = "Mozilla/5.0"

REPO_ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT = REPO_ROOT / "data" / "downloads" / "csw" / "csw_outcomes.html"
OUTPUT_CSV = REPO_ROOT / "data" / "references" / "csw_outcomes.csv"

# CSW sessions are annual; the 40th session sat in 1996, so year = 1956 + session.
def session_to_year(session: int) -> int:
    return 1956 + session

_SESSION_HEADER = re.compile(
    r"<strong>\s*(\d{2,3})(?:st|nd|rd|th)\s+session\b([^<]*)</strong>", re.I
)
_BR = re.compile(r"<br\s*/?>|</li>|<li>", re.I)
_TAG = re.compile(r"<[^>]+>")
_ENGLISH_HREF = re.compile(r'<a[^>]+href="([^"]+)"[^>]*>\s*English\s*</a>', re.I)
_ANY_HREF = re.compile(r'<a[^>]+href="([^"]+)"', re.I)
_PAREN_SYMBOL = re.compile(r"\(([EAS]/[^)]+)\)")
# A link straight into ODS carries the item's real document symbol in its path.
_ODS_LINK = re.compile(r"(?:undocs\.org|docs\.un\.org)/(?:en/)?(\S+)", re.I)
# A line that begins a new outcome item: "Resolution 40/9:", "2004/11:",
# "2001/5 A.", "1999/II:", or a bare "A." / "B -" continuation label.
_ITEM_LABEL = re.compile(
    r"^(Resolution\s+\S+|\d{4}/\d+\s*[A-Z]?|\d{4}/[IVX]+|[A-Z])\s*[:.\-]", re.I
)


def strip_tags(fragment: str) -> str:
    text = _TAG.sub("", fragment)
    text = html_lib.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def fetch(offline: bool = False) -> str:
    """Return the page HTML, refreshing the on-disk snapshot unless offline.

    unwomen.org sits behind bot protection that 403s the ``requests`` library
    (and any Python HTTP client) on a TLS/HTTP fingerprint basis, regardless of
    User-Agent, while ``curl`` is served normally. So the fetch shells out to
    ``curl``; the parse always runs off the committed snapshot for reproducibility.
    """
    if offline:
        return SNAPSHOT.read_text(encoding="utf-8")
    result = subprocess.run(
        ["curl", "-sSL", "--fail", "-A", USER_AGENT, URL],
        capture_output=True,
        text=True,
        timeout=90,
    )
    if result.returncode != 0:
        raise RuntimeError(f"curl failed ({result.returncode}): {result.stderr.strip()}")
    SNAPSHOT.parent.mkdir(parents=True, exist_ok=True)
    SNAPSHOT.write_text(result.stdout, encoding="utf-8")
    return result.stdout


def _absolute(url: str | None) -> str | None:
    if not url:
        return None
    if url.startswith("http"):
        return url
    return BASE + url


def _session_blocks(page_html: str) -> list[tuple[int, str]]:
    """Split the page into (session_number, block_html) segments."""
    matches = list(_SESSION_HEADER.finditer(page_html))
    blocks = []
    for i, m in enumerate(matches):
        session = int(m.group(1))
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(page_html)
        block = page_html[start:end]
        # Cut the trailing site chrome that follows the last (69th) session.
        block = re.split(r"Latest news|</main>|id=\"news\"", block, maxsplit=1)[0]
        blocks.append((session, block))
    return blocks


def _classify(title: str) -> str:
    low = title.lower()
    if low.startswith("report"):
        return "report"
    if "political declaration" in low:
        return "political declaration"
    if "declaration" in low:
        return "declaration"
    if low.startswith("resolution"):
        return "resolution"
    return "agreed conclusions"


def _ordinal(n: int) -> str:
    if 10 <= n % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix}"


_TYPE_NOUN = {
    "agreed conclusions": "Agreed conclusions",
    "declaration": "Declaration",
    "political declaration": "Political declaration",
    "resolution": "Resolution",
    "report": "Report",
}


def _document_key(session: int, year: int, item_type: str, label: str) -> str:
    """A readable key for an outcome with no official document symbol.

    CSW agreed conclusions are adopted as chapters of the session report, so most
    have no standalone ODS symbol. Rather than invent one, follow the convention
    ppb2026.source_documents already uses for exactly this case -- body + type +
    number, e.g. 'E/CN.15 Resolution 17/2', 'E/CN.7 Decision 60/1' -- so the key
    reads as a description and can never be mistaken for a document symbol.
    """
    noun = _TYPE_NOUN.get(item_type, "Agreed conclusions")
    # 'Resolution 40/9' is numbered session/number; conclusions use year/number.
    numbered = re.match(
        r"^(?:Resolution\s+)?(\d{2,4}/\d+(?:\s*[A-Z])?|\d{4}/[IVX]+)$", label
    )
    if numbered:
        return f"CSW {noun} {numbered.group(1)}"
    session_part = f"{_ordinal(session)} session ({year})"
    # A bare sub-item letter ('A'/'B') only disambiguates within its session.
    if re.fullmatch(r"[A-Z]", label):
        return f"CSW {noun} {label}, {session_part}"
    return f"CSW {noun}, {session_part}"


def _is_noise(text: str) -> bool:
    """Section headers and prose that never constitute an outcome item."""
    low = text.lower()
    if low in {"agreed conclusions:", "agreed conclusions", "resolutions:"}:
        return True
    if low.startswith("download:") or low.startswith("extracted from"):
        return True
    # "No outcome" sessions and sub-themes (2000, 2003 2nd theme, 2012).
    if low.startswith("no agreed conclusions") or low.startswith(
        "the commission acted as"
    ):
        return True
    # Bare language pipes / brackets left over from a Download line.
    return bool(re.fullmatch(r"[\[\]|\s]*", text))


def parse(page_html: str) -> pd.DataFrame:
    rows: list[dict] = []
    for session, block in _session_blocks(page_html):
        year = session_to_year(session)
        lines = _BR.split(block)

        session_symbol: str | None = None
        number_stem: str | None = None
        items: list[dict] = []
        current: dict | None = None

        def flush() -> None:
            nonlocal current
            if current and current["title"].strip():
                items.append(current)
            current = None

        for raw in lines:
            text = strip_tags(raw)
            if not text:
                continue
            low = text.lower()

            if low.startswith("download:"):
                if current is not None:
                    href = _ENGLISH_HREF.search(raw)
                    if href:
                        current["link"] = _absolute(href.group(1))
                continue
            if low.startswith("extracted from"):
                session_symbol = re.sub(
                    r"^extracted from\s*:?\s*", "", text, flags=re.I
                ).strip()
                continue
            if _is_noise(text):
                continue
            # A bare ECOSOC reference number ("1998/12", "2001/5") heads a set of
            # sub-lettered conclusions. It is not an item itself; remember it so
            # the sub-items can carry their full number ("2001/5 A").
            if re.fullmatch(r"\d{4}/\d+", text):
                flush()
                number_stem = text
                continue

            if _ITEM_LABEL.match(text):
                flush()
                current = {"title": text, "link": None, "stem": number_stem}
            elif current is not None and current["link"] is None:
                # Continuation of the current item's title/description.
                current["title"] = f"{current['title']} {text}".strip()
            else:
                # A new title-only item (standalone declaration, session report).
                flush()
                current = {"title": text, "link": None, "stem": number_stem}

            # Capture an inline link (e.g. the <li> session-report anchor).
            if current is not None and current["link"] is None:
                href = _ANY_HREF.search(raw)
                if href and "English" not in raw:
                    current["link"] = _absolute(href.group(1))
        flush()

        for item in items:
            title = item["title"]
            m = _ITEM_LABEL.match(title)
            label, description = "", title
            if m:
                label = title[: m.end()].strip(" :.-")
                description = title[m.end():].lstrip(" :.-").strip() or title
            description = re.sub(r"\s*\([EAS]/[^)]+\)\s*$", "", description).strip()
            item_type = _classify(title)
            paren = _PAREN_SYMBOL.search(title)
            report_symbol = paren.group(1) if paren else session_symbol

            # Qualify a bare sub-item letter with its ECOSOC number ("2001/5 A").
            full_label = label
            if item["stem"] and re.fullmatch(r"[A-Z]", label):
                full_label = f"{item['stem']} {label}"

            # Only the symbol the page itself links is a real document symbol.
            link = item["link"] or URL
            ods = _ODS_LINK.search(link)
            ods_symbol = ods.group(1).rstrip("/.") if ods else ""

            rows.append(
                {
                    "session": session,
                    "year": year,
                    "type": item_type,
                    "item_label": full_label,
                    "description": description,
                    "report_symbol": report_symbol,
                    "link_en": link,
                    "ods_symbol": ods_symbol,
                    "document_key": ods_symbol
                    or _document_key(session, year, item_type, full_label),
                }
            )

    df = pd.DataFrame(rows)
    df = df.sort_values(["session", "document_key"]).reset_index(drop=True)
    return df


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--offline",
        action="store_true",
        help="parse the saved snapshot instead of fetching the live page",
    )
    args = ap.parse_args()

    page_html = fetch(offline=args.offline)
    df = parse(page_html)
    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_CSV, index=False)
    print(f"Parsed {len(df)} CSW outcome items across "
          f"{df['session'].nunique()} sessions -> {OUTPUT_CSV}")
    print(df.groupby("year").size().to_string())


if __name__ == "__main__":
    main()
