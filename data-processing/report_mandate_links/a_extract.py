"""
PURPOSE
    Stage 1 extractor: SG report -> mandating-resolution links, extracted in the
    report->resolution direction (rules_ §1) for later inversion at display time.

    STAGE A (implemented here): the pure core — settled constants, types, the
    citation parser over the twelve symbol grammars, sense/role classification,
    pinpoint capture, the three symbol functions, and the pure spine `extract`.
    No I/O anywhere in it; everything is testable from fixtures alone.

    STAGE B (deliberately not built): the I/O edges — `read_sg_report_rows`,
    `load_display_index`, `write_link_rows`, `write_unparsed_notes`,
    `run_stage1` — remain `raise NotImplementedError` with their contracts in
    the docstrings. They depend on where the link table physically lives, which
    is an open decision (rules_ §8).

DETAIL
    The shape is a reviewed structural design and is settled: functions are not
    merged, split, renamed or re-scoped here. Each docstring names the
    rules-doc section that governs it; "unresolved" comments mark decisions
    deliberately left open.

    Governing references (maintained separately):
      rules_reports-to-mandates-extraction.md    — the method (authoritative)
      reference_symbol-grammars-and-join-keys.md — the symbol layer (authoritative)
    Input surface settled by live-data probes: notes[] prose is the ONLY input
    path; MARC 993$a is closed; single-armed extractor.

STATUS
    Pure core implemented. I/O edges are the next stage.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Iterable, Literal


# =====================================================================================
# SETTLED CONSTANTS — not parameters, not config. Each is a closed decision.
# Do not lift any of these to a function argument or a config table: doing so would
# invent a caller / a variant that the domain does not have.
# =====================================================================================

# The one selector value (Decision 1 / §2) — recovered from marcxml by XPath; it is
# not mirrored as a column.
SG_REPORT_MARC_989C: str = "Secretary-General's Reports"

# Organ vocabulary the PARSER must recognise. This is the full set — parser scope is
# NOT the same decision as display scope, and recognition is not reversible (§5.1):
# an unrecognised organ is silently mis-prefixed to a real GA resolution, the worst
# failure class (§7). A settled decision; a constant, never a parameter.
#   Display scope (a separate, reversible WHERE clause at read time) is: GA, SC, HRC
#   displayed; ECOSOC captured-not-displayed; PRST/decisions diverted (§3 scope table).
PARSER_ORGANS: dict[str, str] = {
    # organ prose token (lowered)      -> canonical symbol prefix
    "general assembly":                 "A/RES/",
    "security council":                 "S/RES/",
    "human rights council":             "A/HRC/RES/",   # §5.1 — required in v1 regardless of display
    "economic and social council":     "E/RES/",        # captured, not displayed
}

# The bracket fold, settled by §5 / reference_ §2. Strip a trailing
# bracketed section part, NEVER parse its contents (§2.1: [I]/[V]/[X] are letters on
# one resolution and roman numerals on another). Applies to match_key ONLY, above
# identity, never folded into canonical. One regex — not a pluggable table.
BRACKET_FOLD_PATTERN: str = r"\[([A-Z]+)\]$"


# =====================================================================================
# GRAMMAR AND CUE PATTERNS — every regex in the module, compiled once, named, never
# inline. reference_ §2's twelve grammars are implemented across three layers, by
# design (§5/§6):
#   prose recognition (recognise_citations)  grammars 1-7, 11, 12 — the forms notes write
#   whitespace strip  (canonical)            grammar 8            — spaced -> bare letter part
#   bracket fold      (match_key)            grammars 9, 10       — registry-side encoding
# LEDGER (grammar # -> pattern):
#   1, 3, 4 -> _SESSION_NUMBER   2 -> _NUMBER_YEAR    5 -> _ROMAN_SESSION
#   6 -> _ES_SESSION             7, 8 -> _LETTER_PART (8 folds via canonical)
#   9, 10 -> BRACKET_FOLD_RE     11, 12 -> _LETTER_RANGE
# =====================================================================================

# --- number-form fragments (prose side) ----------------------------------------------
# Grammars 1 / 3 / 4 share one prose shape — "digits/digits" — and are told apart ONLY
# by the resolved organ prefix (PARSER_ORGANS), never by digit shape:
#   grammar 1  GA     A/RES/79/223     prose "General Assembly resolution 78/176"
#   grammar 3  ECOSOC E/RES/1978/1     prose "Economic and Social Council resolution 2024/8"
#   grammar 4  HRC    A/HRC/RES/10/1   prose "Human Rights Council resolution 41/19"
_SESSION_NUMBER = r"\d+/\d+"

# Grammar 2 — SC number(year): S/RES/1325(2000);
#   prose "Security Council resolution 2779 (2025)"
_NUMBER_YEAR = r"\d+\s?\(\d{4}\)"

# Grammar 5 — roman session: A/RES/3376(XXX); prose "resolution 3376 (XXX)".
# Roman parens vs year parens are disjoint character classes, so the two never collide.
# NOTE: like every citation, a roman-session citation still needs a governing organ
# earlier in the element — the reference doc does not prove roman sessions are
# GA-exclusive, so the organ is never inferred from the number shape.
_ROMAN_SESSION = r"\d+\s?\([IVXLCDM]+\)"

# Grammar 6 — emergency special session: A/RES/ES-10/1; prose form "resolution ES-10/1"
# (prose form inferred from the symbol form; not yet attested in a live note).
_ES_SESSION = r"ES-\d+/\d+"

# Grammars 7 / 8 — letter part, bare A/RES/39/213A and spaced A/RES/72/266 A; one prose
# shape "resolution 72/266 A". Grammar 8 exists only registry-side: canonical's
# whitespace strip folds spaced -> bare, so no separate prose pattern is needed.
# The lookahead stops "72/266 A" matching the "A" of a following word ("... 79/140 And").
_LETTER_PART = _SESSION_NUMBER + r"\s?[A-Z](?![A-Za-z\-–])"

# Grammar 11 — letter range, bare: A/RES/31/141A-B; prose "resolution 31/141 A-B".
# Grammar 12 — letter range, en dash: A/RES/79/93 A–B (2 rows). Neither folds — a range
# is not a citation of either part; the en-dash rows fall to pending_coverage by design.
_LETTER_RANGE = _SESSION_NUMBER + r"\s?[A-Z][\-–][A-Z](?![A-Za-z])"

# One token = one cited symbol's number form. Alternation is ordered so composite forms
# are tried before their prefixes (range before letter part before session/number) —
# that ordering is a matching-correctness concern only; OUTPUT order never depends on
# it (extract sorts by span — HARD CONSTRAINT, determinism).
_CITATION_TOKEN = (
    "(?:"
    + "|".join([_ES_SESSION, _LETTER_RANGE, _LETTER_PART,
                _ROMAN_SESSION, _NUMBER_YEAR, _SESSION_NUMBER])
    + ")"
)
CITATION_TOKEN_RE = re.compile(_CITATION_TOKEN)

# Pinpoint prefix — "para. 50 of resolution 2808" (rules_ §1/§5). Captured into the
# first citation's prose_symbol so extract_pinpoint can read it back; narrowest
# observed shape only (no article/section variants — none observed).
_PINPOINT_PREFIX = r"(?:para(?:graph|\.)\s+\d+\s+of\s+)?"

# A "resolution(s)" head followed by one or more tokens: the symbol gate of the §3
# include rule. "resolutions X, Y and Z" is one head governing a token list.
_LIST_SEP = r"(?:\s*,\s*(?:and\s+)?|\s+and\s+)"
CITATION_LIST_RE = re.compile(
    _PINPOINT_PREFIX
    + r"\b(?i:resolutions?)\s+"
    + _CITATION_TOKEN
    + "(?:" + _LIST_SEP + _CITATION_TOKEN + ")*"
)

# PRST — arrives symbol-form in prose: "…statement of the President … (S/PRST/2024/7)"
# (rules_ §3 scope table). Notes/decisions by the President have no attested symbol
# grammar and are NOT recognised; widening is observation-gated.
PRST_SYMBOL_RE = re.compile(r"\bS/PRST/\d{4}/\d+")

# Organ mentions, for direct attribution and for the §3 bare-citation rule (organ
# carried from EARLIER in the same element — never across elements, never guessed).
ORGAN_MENTION_RE = re.compile(
    "|".join(re.escape(token) for token in PARSER_ORGANS), re.IGNORECASE
)

# The §3 include-rule construction: pursuant/prepared/submitted/requested/in response
# to/in pursuance of. Verb-agnostic, symbol-gated; also the generic direct_request
# sense cue below. "in pursuance of" is the first observation-gated widening (S-006):
# five live instances in the census (§6), independently confirmed by the survey
# extractor's gateless matches on the same five notes (comparison §3.2).
MANDATE_CONSTRUCTION_RE = re.compile(
    r"\b(?:pursuant\s+to|in\s+pursuance\s+of|in\s+response\s+to|submitted|prepared|requested)\b",
    re.IGNORECASE,
)

# --- classification cues (each compiled once; shared between tables by name) ---------
_COMMITTEE_ESTABLISHED_RE = re.compile(r"\bcommittee\s+established\s+pursuant\s+to\b", re.IGNORECASE)
_ACTIVITIES_CARRIED_OUT_RE = re.compile(r"\bactivities\s+carried\s+out\b", re.IGNORECASE)
_ALSO_IN_RESPONSE_RE = re.compile(r"\balso\s+in\s+response\s+to\b", re.IGNORECASE)
_MANDATE_CONTAINED_RE = re.compile(r"\bmandate\s+contained\s+in\b", re.IGNORECASE)
_MOST_RECENTLY_RE = re.compile(r"\bmost\s+recently\b", re.IGNORECASE)
_ESTABLISHED_PURSUANT_RE = re.compile(r"\bestablished\s+pursuant\s+to\b", re.IGNORECASE)

# Sense cues (§3 taxonomy), highest priority first. Priority — not nearest-cue —
# decides among cues preceding a citation, because specific phrasings embed generic
# ones: in "activities carried out … pursuant to resolution 186 (1964)" the generic
# "pursuant to" sits NEARER the citation than the cue that actually names its sense.
_SENSE_CUES: tuple[tuple[re.Pattern[str], "Sense", int], ...] = (
    (_COMMITTEE_ESTABLISHED_RE, "committee_established", 5),  # "Committee established pursuant to resolution 748 (1992)"
    (_ACTIVITIES_CARRIED_OUT_RE, "activities_carried_out", 4),  # UNFICYP form, §3
    (_ALSO_IN_RESPONSE_RE, "additional_joint", 3),  # "submitted also in response to …"
    (_MANDATE_CONTAINED_RE, "founding_renewal", 2),  # "mandate contained in resolution 350 (1974)"
    (_MOST_RECENTLY_RE, "founding_renewal", 2),      # "… most recently resolution 2811 (2025)"
    (MANDATE_CONSTRUCTION_RE, "direct_request", 1),  # "Submitted pursuant to …"
)

# Role cues (§4.2). Nearest preceding cue decides — role cues carry no generic member,
# so the embedding problem the sense table has does not arise here. No cue = co_equal,
# §4.2's own rule for a flat list (a single direct citation is a flat list of one).
_ROLE_CUES: tuple[tuple[re.Pattern[str], "Role"], ...] = (
    (_MANDATE_CONTAINED_RE, "founding"),
    (_MOST_RECENTLY_RE, "most_recent"),
    (_ESTABLISHED_PURSUANT_RE, "establishing"),
    (_ALSO_IN_RESPONSE_RE, "additional"),
)

# Pinpoint readback (extract_pinpoint) — the same observed shape the prefix captures.
PINPOINT_RE = re.compile(r"para(?:graph|\.)\s+\d+")

# canonical()'s whitespace strip. Python's \s over str is a superset of POSIX
# [[:space:]] (it also strips NBSP etc.) — the spec is upper(strip-ALL-whitespace).
_WHITESPACE_RE = re.compile(r"\s+")

# match_key()'s fold — grammars 9 and 10, one rule (§2: "same rule, same fold"):
#   grammar 9   A/RES/31/106[A]                      -> A/RES/31/106A
#   grammar 10  A/RES/40/252[XII], A/RES/289(IV)[AA] -> A/RES/40/252XII, A/RES/289(IV)AA
# Contents are stripped, never parsed (§2.1).
BRACKET_FOLD_RE = re.compile(BRACKET_FOLD_PATTERN)

# UnparsedNote.reason distinguishes the two unresolvable causes the recognition type
# can express (no symbol at all / organ-less citation token); the verbatim note text is
# the primary evidence either way.
_UNRESOLVED_NOTE_REASON = (
    "mandate construction with no deterministically resolvable in-scope resolution "
    "symbol (rules_ §3; organ never guessed, symbol never invented)"
)
# Used when >=1 citation token was withheld for want of a governing organ. Any
# resolvable citations in the same element were still extracted as link rows alongside
# the diagnostic record — it flags the element, it does not annul it.
_UNRESOLVED_ORGAN_REASON = (
    "citation token with no governing organ earlier in the same note element "
    "(rules_ §3; organ never guessed); any resolvable citations in this element "
    "were extracted as link rows"
)


# =====================================================================================
# TYPES — the consumed interface. These are the expensive-to-reverse objects: the
# values that cross the main boundary live here.
# =====================================================================================

# The mandate-instrument sense of a KEPT citation (Decision 2 / §3 taxonomy). Governs
# display-eligibility. "non_resolution" is absent by construction — it is REJECTED (§3),
# so it never becomes a stored sense. "prst_note_decision" is a real instrument that is
# diverted off resolution pages (its typing is deliberately unresolved).
Sense = Literal[
    "direct_request",        # "Submitted pursuant to SC resolution 2779 (2025)" — display, high conf
    "founding_renewal",      # "mandate contained in 350 (1974) … most recently 2811 (2025)" — capture both
    "additional_joint",      # "also in response to GA resolution 79/140 and ECOSOC 2024/8" — capture all
    "activities_carried_out",# UNFICYP "activities carried out … pursuant to resolution 186 (1964)" — display
    "committee_established",  # "Committee established pursuant to 748 (1992)" — lower conf, hold for review
    "prst_note_decision",    # S/PRST/…, note/decision — real instrument, diverted (not a resolution)
]

# Role of a cited resolution within the report's mandate history (Decision 4 / §4.2).
Role = Literal["founding", "most_recent", "co_equal", "establishing", "additional"]

# Stored confidence (§7). Auto-display vs hold-for-review is a READ-TIME threshold over
# (confidence, sense); the threshold itself is derived, not stored (§0.1 store-the-stable).
Confidence = Literal["high", "low"]


@dataclass(frozen=True)
class RawCitation:
    """
    A recognised, organ-resolved citation before canonicalisation — the value that
    crosses the boundary out of recognise_citations into classification/canonicalisation.
    Carries enough to canonicalise and to classify without re-reading the note.
    """
    organ_prefix: str            # resolved from PARSER_ORGANS or same-element context (§3)
    prose_symbol: str            # the citation as it appeared, organ-resolved (e.g. "resolution 2811 (2025)")
    note_span: tuple[int, int]   # position within the note element — for deterministic ordering


@dataclass(frozen=True)
class NoteRecognition:
    """
    The full result of scanning ONE note element (Decisions 2/3). Carries the citations
    found AND whether the element held a mandate construction at all — so the caller can
    tell "mandate construction, no symbol" (-> retain as UnparsedNote) from "not a
    mandate note" (-> ignore) WITHOUT re-testing for a construction. A flat
    list-of-strings return would throw that provenance away (§8); an empty `citations`
    tuple alone cannot carry the distinction.

    had_unresolvable_citation marks an element in which at least one citation token had
    no governing organ earlier in the element (§3) and was therefore withheld rather
    than guessed. Any OTHER citations in the element still resolve normally — the caller
    emits their link rows AND one diagnostic record for the element (§0.1: capture
    completely; fail loudly, and record).
    """
    citations: tuple[RawCitation, ...]   # organ-resolved citations, in note order (possibly empty)
    had_mandate_construction: bool       # did the element carry a pursuant/submitted/... construction?
    had_unresolvable_citation: bool      # >=1 citation token withheld for want of a governing organ


@dataclass(frozen=True)
class LinkRow:
    """
    §8 output contract — one row per (report, cited resolution). Ten columns, exactly.
    Lossless (§4): never dropped for low confidence. Frozen: a produced row is a value,
    not mutable state — supports determinism (same input, same rows, same order).

    The three resolution columns are the §5 contract and are NOT interchangeable:
      resolution_canonical         identity = symbol_normalized; the fold is never applied here
      resolution_match_key         join key = canonical with BRACKET_FOLD_PATTERN applied
      resolution_display_candidates page keys = every ppb_full_document_symbol variant the
                                     match_key looks up to. EMPTY TUPLE = no registry row for
                                     any variant. There is NO null: the pick among candidates
                                     is read-time (a paragraph-bearing variant is preferred at
                                     display, per §0.1), never stored here.
    On the citation side canonical and match_key are usually identical (prose writes no
    brackets); both are stored anyway so a fold change re-derives one column, not a re-parse.
    """
    report_symbol: str                            # the report's own document_symbol (dual-symbol handling unresolved — see extract)
    report_recid: int                             # digitallibrary.documents.recid
    resolution_canonical: str                     # identity (§5) — equals symbol_normalized
    resolution_match_key: str                     # join key (§5) — indexed; fold applied
    resolution_display_candidates: tuple[str, ...]# page keys (§5) — lookup result; () when no registry row
    role: Role                                    # §4.2
    pinpoint: str | None                          # e.g. "para. 50" — Stage 2 asset, §5/§9
    sense: Sense                                  # §3 taxonomy
    confidence: Confidence                        # §7
    source_note_text: str                         # the verbatim note element it came from (§4.1)


@dataclass(frozen=True)
class UnparsedNote:
    """
    A DIAGNOSTIC record, not part of any consumed interface. It is a note element in
    which at least one citation could not be resolved DETERMINISTICALLY — either the
    element carried a mandate construction but no resolvable symbol at all (worked
    example: "pursuant to the relevant resolutions of the General Assembly" — zero link
    rows), or a citation token had no governing organ and was withheld. In the second
    case any citations that DID resolve have ordinary link rows alongside this record:
    it flags the element, it does not annul it (so the two streams are NOT disjoint —
    a §7 audit must not assume an UnparsedNote implies zero links; `reason` tells the
    cases apart). Exists ONLY so a rejected/unresolved note is auditable and COUNTABLE
    for the §7 quality bar — NEVER so a symbol can be guessed at it later (no fallback).

    NOT a database table, NOT in §8's contract, NOT read by any downstream consumer — it
    is written to a JSONL artefact (see write_unparsed_notes); the retained record has a
    home that is not the link table.
    """
    report_symbol: str
    report_recid: int
    source_note_text: str
    reason: str                              # why it did not resolve (diagnostic; not a guess)


@dataclass(frozen=True)
class SourceReport:
    """
    One already-selected SG report handed to the pure transform. The 989$c / prefix
    selection happens in the read boundary (below); by the time a SourceReport exists,
    Decision 1 (a)(b)(c) is already satisfied. notes[] is the sole evidence path.
    """
    report_recid: int
    report_symbol: str                       # document_symbol; may be dual (e.g. "A/80/723 - S/2026/357") — handling unresolved
    notes: tuple[str, ...]                    # MARC 500$a note elements, per-element (§3)


@dataclass(frozen=True)
class Stage1Output:
    """Bundle of the two output shapes. Grouping only — carries no logic. `unparsed` is
    the diagnostic artefact stream (§7 audit), NOT a second consumed table."""
    links: tuple[LinkRow, ...]
    unparsed: tuple[UnparsedNote, ...]


# A pre-loaded, value-form display index: match_key -> ALL byte-exact page-key variants
# that key resolves to. Built once in a boundary read so the transform stays PURE and
# fixture-testable (§8). It carries every variant and picks none — the pick is
# read-time (§0.1 store-the-stable). Cardinality is 1 for almost every key.
DisplayIndex = dict[str, tuple[str, ...]]

# psycopg2 connection. Kept opaque here — its detail lives only at the I/O edges.
DbConn = Any


# =====================================================================================
# I/O BOUNDARY — the ONLY place database reads and writes live (§8; HARD CONSTRAINT
# "I/O at the edges"). Everything below this banner is a pure function over values.
# STAGE B: these bodies are deliberately unimplemented — they depend on where the link
# table physically lives (rules_ §8 leaves it open). Do not fill them in Stage A.
# =====================================================================================

def read_sg_report_rows(conn: DbConn) -> tuple[SourceReport, ...]:
    """
    Read the in-scope SG reports: MARC 989$c = SG_REPORT_MARC_989C, resource_subtype
    = 'Reports', document_symbol prefix in display scope (Decision 1 a/b/c). Selects
    on 989$c recovered from marcxml by XPath, NOT on doc_class_code.
    MUST apply the CORR/REV exclusions against document_symbol, PRE-canonicalisation:
      symbol NOT LIKE '%/CORR.%' AND symbol NOT LIKE '%/REV.%'
      (the same rule the upstream survey's sg_reports view applies, tested against
      the cleaned symbol, before any fold).
    MUST NOT apply condition (d) here — "has a resolution-citing note" is only knowable
    after parsing; it emerges as "produced zero link rows".
    MUST NOT filter organ scope on un_body — filter on document_symbol prefix (§2/§3:
    A/HRC sits inside un_body = 'General Assembly').
    MUST NOT port the rest of that view's predicate — it restricts to 2023-to-present
    (survey scope), which would silently truncate Stage 1's corpus.
    Governs: §2.
    """
    raise NotImplementedError


def load_display_index(conn: DbConn) -> DisplayIndex:
    """
    Build match_key -> (all page-key variants) from public.unified_documents
    .ppb_full_document_symbol (the `display` function of §5, as a lookup). Applies
    match_key to the registry side and groups every variant under its key.
    MUST NOT construct a page key from a string — byte-exact, two provenances (§5/§6).
    MUST NOT pick among variants here — carry them all; the paragraph-bearing preference
    is a READ-TIME choice (§0.1 store-the-stable overrides §5's stored tie-break).
    No branch or special case: cardinality is 1 for almost every key.
    Governs: §5 / §6 / §0.1 / reference_ §1, §4.
    """
    raise NotImplementedError


def write_link_rows(conn: DbConn, rows: Iterable[LinkRow]) -> None:
    """
    Materialise the lossless link table (§8 — request-time note parsing is too slow for a
    public page). MUST NOT write any coverage-derived field: no pending_coverage, no
    completeness, no displayable count (§0.1 — those are read-time).
    MUST NOT drop a row for low confidence (§4 lossless). Deterministic order (HARD CONSTRAINT).
    Governs: §8 / §4 / §0.1. Migration hazard: diff migration dirs across branches first (§8).
    """
    raise NotImplementedError


def write_unparsed_notes(records: Iterable[UnparsedNote], path: str) -> None:
    """
    Append the diagnostic records to a JSONL artefact at `path` — NOT a database (takes no
    DbConn), NOT a table, NOT in §8's contract, NOT read by any consumer. Exists so the
    §7 audit can count and inspect rejected/unresolved notes.
    MUST NOT invent a symbol or a nearest match for any of these.
    Governs: §7 (quality bar); no fallback.
    """
    raise NotImplementedError


# =====================================================================================
# THE SPINE — pure transform. A reader can follow ONE report from source row to link
# rows by reading run_stage1 then extract, top to bottom, without jumping. Order here
# is the pipeline order. Determinism is imposed by sorting the output (HARD CONSTRAINT).
# =====================================================================================

def run_stage1(conn: DbConn, unparsed_path: str) -> None:
    """
    Top-level entry. Thin I/O wrapper: read at the edge, transform in the pure core,
    write at the edge. This is a plain batch pass over the ~28,000-report corpus.
    MUST NOT add chunking / resumption / checkpointing / streaming / parallelism /
    progress machinery — argue the case in review if one seems required.
    Governs: §8.
    """
    # reports       = read_sg_report_rows(conn)          # boundary  (Decision 1 a/b/c)
    # display_index = load_display_index(conn)           # boundary  (§5 display)
    # output        = extract(reports, display_index)    # PURE spine (below)
    # write_link_rows(conn, output.links)                # boundary  (the consumed table)
    # write_unparsed_notes(output.unparsed, unparsed_path)# boundary  (diagnostic JSONL, no DB)
    raise NotImplementedError


def extract(reports: Iterable[SourceReport], display_index: DisplayIndex) -> Stage1Output:
    """
    The pure spine. For each report, for each note element, in order:
      recognise -> if citations: (per citation) classify sense, tag role, extract pinpoint,
      canonicalise, fold to match_key, resolve display candidates -> assemble LinkRow.
      If the element had a mandate construction but yielded no citation, OR withheld a
      citation token for want of a governing organ (had_unresolvable_citation) -> one
      UnparsedNote, alongside any link rows the same element did yield. Otherwise ignore.
    MUST NOT read or write a database, and MUST NOT compute anything coverage-derived.
    MUST NOT re-test a note for a mandate construction — NoteRecognition already carries it.
    MUST produce a deterministic order (sort by report_recid, note index, citation span).
    Governs: §1 (direction), §4 (lossless), §8 (contract), HARD CONSTRAINT (determinism).
    """
    keyed_links: list[tuple[tuple[int, int, tuple[int, int]], LinkRow]] = []
    keyed_unparsed: list[tuple[tuple[int, int], UnparsedNote]] = []

    for report in reports:
        for note_index, note in enumerate(report.notes):
            recognition = recognise_citations(note)
            if recognition.citations:
                for citation in recognition.citations:
                    # Re-derive the number form from the citation's own prose (never
                    # from the note): prose_symbol always embeds exactly one token,
                    # by construction in recognise_citations.
                    token = CITATION_TOKEN_RE.search(citation.prose_symbol)
                    if token is None:
                        # Invariant violation, not an input condition — fail loudly.
                        raise ValueError(
                            f"recognised citation carries no number-form token: {citation!r}"
                        )
                    resolution_canonical = canonical(citation.organ_prefix + token.group())
                    key = match_key(resolution_canonical)
                    sense = classify_sense(citation, note)
                    row = LinkRow(
                        # Unresolved decision bites here: a dual symbol ("A/80/723 -
                        # S/2026/357") lands verbatim, one row per cited resolution —
                        # the straightforward reading. Do not split per organ or de-dup
                        # on it until the cardinality question is settled (§4/§8).
                        report_symbol=report.report_symbol,
                        report_recid=report.report_recid,
                        resolution_canonical=resolution_canonical,
                        resolution_match_key=key,
                        resolution_display_candidates=resolve_display(key, display_index),
                        role=tag_role(citation, note),
                        pinpoint=extract_pinpoint(citation),
                        sense=sense,
                        # §3: committee-established is the one lower-confidence sense.
                        # §7's other hold-for-review classes never reach a LinkRow —
                        # organ-ambiguous notes become UnparsedNotes upstream.
                        confidence="low" if sense == "committee_established" else "high",
                        source_note_text=note,
                    )
                    keyed_links.append(
                        ((report.report_recid, note_index, citation.note_span), row)
                    )
            if recognition.had_unresolvable_citation or (
                recognition.had_mandate_construction and not recognition.citations
            ):
                # A mixed element (some citations resolved, one withheld) emits its
                # link rows above AND this record — flagged, not annulled (§0.1).
                keyed_unparsed.append(
                    (
                        (report.report_recid, note_index),
                        UnparsedNote(
                            report_symbol=report.report_symbol,
                            report_recid=report.report_recid,
                            source_note_text=note,
                            reason=(
                                _UNRESOLVED_ORGAN_REASON
                                if recognition.had_unresolvable_citation
                                else _UNRESOLVED_NOTE_REASON
                            ),
                        ),
                    )
                )
            # A note with neither construction nor flag is not a mandate note —
            # ignored (§3 include rule).

    keyed_links.sort(key=lambda keyed: keyed[0])
    keyed_unparsed.sort(key=lambda keyed: keyed[0])
    return Stage1Output(
        links=tuple(row for _, row in keyed_links),
        unparsed=tuple(record for _, record in keyed_unparsed),
    )


def recognise_citations(note_element: str) -> NoteRecognition:
    """
    Scan one note element: does it carry a mandate construction (pursuant/prepared/
    submitted/requested/in response to/in pursuance of)? and if so, extract each resolution citation,
    resolving a bare number's organ from the governing organ EARLIER IN THE SAME ELEMENT
    (§3 bare-citation row — get this wrong and renewals are mis-prefixed). Returns the
    facts in a NoteRecognition so the caller need not re-test.
    MUST NOT infer an organ across note-element boundaries, and MUST NOT guess an organ
    when context is absent — emit no citation for that token, set
    had_unresolvable_citation, and let the caller record an UnparsedNote alongside any
    citations that did resolve (§0.1: capture completely).
    MUST NOT emit a citation for a non-resolution reference (article of a Convention/
    Protocol) — it has no resolution symbol; it is rejected (§3), still counted via the flag.
    Verb-agnostic, symbol-gated. Handles all PARSER_ORGANS + PRST.
    Governs: Decisions 2/3 / §3; reference_ §2 (grammar inventory).
    """
    if not MANDATE_CONSTRUCTION_RE.search(note_element):
        # Include rule (§3): an element with no mandate construction is not kept,
        # whatever symbols it happens to contain.
        return NoteRecognition(
            citations=(), had_mandate_construction=False, had_unresolvable_citation=False
        )

    # Organ mentions in element order (finditer is left-to-right — deterministic).
    organ_mentions = [
        (mention.start(), PARSER_ORGANS[mention.group().lower()])
        for mention in ORGAN_MENTION_RE.finditer(note_element)
    ]

    citations: list[RawCitation] = []
    had_unresolvable = False
    for cited_list in CITATION_LIST_RE.finditer(note_element):
        first_in_list = True
        for token in CITATION_TOKEN_RE.finditer(
            note_element, cited_list.start(), cited_list.end()
        ):
            organ_prefix = None
            for mention_start, prefix in organ_mentions:
                if mention_start < token.start():
                    organ_prefix = prefix  # nearest mention earlier in the element wins
                else:
                    break
            if organ_prefix is None:
                # A citation token with no governing organ anywhere before it cannot be
                # resolved deterministically (§3 bare-citation rule; §5.1), and guessing
                # is forbidden. The token is withheld and the element flagged, so the
                # caller records an auditable diagnostic record ALONGSIDE any citations
                # that do resolve — nothing guessed, nothing silently absorbed, nothing
                # needlessly discarded (§0.1: capture completely).
                # (Within one head's token list this is all-or-nothing — an organ
                # mention cannot sit inside the list span — but separate lists in one
                # element can genuinely split.)
                had_unresolvable = True
                first_in_list = False
                continue
            # The first citation in a list carries the head phrase (and any pinpoint
            # prefix) as it appeared; later members of the same list appeared as bare
            # tokens, and that is what their prose_symbol records.
            prose_symbol = (
                note_element[cited_list.start():token.end()]
                if first_in_list
                else token.group()
            )
            citations.append(
                RawCitation(
                    organ_prefix=organ_prefix,
                    prose_symbol=prose_symbol,
                    note_span=(token.start(), token.end()),
                )
            )
            first_in_list = False

    for prst in PRST_SYMBOL_RE.finditer(note_element):
        # PRST arrives symbol-form, so it is its own organ context: prose_symbol is the
        # full symbol and extract's prefix+token reassembly reproduces it byte-for-byte.
        citations.append(
            RawCitation(
                organ_prefix="S/PRST/",
                prose_symbol=prst.group(),
                note_span=(prst.start(), prst.end()),
            )
        )

    citations.sort(key=lambda citation: citation.note_span)  # note order, deterministic
    return NoteRecognition(
        citations=tuple(citations),
        had_mandate_construction=True,
        had_unresolvable_citation=had_unresolvable,
    )


def classify_sense(citation: RawCitation, note_element: str) -> Sense:
    """
    Assign the §3 mandate-instrument sense from the citation's phrasing/context. This is
    the display-eligibility decision (direct_request … committee_established; prst_note_decision).
    MUST NOT decide whether the row is *shown* — that WHERE clause is read-time (§0.1).
    MUST NOT return a sense for a non-resolution reference — those never reach here.
    Governs: Decision 2 / §3. Split from tag_role deliberately (RATIONALE): §3 and §4 change apart.
    """
    if citation.organ_prefix == "S/PRST/":
        # Unresolved decision bites here: this sense flows into a LinkRow whose
        # resolution_* columns then hold a non-resolution instrument (S/PRST/…).
        # The straightforward reading is implemented; do not re-type here.
        return "prst_note_decision"

    citation_start = citation.note_span[0]
    governing: tuple[int, int, Sense] | None = None  # (priority, cue start, sense)
    for cue, sense, priority in _SENSE_CUES:
        for found in cue.finditer(note_element):
            if found.start() >= citation_start:
                break
            if governing is None or (priority, found.start()) > governing[:2]:
                governing = (priority, found.start(), sense)
    if governing is None:
        # A kept citation with no sense cue before it is a state the §3 taxonomy does
        # not model (every taxonomy example leads with its phrasing). Never default a
        # sense — fail loudly with the evidence.
        raise ValueError(
            f"no sense cue precedes citation {citation.prose_symbol!r} "
            f"in note element: {note_element!r}"
        )
    return governing[2]


def tag_role(citation: RawCitation, note_element: str) -> Role:
    """
    Derive the role from phrasing (§4.2): "mandate contained in X … most recently Y" ->
    founding / most_recent; flat list -> co_equal; "established pursuant to" -> establishing;
    "also in response to" -> additional.
    MUST NOT collapse founding+renewal into one row — capture both, role-tagged (§4 lossless).
    Governs: Decision 4 / §4.2.
    """
    citation_start = citation.note_span[0]
    nearest: tuple[int, Role] | None = None  # (cue start, role)
    for cue, role in _ROLE_CUES:
        for found in cue.finditer(note_element):
            if found.start() >= citation_start:
                break
            if nearest is None or found.start() > nearest[0]:
                nearest = (found.start(), role)
    if nearest is None:
        # §4.2's own rule, not a fallback: a flat list — including a single direct
        # citation — is co_equal.
        return "co_equal"
    return nearest[1]


def extract_pinpoint(citation: RawCitation) -> str | None:
    """
    Pull a paragraph pinpoint ("para. 50 of resolution 2808") when present; None otherwise.
    A Stage-2 asset harvested now, displayed later (§5 granularity, §9 non-goal).
    MUST NOT drive attachment granularity in Stage 1 — display stays resolution-level (§5).
    Governs: §5 / §9.
    """
    found = PINPOINT_RE.search(citation.prose_symbol)
    if found is None:
        return None  # real absence — never substituted (§ no-fallback)
    return found.group()


def canonical(symbol_text: str) -> str:
    """
    Identity function (§5 / §6): upper(strip-all-whitespace). Reproduces
    digitallibrary.documents.symbol_normalized exactly (41,811 rows, zero
    counterexamples). Spec: upper(regexp_replace(s, '[[:space:]]', '', 'g')).
    MUST NOT apply the bracket fold — folding into identity destroys the symbol_normalized
    equality that is the rule's only proof (§6). ~6 lines; do not factor out a lib.
    Governs: §5 / §6.
    """
    return _WHITESPACE_RE.sub("", symbol_text).upper()


def match_key(canonical_symbol: str) -> str:
    """
    Join key (§5 / §6): canonical with BRACKET_FOLD_PATTERN applied — strip a trailing
    bracketed part. Applied to BOTH sides at join time and nowhere else.
    MUST NOT parse bracket contents (§2.1), MUST NOT be stored as identity, MUST NOT be
    displayed. On the citation side this is usually identical to canonical (prose has no brackets).
    Governs: §5 / §6 / reference_ §2, §3.
    """
    return BRACKET_FOLD_RE.sub(r"\1", canonical_symbol)


def resolve_display(citation_match_key: str, display_index: DisplayIndex) -> tuple[str, ...]:
    """
    Pure lookup of ALL page-key variants for the key: display_index.get(match_key, ()).
    Empty tuple when no registry variant exists (-> pending_coverage territory, but that
    CLASSIFICATION is not computed or stored here — it is read-time, §0.1).
    MUST NOT pick one variant — the paragraph-bearing preference is a read-time choice
    (§0.1). MUST NOT construct the URL string, MUST NOT touch the database.
    Governs: §5 / §6 / §0.1.
    """
    # () is the CONTRACT's meaning for "no registry row for any variant" (LinkRow
    # docstring) — a modelled state, not a default standing in for missing data.
    return display_index.get(citation_match_key, ())
