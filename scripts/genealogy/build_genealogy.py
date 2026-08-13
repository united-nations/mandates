#!/usr/bin/env python3
"""Boilerplate Genealogy precompute.

Traces how resolution text mutates across renewal chains: which paragraphs are
copy-pasted verbatim for decades (boilerplate), which mutate, which appear and
disappear.

Chains come from the committed `digitallibrary.resolution_series` matview
(migrations 021 + 030): recurring, non-collection, informative groups of
resolutions/decisions/HRC-presidential-statements sharing a normalized title.
We treat each (series_key, un_body, doc_type) group as one renewal chain.

For every chain with >= 3 documents that each carry >= 3 substantive
(preambular/operative) paragraphs, we align paragraphs between *consecutive*
documents in time order and build per-paragraph lineages.

Alignment method (documented in docs/lens-genealogy/ANALYSIS.md):
  - Substantive paragraphs only: paragraph_type in ('preambular','operative'),
    char_length >= 25. This drops procedural meeting notes, footnotes and vote
    records (parsed as type NULL) which are per-document noise.
  - Similarity uses difflib.SequenceMatcher.ratio() on token lists.
      * MATCH ratio (norm): tokens lower-cased, digits collapsed to '#',
        punctuation stripped -> so a clause that only changes its dates / meeting
        numbers / report symbols still tracks across renewals.
      * VERBATIM ratio (raw): tokens lower-cased only. Distinguishes a literal
        copy-paste from a date-only edit.
  - Greedy matching between consecutive documents: candidate pairs with a
    length-bucket prefilter (token-length ratio >= 0.4) and norm ratio >= 0.55
    are sorted descending and assigned uniquely.
  - Status of a matched paragraph: VERBATIM if raw ratio >= 0.97, else MUTATED
    (norm ratio >= 0.55 but raw < 0.97). Unmatched-in-current = NEW (born).
    Unmatched-in-previous = the lineage's last appearance.

Output: website/src/data/genealogy.json (headline aggregates over all analyzed
chains + oldest surviving sentences + per-cell DNA detail for a featured subset
offered in the picker).

Stdlib only. Reads the DB read-only via `psql "$DATABASE_URL"` (NDJSON).
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from difflib import SequenceMatcher

# ---- tunables -------------------------------------------------------------
MAX_CHAINS_ANALYZED = 200  # cap for headline + oldest-sentence aggregates
N_FEATURED = 30  # chains shipped with full DNA detail to the client
MIN_DOCS = 3
MIN_QUAL_PARAS = 3
LEN_BUCKET = 0.4  # token-length ratio prefilter
MATCH_RATIO = 0.55  # norm-ratio threshold to be "the same clause"
VERBATIM_RATIO = 0.97  # raw-ratio threshold to be a literal copy-paste
SNIPPET_LEN = 170
MAX_COLS = 260  # cap DNA-grid columns per featured chain (adaptive threshold)
GAP_BRIDGE = 2  # max renewal gap over which a dropped paragraph can reconnect

# Hand-check defaults that must be offered in the DNA picker (see ANALYSIS.md).
# (series_key, un_body, doc_type)
FORCED_FEATURED = [
    ("extension of the mandate of the un interim force in lebanon unifil",
     "Security Council", "RES"),
    ("oceans and the law of the sea", "General Assembly", "RES"),
    ("situation of human rights in belarus", "General Assembly", "RES"),
]

WORD_RE = re.compile(r"[a-z0-9#]+")


def psql_ndjson(sql: str) -> list[dict]:
    url = os.environ["DATABASE_URL"]
    # -tAX: tuples-only, unaligned (no backslash escaping, unlike COPY text),
    # no psqlrc. row_to_json emits valid single-line JSON per row.
    out = subprocess.run(
        ["psql", url, "-tAX", "-v", "ON_ERROR_STOP=1", "-c", sql],
        capture_output=True, text=True,
    )
    if out.returncode != 0:
        sys.stderr.write(out.stderr)
        raise SystemExit(f"psql failed: {out.returncode}")
    rows = []
    for line in out.stdout.splitlines():
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def norm_tokens(text: str) -> list[str]:
    """Match tokens: lower-cased, digit-runs collapsed to '#'."""
    t = text.lower()
    t = re.sub(r"\d+", "#", t)
    return WORD_RE.findall(t)


def raw_tokens(text: str) -> list[str]:
    return WORD_RE.findall(text.lower())


def slugify(*parts: str) -> str:
    """Readable, collision-proof id: truncated slug + 6-char key hash.

    The hash guards against distinct series whose titles share an 80-char
    prefix (e.g. UNIFIL '...in lebanon' vs '...in lebanon unifil')."""
    joined = " ".join(parts)
    s = re.sub(r"[^a-z0-9]+", "-", joined.lower()).strip("-")
    h = hashlib.sha1(joined.encode("utf-8")).hexdigest()[:6]
    return f"{s[:66]}-{h}"


@dataclass
class Para:
    position: int
    text: str
    ntok: list[str] = field(default_factory=list)
    rtok: list[str] = field(default_factory=list)

    def prep(self) -> "Para":
        self.ntok = norm_tokens(self.text)
        self.rtok = raw_tokens(self.text)
        return self


@dataclass
class Doc:
    symbol: str
    year: int
    paras: list[Para]


def match_pair(prev: list[Para], cur: list[Para]) -> dict[int, tuple[int, float, float]]:
    """Return {cur_idx: (prev_idx, norm_ratio, raw_ratio)} greedy best matches."""
    cands: list[tuple[float, int, int, float]] = []  # (nratio, ci, pi, rratio)
    for ci, c in enumerate(cur):
        lc = len(c.ntok)
        if lc == 0:
            continue
        for pi, p in enumerate(prev):
            lp = len(p.ntok)
            if lp == 0:
                continue
            lo, hi = (lc, lp) if lc <= lp else (lp, lc)
            if lo / hi < LEN_BUCKET:
                continue
            sm = SequenceMatcher(None, c.ntok, p.ntok, autojunk=False)
            # cheap upper bounds first: skip pairs that cannot clear MATCH_RATIO
            if sm.real_quick_ratio() < MATCH_RATIO:
                continue
            if sm.quick_ratio() < MATCH_RATIO:
                continue
            nr = sm.ratio()
            if nr < MATCH_RATIO:
                continue
            cands.append((nr, ci, pi, -1.0))
    cands.sort(key=lambda x: x[0], reverse=True)
    used_c: set[int] = set()
    used_p: set[int] = set()
    result: dict[int, tuple[int, float, float]] = {}
    for nr, ci, pi, _ in cands:
        if ci in used_c or pi in used_p:
            continue
        rr = SequenceMatcher(
            None, cur[ci].rtok, prev[pi].rtok, autojunk=False).ratio()
        result[ci] = (pi, nr, rr)
        used_c.add(ci)
        used_p.add(pi)
    return result


def analyze_chain(docs: list[Doc]) -> dict:
    """Build lineages + per-doc/per-cell status for one ordered chain."""
    for d in docs:
        for p in d.paras:
            p.prep()

    next_lineage = 0
    # per doc: list of cells aligned to doc.paras order
    #   cell = {"lin": int, "st": "v"|"m"|"n"}
    doc_cells: list[list[dict]] = []
    # lineage bookkeeping
    lin_born: dict[int, int] = {}
    lin_last: dict[int, int] = {}
    lin_snip: dict[int, str] = {}
    lin_first_text: dict[int, str] = {}
    lin_status_run: dict[int, list[str]] = defaultdict(list)
    lin_docs: dict[int, list[int]] = defaultdict(list)  # doc indices present
    # last tokens seen per lineage, for bridging a lineage across a short gap
    # (a paragraph dropped for one renewal then re-adopted) instead of minting
    # a duplicate. Genuinely new text won't match any recently-ended lineage,
    # so real regime breaks (e.g. UNIFIL after resolution 1701) still show.
    lin_last_ntok: dict[int, list[str]] = {}
    lin_last_di: dict[int, int] = {}

    prev_lin_by_paraidx: dict[int, int] = {}

    for di, d in enumerate(docs):
        cells: list[dict] = []
        cur_lin_by_paraidx: dict[int, int] = {}
        if di == 0:
            matches: dict[int, tuple[int, float, float]] = {}
        else:
            matches = match_pair(docs[di - 1].paras, d.paras)
        # lineages eligible to be resumed across a 1-2 doc gap: last seen at
        # di-2 or di-3, and not present in di-1 (those are handled by matches).
        resume_pool = [
            lin for lin, ldi in lin_last_di.items()
            if di - GAP_BRIDGE - 1 <= ldi <= di - 2
        ]
        used_resume: set[int] = set()
        for ci, p in enumerate(d.paras):
            if ci in matches:
                pi, nr, rr = matches[ci]
                lin = prev_lin_by_paraidx.get(pi)
                if lin is None:  # safety; shouldn't happen
                    lin = next_lineage
                    next_lineage += 1
                    lin_born[lin] = d.year
                    lin_first_text[lin] = p.text
                    st = "n"
                else:
                    st = "v" if rr >= VERBATIM_RATIO else "m"
            else:
                # try to bridge a short gap before minting a new lineage
                best_lin = None
                best_r = MATCH_RATIO
                for lin2 in resume_pool:
                    if lin2 in used_resume:
                        continue
                    toks = lin_last_ntok[lin2]
                    lo, hi = (len(p.ntok), len(toks))
                    if lo == 0 or hi == 0:
                        continue
                    if min(lo, hi) / max(lo, hi) < LEN_BUCKET:
                        continue
                    r = SequenceMatcher(
                        None, p.ntok, toks, autojunk=False).ratio()
                    if r > best_r:
                        best_r = r
                        best_lin = lin2
                if best_lin is not None:
                    lin = best_lin
                    used_resume.add(lin)
                    st = "m"  # a gap-bridged re-adoption is, by definition, edited
                else:
                    lin = next_lineage
                    next_lineage += 1
                    lin_born[lin] = d.year
                    lin_first_text[lin] = p.text
                    st = "n"
            lin_last[lin] = d.year
            lin_snip[lin] = p.text
            lin_status_run[lin].append(st)
            lin_docs[lin].append(di)
            lin_last_ntok[lin] = p.ntok
            lin_last_di[lin] = di
            cur_lin_by_paraidx[ci] = lin
            cells.append({"lin": lin, "st": st})
        doc_cells.append(cells)
        prev_lin_by_paraidx = cur_lin_by_paraidx

    # mark last-appearance flag per cell
    last_doc_of: dict[int, int] = {}
    for lin, dis in lin_docs.items():
        last_doc_of[lin] = dis[-1]
    for di, cells in enumerate(doc_cells):
        for cell in cells:
            if last_doc_of[cell["lin"]] == di and len(lin_docs[cell["lin"]]) > 1:
                cell["end"] = True

    return {
        "doc_cells": doc_cells,
        "lin_born": lin_born,
        "lin_last": lin_last,
        "lin_snip": lin_snip,
        "lin_first_text": lin_first_text,
        "lin_status_run": dict(lin_status_run),
        "lin_docs": {k: v for k, v in lin_docs.items()},
    }


def main() -> None:
    if "DATABASE_URL" not in os.environ:
        raise SystemExit("DATABASE_URL not set")

    print("Selecting chains...", file=sys.stderr)
    # NOTE on chain selection: we deliberately do NOT filter on
    # `is_collection`. That matview flag (max_per_year>=3 OR avg>1.5 docs/year)
    # exists to suppress FALSE named-successor links; but Security Council
    # renewal chains (UNIFIL, MONUSCO, ...) renew twice a year, so avg>1.5
    # marks every one of them as a "collection". For TEXT genealogy dense
    # renewals are the whole point, so we keep them and only drop hard
    # catalog bursts (any single year with >=4 documents — petition/agenda
    # umbrella records). Incoherent groups that slip through simply align as
    # all-new (low verbatim), dragging the boilerplate estimate DOWN, never up.
    chain_sql = f"""
    with q as (
      select rs.series_key, rs.un_body, rs.doc_type,
             rs.document_symbol, rs.year
      from digitallibrary.resolution_series rs
      where rs.is_recurring and rs.is_informative
    ),
    qual as (
      select q.series_key, q.un_body, q.doc_type, q.document_symbol, q.year
      from q
      join digitallibrary.document_paragraphs dp
        on dp.symbol_normalized = q.document_symbol and dp.lang = 'en'
       and dp.paragraph_type in ('preambular','operative')
       and char_length(dp.text) >= 25
      group by 1,2,3,4,5
      having count(*) >= {MIN_QUAL_PARAS}
    ),
    per_year as (
      select series_key, un_body, doc_type, year, count(*) as n_year
      from qual group by 1,2,3,4
    ),
    chains as (
      select series_key, un_body, doc_type,
             sum(n_year) as n_docs, min(year) as miny, max(year) as maxy,
             max(n_year) as max_per_year
      from per_year group by 1,2,3
      having sum(n_year) >= {MIN_DOCS} and max(n_year) < 4
    )
    select row_to_json(t) from (
      select series_key, un_body, doc_type, n_docs, miny, maxy
      from chains order by n_docs desc, maxy desc limit {MAX_CHAINS_ANALYZED}
    ) t
    """
    chain_rows = psql_ndjson(chain_sql)
    print(f"  {len(chain_rows)} chains selected", file=sys.stderr)

    # keys
    keyset = {(c["series_key"], c["un_body"], c["doc_type"]) for c in chain_rows}

    print("Fetching paragraphs...", file=sys.stderr)
    para_sql = f"""
    with q as (
      select rs.series_key, rs.un_body, rs.doc_type,
             rs.document_symbol, rs.year
      from digitallibrary.resolution_series rs
      where rs.is_recurring and rs.is_informative
    ),
    qual as (
      select q.series_key, q.un_body, q.doc_type, q.document_symbol, q.year
      from q
      join digitallibrary.document_paragraphs dp
        on dp.symbol_normalized = q.document_symbol and dp.lang = 'en'
       and dp.paragraph_type in ('preambular','operative')
       and char_length(dp.text) >= 25
      group by 1,2,3,4,5
      having count(*) >= {MIN_QUAL_PARAS}
    ),
    per_year as (
      select series_key, un_body, doc_type, year, count(*) as n_year
      from qual group by 1,2,3,4
    ),
    chains as (
      select series_key, un_body, doc_type,
             sum(n_year) as n_docs, max(year) as maxy
      from per_year group by 1,2,3
      having sum(n_year) >= {MIN_DOCS} and max(n_year) < 4
    ),
    topchains as (
      select series_key, un_body, doc_type from chains
      order by n_docs desc, maxy desc limit {MAX_CHAINS_ANALYZED}
    )
    select row_to_json(t) from (
      select qq.series_key, qq.un_body, qq.doc_type,
             qq.document_symbol as symbol, qq.year,
             dp.position, dp.text
      from qual qq
      join topchains tc using (series_key, un_body, doc_type)
      join digitallibrary.document_paragraphs dp
        on dp.symbol_normalized = qq.document_symbol and dp.lang = 'en'
       and dp.paragraph_type in ('preambular','operative')
       and char_length(dp.text) >= 25
      order by qq.series_key, qq.un_body, qq.doc_type, qq.year,
               qq.document_symbol, dp.position
    ) t
    """
    para_rows = psql_ndjson(para_sql)
    print(f"  {len(para_rows)} paragraphs fetched", file=sys.stderr)

    # group -> symbol -> paras
    grouped: dict[tuple, dict[str, dict]] = defaultdict(lambda: defaultdict(dict))
    doc_year: dict[tuple, dict[str, int]] = defaultdict(dict)
    for r in para_rows:
        key = (r["series_key"], r["un_body"], r["doc_type"])
        if key not in keyset:
            continue
        sym = r["symbol"]
        doc_year[key][sym] = r["year"]
        grouped[key].setdefault(sym, {})[r["position"]] = r["text"]

    chain_meta = {(c["series_key"], c["un_body"], c["doc_type"]): c
                  for c in chain_rows}

    # decide featured chains: the forced hand-check defaults, then a body mix
    # so the picker isn't all-GA (Security Council renewal chains are the
    # cleanest boilerplate examples).
    forced = [k for k in FORCED_FEATURED if k in keyset]
    ranked = sorted(keyset, key=lambda k: -chain_meta[k]["n_docs"])
    featured: list[tuple] = list(forced)

    def add_from(pred, limit):
        added = 0
        for k in ranked:
            if len(featured) >= N_FEATURED or added >= limit:
                break
            if k not in featured and pred(k):
                featured.append(k)
                added += 1

    add_from(lambda k: k[1] == "Security Council", 10)
    add_from(lambda k: k[1] == "General Assembly", 12)
    add_from(lambda k: True, N_FEATURED)  # fill remainder with any
    featured_set = set(featured)

    # aggregates
    age_stats: dict[int, dict[str, float]] = defaultdict(
        lambda: {"n": 0, "v": 0.0, "m": 0.0, "new": 0.0})
    decade_stats: dict[int, dict[str, float]] = defaultdict(
        lambda: {"n": 0, "v": 0.0, "m": 0.0, "new": 0.0})
    oldest: list[dict] = []
    chains_summary: list[dict] = []
    detail: dict[str, dict] = {}
    total_docs = 0
    total_paras = 0

    print("Analyzing chains...", file=sys.stderr)
    for key in ranked:
        sk, body, dtype = key
        syms = grouped.get(key, {})
        if len(syms) < MIN_DOCS:
            continue
        # order docs by (year, symbol)
        ordered = sorted(syms.keys(), key=lambda s: (doc_year[key][s], s))
        docs: list[Doc] = []
        for s in ordered:
            posmap = syms[s]
            paras = [Para(position=pos, text=posmap[pos])
                     for pos in sorted(posmap.keys())]
            docs.append(Doc(symbol=s, year=doc_year[key][s], paras=paras))
        if len(docs) < MIN_DOCS:
            continue
        total_docs += len(docs)
        total_paras += sum(len(d.paras) for d in docs)

        res = analyze_chain(docs)
        doc_cells = res["doc_cells"]

        # per-doc percentages for renewals (skip doc 0 which has no predecessor)
        per_doc_pct = []
        chain_verbatim_accum = []
        for di, cells in enumerate(doc_cells):
            n = len(cells)
            if n == 0:
                per_doc_pct.append(None)
                continue
            v = sum(1 for c in cells if c["st"] == "v")
            m = sum(1 for c in cells if c["st"] == "m")
            nw = sum(1 for c in cells if c["st"] == "n")
            pct = {"year": docs[di].year, "v": v, "m": m, "new": nw,
                   "n": n,
                   "vpct": round(100 * v / n, 1),
                   "mpct": round(100 * m / n, 1),
                   "newpct": round(100 * nw / n, 1),
                   "carriedpct": round(100 * (v + m) / n, 1)}
            per_doc_pct.append(pct)
            if di >= 1:  # renewal
                age = di  # 1 = first renewal
                a = age_stats[age]
                a["n"] += 1
                a["v"] += pct["vpct"]
                a["m"] += pct["mpct"]
                a["new"] += pct["newpct"]
                dec = (docs[di].year // 10) * 10
                dd = decade_stats[dec]
                dd["n"] += 1
                dd["v"] += pct["vpct"]
                dd["m"] += pct["mpct"]
                dd["new"] += pct["newpct"]
                chain_verbatim_accum.append(pct["vpct"])

        chain_id = slugify(body, dtype, sk)
        chains_summary.append({
            "id": chain_id,
            "title": sk,
            "body": body,
            "docType": dtype,
            "firstYear": docs[0].year,
            "lastYear": docs[-1].year,
            "nDocs": len(docs),
            "avgVerbatimPct": round(
                sum(chain_verbatim_accum) / len(chain_verbatim_accum), 1)
            if chain_verbatim_accum else None,
        })

        # oldest surviving verbatim sentences
        for lin, run in res["lin_status_run"].items():
            ndocs_present = len(res["lin_docs"][lin])
            if ndocs_present < 4:
                continue
            n_mut = sum(1 for s in run if s == "m")
            # count max consecutive verbatim run (first occ is 'n', treat as
            # start of a verbatim life if subsequent are 'v')
            best = cur = 0
            for s in run:
                if s in ("v", "n"):
                    cur += 1
                    best = max(best, cur)
                else:
                    cur = 0
            span = res["lin_last"][lin] - res["lin_born"][lin]
            # "surviving verbatim" = present in many docs, essentially unchanged
            if n_mut <= 1 and best >= 4:
                oldest.append({
                    "text": res["lin_first_text"][lin][:400],
                    "bornYear": res["lin_born"][lin],
                    "lastYear": res["lin_last"][lin],
                    "spanYears": span,
                    "nDocs": ndocs_present,
                    "verbatimRun": best,
                    "chainId": chain_id,
                    "chainTitle": sk,
                    "body": body,
                })

        # detail only for featured chains
        if key in featured_set:
            # lineage columns: only lineages present in >= 2 docs (drop
            # one-off procedural churn from the grid); order by (born, first pos)
            lin_first_pos: dict[int, int] = {}
            for di, cells in enumerate(doc_cells):
                for pos, cell in enumerate(cells):
                    lin_first_pos.setdefault(cell["lin"], pos + di * 1000)
            # DNA columns = lineages present in >= min_present docs. For very
            # churny chains (oceans grows to ~2000 paras) raise the bar so the
            # grid stays legible; folded lineages are still counted per row as
            # "one-off / short-lived" churn.
            min_present = 2
            while True:
                persistent = [lin for lin in res["lin_docs"]
                              if len(res["lin_docs"][lin]) >= min_present]
                if len(persistent) <= MAX_COLS or min_present >= 8:
                    break
                min_present += 1
            persistent.sort(key=lambda l: (res["lin_born"][l],
                                           lin_first_pos.get(l, 0)))
            col_index = {lin: i for i, lin in enumerate(persistent)}

            ddocs = []
            for di, d in enumerate(docs):
                cells = doc_cells[di]
                row = {}
                singles = 0
                for cell in cells:
                    lin = cell["lin"]
                    if lin in col_index:
                        entry = cell["st"]
                        if cell.get("end"):
                            entry += "e"
                        row[str(col_index[lin])] = entry
                    else:
                        singles += 1
                ddocs.append({
                    "symbol": d.symbol,
                    "year": d.year,
                    "row": row,
                    "singles": singles,
                    "n": len(cells),
                })
            columns = []
            for lin in persistent:
                columns.append({
                    "born": res["lin_born"][lin],
                    "last": res["lin_last"][lin],
                    "nDocs": len(res["lin_docs"][lin]),
                    "snippet": res["lin_snip"][lin][:SNIPPET_LEN],
                })
            detail[chain_id] = {
                "title": sk,
                "body": body,
                "docType": dtype,
                "columns": columns,
                "docs": ddocs,
                "perDoc": per_doc_pct,
                "minPresent": min_present,
            }

    # finalize aggregates
    headline_by_age = []
    for age in sorted(age_stats.keys()):
        a = age_stats[age]
        if a["n"] < 5:  # need enough chains at this age to be meaningful
            continue
        headline_by_age.append({
            "age": age,
            "nChains": int(a["n"]),
            "verbatimPct": round(a["v"] / a["n"], 1),
            "mutatedPct": round(a["m"] / a["n"], 1),
            "newPct": round(a["new"] / a["n"], 1),
        })
    headline_by_decade = []
    for dec in sorted(decade_stats.keys()):
        d = decade_stats[dec]
        if d["n"] < 5:
            continue
        headline_by_decade.append({
            "decade": dec,
            "nRenewals": int(d["n"]),
            "verbatimPct": round(d["v"] / d["n"], 1),
            "mutatedPct": round(d["m"] / d["n"], 1),
            "newPct": round(d["new"] / d["n"], 1),
        })

    oldest.sort(key=lambda o: (-o["spanYears"], -o["verbatimRun"]))
    # de-dup near-identical texts, keep the longest span
    seen: set[str] = set()
    oldest_top = []
    for o in oldest:
        sig = re.sub(r"\d+", "#", o["text"].lower())[:120]
        if sig in seen:
            continue
        seen.add(sig)
        oldest_top.append(o)
        if len(oldest_top) >= 25:
            break

    featured_ids = [slugify(b, dt, sk) for (sk, b, dt) in featured]

    out = {
        "meta": {
            "nChainsAnalyzed": len(chains_summary),
            "nChainsFeatured": len(detail),
            "nDocs": total_docs,
            "nParas": total_paras,
            "thresholds": {
                "verbatim": VERBATIM_RATIO,
                "match": MATCH_RATIO,
                "lenBucket": LEN_BUCKET,
            },
            "cap": MAX_CHAINS_ANALYZED,
        },
        "headlineByAge": headline_by_age,
        "headlineByDecade": headline_by_decade,
        "chains": sorted(chains_summary, key=lambda c: -c["nDocs"]),
        "featured": featured_ids,
        "oldestSentences": oldest_top,
        "detail": detail,
    }

    outpath = os.path.join(
        os.path.dirname(__file__), "..", "..", "website", "src", "data",
        "genealogy.json")
    outpath = os.path.abspath(outpath)
    with open(outpath, "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    size = os.path.getsize(outpath)
    print(f"Wrote {outpath} ({size/1024:.0f} KB)", file=sys.stderr)
    print(f"  analyzed={len(chains_summary)} featured={len(detail)} "
          f"docs={total_docs} paras={total_paras} "
          f"oldest={len(oldest_top)}", file=sys.stderr)
    # quick headline print
    for h in headline_by_age[:8]:
        print(f"  renewal {h['age']}: verbatim {h['verbatimPct']}% "
              f"mutated {h['mutatedPct']}% new {h['newPct']}% "
              f"(n={h['nChains']})", file=sys.stderr)


if __name__ == "__main__":
    main()
