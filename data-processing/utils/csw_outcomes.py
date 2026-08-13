"""Scrape the Commission on the Status of Women (CSW) session outcomes list.

The 2027 Programme Budget (A/81/6, Sect. 17, UN-Women) no longer enumerates the
CSW political declarations and agreed conclusions individually. Instead it says:

    "The list of agreed conclusions from 1996 to 2025 is available at the
     following link: www.unwomen.org/en/csw/outcomes."

This module reproduces exactly that list, sourced solely from a scrape of that
page (no merge with the historical 2026 enumeration). It emits one row per
downloadable outcome item (each agreed conclusion, each standalone declaration),
which is then imported as UN-Women legislative-mandate citations for the PPB 2027
vintage via ``sql/migrations/039_import_csw_outcomes.sql``.

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


def _make_symbol(year: int, slug_source: str, seq: int) -> str:
    """Stable, unique, scrape-derived key (individual conclusions lack ODS symbols)."""
    norm = re.sub(r"[^a-z0-9]+", "-", slug_source.lower()).strip("-")
    norm = "-".join(norm.split("-")[:6]) or str(seq)
    return f"CSW/{year}/{norm}"


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
    # A bare ECOSOC reference number ("1998/12", "2001/5") that heads a set of
    # sub-lettered/roman conclusions — the sub-items carry the real content.
    if re.fullmatch(r"\d{4}/\d+", text):
        return True
    # Bare language pipes / brackets left over from a Download line.
    return bool(re.fullmatch(r"[\[\]|\s]*", text))


def parse(page_html: str) -> pd.DataFrame:
    rows: list[dict] = []
    for session, block in _session_blocks(page_html):
        year = session_to_year(session)
        lines = _BR.split(block)

        session_symbol: str | None = None
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

            if _ITEM_LABEL.match(text):
                flush()
                current = {"title": text, "link": None}
            elif current is not None and current["link"] is None:
                # Continuation of the current item's title/description.
                current["title"] = f"{current['title']} {text}".strip()
            else:
                # A new title-only item (standalone declaration, session report).
                flush()
                current = {"title": text, "link": None}

            # Capture an inline link (e.g. the <li> session-report anchor).
            if current is not None and current["link"] is None:
                href = _ANY_HREF.search(raw)
                if href and "English" not in raw:
                    current["link"] = _absolute(href.group(1))
        flush()

        for seq, item in enumerate(items, start=1):
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
            if label:
                slug = label
            elif item_type in {"declaration", "political declaration", "report"}:
                slug = item_type.replace(" ", "-")
            else:
                slug = description
            rows.append(
                {
                    "session": session,
                    "year": year,
                    "type": item_type,
                    "item_label": label,
                    "description": description,
                    "report_symbol": report_symbol,
                    "link_en": item["link"] or URL,
                    "full_document_symbol": _make_symbol(year, slug, seq),
                }
            )

    df = pd.DataFrame(rows)
    df = df.sort_values(["session", "full_document_symbol"]).reset_index(drop=True)
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
