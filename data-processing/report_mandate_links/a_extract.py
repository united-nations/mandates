"""
PURPOSE
    Stage 1 extractor: SG report -> mandating-resolution links, extracted in the
    report->resolution direction (rules_ §1) for later inversion at display time.

    STAGE A (implemented here): the pure core — settled constants, types, the
    citation parser over the twelve symbol grammars, sense/role classification,
    pinpoint capture, the three symbol functions, and the pure spine `extract`.
    No I/O anywhere in it; everything is testable from fixtures alone.

    STAGE B (implemented here): the I/O edges — `read_sg_report_rows`,
    `load_display_index`, `write_link_rows`, `write_unparsed_notes`,
    `run_stage1` — reading `digitallibrary.documents` and
    `public.unified_documents`, writing `mandates.sg_report_to_mandate_links`
    plus one run-record row (`mandates.sg_report_to_mandate_link_runs`) in a
    single transaction, and appending diagnostics to a JSONL sidecar.
    Connection acquisition lives one level further out, in `__main__.py`.

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
    Pure core and I/O edges implemented.
"""

from __future__ import annotations

import json
import re
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, Iterable, Literal

from psycopg2.extras import execute_values


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
#   6 -> _SPECIAL_SESSION        7, 8 -> _LETTER_PART (8 folds via canonical)
#   9, 10 -> BRACKET_FOLD_RE     11, 12 -> _LETTER_RANGE
# Prose forms observed beyond the twelve, added from live sampling:
#   "645 G (XXIII)" (number + letter section + roman session) -> _LETTER_ROMAN_SESSION
#   "S-26/2" (non-emergency special session) -> _SPECIAL_SESSION (shared with "ES-10/1")
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

# Special-session forms: emergency "ES-10/1" (A/RES/ES-10/1) and non-emergency "S-26/2"
# (A/RES/S-26/2). Both are a session tag then session/number; the optional leading E is
# the only difference between the emergency and ordinary special-session tags. Without the
# S- form a note citing "resolution S-26/2" loses that citation, since a bare "S-" tag
# matches no other token shape.
_SPECIAL_SESSION = r"E?S-\d+/\d+"

# Grammars 7 / 8 — letter part, bare A/RES/39/213A and spaced A/RES/72/266 A; one prose
# shape "resolution 72/266 A". Grammar 8 exists only registry-side: canonical's
# whitespace strip folds spaced -> bare, so no separate prose pattern is needed.
# The lookahead stops "72/266 A" matching the "A" of a following word ("... 79/140 And").
_LETTER_PART = _SESSION_NUMBER + r"\s?[A-Z](?![A-Za-z\-–])"

# Grammar 11 — letter range, bare: A/RES/31/141A-B; prose "resolution 31/141 A-B".
# Grammar 12 — letter range, en dash: A/RES/79/93 A–B (2 rows). Neither folds — a range
# is not a citation of either part; the en-dash rows fall to pending_coverage by design.
_LETTER_RANGE = _SESSION_NUMBER + r"\s?[A-Z][\-–][A-Z](?![A-Za-z])"

# Combined letter-part and roman-numeral session, prose "645 G (XXIII)": a resolution
# number, a single-letter section, then a roman-numeral session in parentheses (an ECOSOC
# form). The number on its own matches no other token — it has no slash and no immediately
# following paren — so without this the whole citation is dropped. A canonicalised form
# with no matching registry page key falls to the coverage backlog like any other symbol.
_LETTER_ROMAN_SESSION = r"\d+\s?[A-Z]\s?\([IVXLCDM]+\)"

# One token = one cited symbol's number form. Alternation is ordered so composite forms
# are tried before the prefixes they contain: the special-session tag first, then the
# number+letter+roman form and the ranges/letter-parts (which need a slash and so never
# collide with it), then roman session, number(year) and the bare session/number last.
# Ordering is a matching-correctness concern only; OUTPUT order never depends on it
# (extract sorts by span — HARD CONSTRAINT, determinism).
_CITATION_TOKEN = (
    "(?:"
    + "|".join([_SPECIAL_SESSION, _LETTER_ROMAN_SESSION, _LETTER_RANGE, _LETTER_PART,
                _ROMAN_SESSION, _NUMBER_YEAR, _SESSION_NUMBER])
    + ")"
)
CITATION_TOKEN_RE = re.compile(_CITATION_TOKEN)

# Pinpoint prefix — "para. 50 of resolution 2808" (rules_ §1/§5). Captured into the
# first citation's prose_symbol so extract_pinpoint can read it back; narrowest
# observed shape only (no article/section variants — none observed).
_PINPOINT_PREFIX = r"(?:para(?:graph|\.)\s+\d+\s+of\s+)?"

# Interpolations UN drafting inserts between list members. Each is an observed live
# shape (S-010 re-cut of the S-009 census records); before it was consumed the list
# terminated at the interpolated member and every later member was silently dropped —
# no citation AND no flag, the only silent loss observed anywhere in the pipeline.
# Each is optional and, because it only appears inside _LIST_SEP (which still requires
# a real separator and a following token), a trailing interpolation at the end of a
# lone citation is left untouched. Narrowest observed shapes only — arbitrary text
# between members is never admitted (it would over-recognise).
#   dated, postfix        "resolution 1745 (LIV) of 16 May 1973, 1989/64 and ..."
_DATE_INTERP = r"(?:\s+of\s+\d{1,2}\s+\w+\.?\s+\d{4})?"
#   pinpoint, postfix     "resolutions 69/205, paragraph 4, and 68/199" (A/70/277)
_PINPOINT_POSTFIX = r"(?:\s*,\s*para(?:graph|\.)\s+\d+)?"
#   session appositive, postfix — the children-follow-up annual series:
#                         "resolutions S-27/2 of the 27th special session in 2002, 58/282 and 61/272"
_SESSION_APPOSITIVE = r"(?:\s+of\s+the\s+\d+(?:st|nd|rd|th)\s+special\s+session\s+in\s+\d{4})?"

# A "resolution(s)" head followed by one or more tokens: the symbol gate of the include
# rule. "resolutions X, Y and Z" is one head governing a token list. A member may carry
# a postfix interpolation (date, pinpoint, session appositive) before the separator; the
# separator itself is a comma or "and"; the next member may carry a prefix pinpoint —
# "resolutions 2139 (2014), para. 10 of 2165 (2014)" (the Syria monthly series). Since
# the whole "<interpolation?><separator><pinpoint?><token>" group must match to extend
# the list, an interpolated member with no following resolution token (e.g. "... and
# Council decision 2005/247") ends the list rather than reaching across into unrelated
# text. A later member's prefix pinpoint is consumed but not captured — later members'
# prose_symbol is the bare token, so the pinpoint asset is lost there (a known,
# pre-existing degradation, not introduced by the separator).
_LIST_SEP = (
    _DATE_INTERP
    + _PINPOINT_POSTFIX
    + _SESSION_APPOSITIVE
    + r"(?:\s*,\s*(?:and\s+)?|\s+and\s+)"
    + _PINPOINT_PREFIX
)
CITATION_LIST_RE = re.compile(
    _PINPOINT_PREFIX
    + r"\b(?i:resolutions?)\s+"
    + _CITATION_TOKEN
    + "(?:" + _LIST_SEP + _CITATION_TOKEN + ")*"
)

# The "resolution(s)" head word inside a citation list. Organ provenance is scored by the
# word gap from the governing organ mention's end to this head, so the head's offset must
# be locatable. A list match may open with a pinpoint prefix ("para. 50 of resolution
# 2808"), so the head is not at the list's start — it is the first "resolution(s)" token
# within the list span.
_RESOLUTION_HEAD_RE = re.compile(r"\bresolutions?\b", re.IGNORECASE)

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
# The establishment cue — "established {pursuant to | in pursuance of | under}",
# body-agnostic, shared by the sense table (body_established) and the role table
# (establishing). Observation-gated widening (S-009 census): the earlier form required
# the literal word "committee", so a Group, Panel or Commission established pursuant to
# a resolution fell through to the generic cue, and two of the three observed
# connectives were missing from both tables. Across 7,172 occurrences the construction
# never once occurred in a non-establishment meaning and every observed instance is a
# subsidiary body, so the body noun did no work — and an enumerated body-noun list
# (Committee|Group|Panel|Commission) would size against bodies nobody has seen.
# "under" is admitted only anchored on "established", never bare; the neighbouring
# "authorized under" form (one observed occurrence) is deliberately not decided here.
_ESTABLISHED_RE = re.compile(
    r"\bestablished\s+(?:pursuant\s+to|in\s+pursuance\s+of|under)\b", re.IGNORECASE
)
_ACTIVITIES_CARRIED_OUT_RE = re.compile(r"\bactivities\s+carried\s+out\b", re.IGNORECASE)
_ALSO_IN_RESPONSE_RE = re.compile(r"\balso\s+in\s+response\s+to\b", re.IGNORECASE)
_MANDATE_CONTAINED_RE = re.compile(r"\bmandate\s+contained\s+in\b", re.IGNORECASE)
_MOST_RECENTLY_RE = re.compile(r"\bmost\s+recently\b", re.IGNORECASE)

# Sense cues (§3 taxonomy), highest priority first. Priority — not nearest-cue —
# decides among cues preceding a citation, because specific phrasings embed generic
# ones: in "activities carried out … pursuant to resolution 186 (1964)" the generic
# "pursuant to" sits NEARER the citation than the cue that actually names its sense.
_SENSE_CUES: tuple[tuple[re.Pattern[str], "Sense", int], ...] = (
    (_ESTABLISHED_RE, "body_established", 5),  # "Committee established pursuant to resolution 748 (1992)"; cue and stored value are both body-agnostic
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
    (_ESTABLISHED_RE, "establishing"),
    (_ALSO_IN_RESPONSE_RE, "additional"),
)

# Annex-title detector (observation-gated): a note element opening with "Annex(es)" or
# "Appendix", quoted or unquoted. Every observed such element is annex-description
# content throughout, so a match classifies the WHOLE element (see CitationPosition).
# Deliberately narrow: these are the observed note-initial forms and nothing else —
# page-range trailers added zero notes and are excluded; unobserved forms are added
# when observed, not before.
_ANNEX_TITLE_RE = re.compile(r'^["“]?\s*(?:Annex(?:es)?|Appendix)\b')

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

# UnparsedNote.reason distinguishes the three refusal causes (no symbol at all /
# organ-less citation token / un-cued citation occurrence); the verbatim note text is
# the primary evidence in every case.
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
# Used when >=1 kept citation occurrence had no sense cue preceding it in the element:
# the occurrence is refused a sense and skipped — never defaulted, never given a
# placeholder. Any cued citations in the same element were still extracted as link
# rows alongside this record — it flags the element, it does not annul it.
_UNCUED_CITATION_REASON = (
    "citation occurrence with no sense cue preceding it in the note element "
    "(sense never defaulted); any cued citations in this element were extracted "
    "as link rows"
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
    "direct_request",        # "Submitted pursuant to SC resolution 2779 (2025)" — display
    "founding_renewal",      # "mandate contained in 350 (1974) … most recently 2811 (2025)" — capture both
    "additional_joint",      # "also in response to GA resolution 79/140 and ECOSOC 2024/8" — capture all
    "activities_carried_out",# UNFICYP "activities carried out … pursuant to resolution 186 (1964)" — display
    "body_established",      # "Committee established pursuant to 748 (1992)" — hold for review at read time
    "prst_note_decision",    # S/PRST/…, note/decision — real instrument, diverted (not a resolution)
]

# Role of a cited resolution within the report's mandate history (Decision 4 / §4.2).
Role = Literal["founding", "most_recent", "co_equal", "establishing", "additional"]

# Where in the note element the citation sits: report body, or annex-description
# content. Note-level by observation — every observed annex-title note is annex content
# throughout (S-009 census: 40 notes / 120 occurrences) — so extract computes it once
# per element and stamps every row with it. Two values only: a third position is added
# when observed, not before.
CitationPosition = Literal["body", "annex_title"]

# How the organ that prefixes a KEPT citation was determined. A provenance LABEL, not a
# risk score: it is recorded on the link row and read by audits of that table, and it does
# NOT gate display — display is filtered on `citation_sense` alone. It replaces an earlier
# `confidence` field that was a pure function of `citation_sense`, and so stored nothing
# `citation_sense` did not already carry.
#   stated    — an organ mention immediately precedes the citation head (gap = 0 words)
#   inherited — resolved from the nearest preceding organ mention in the SAME element,
#               across a non-zero word gap (no distance cap); AND every later member of a
#               citation list, which appeared as a bare token and so cannot itself carry a
#               "stated" claim
#   intrinsic — the organ is carried by the symbol's own grammar, needing no mention
#               (PRST: "S/PRST/2024/7" names its organ in the symbol)
OrganProvenance = Literal["stated", "inherited", "intrinsic"]


@dataclass(frozen=True)
class RawCitation:
    """
    A recognised, organ-resolved citation before canonicalisation — the value that
    crosses the boundary out of recognise_citations into classification/canonicalisation.
    Carries enough to canonicalise and to classify without re-reading the note.
    """
    organ_prefix: str            # resolved from PARSER_ORGANS or same-element context (§3)
    organ_provenance: "OrganProvenance"  # how organ_prefix was determined — set here at recognition, the only place the mention/head geometry exists
    prose_symbol: str            # the citation as it appeared, organ-resolved (e.g. "resolution 2811 (2025)")
    note_span: tuple[int, int]   # position within the note element — deterministic ordering AND part of the stored row's identity key


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
    The output contract — one row per cited-resolution OCCURRENCE. The
    one-row-per-(report, resolution) shape is the DISPLAY grain, derived at read time;
    nothing dedups here, so a resolution cited twice in one note yields two rows.
    Lossless: no row is ever dropped. Frozen: a produced row is a value, not mutable
    state — supports determinism (same input, same rows, same order).

    Identity: the row's stored key is uuid5 over
    (report_recid, note_index, resolution_canonical, note_span[0]), computed at the write
    edge from the four fields the row carries — so a row's identity is recomputable from
    the row itself, matching the schema's paragraphs.id = uuid5(URL, "<symbol>:<pos>")
    precedent (sql/schema/mandates.sql). note_index and note_span exist on the row for
    exactly this reason; the pure core does not itself mint the uuid.

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
    report_recid: int                             # digitallibrary.documents.recid — part of the row identity key
    note_index: int                               # 0-based element index within report.notes — part of the row identity key
    resolution_canonical: str                     # identity (§5) — equals symbol_normalized; part of the row identity key
    resolution_match_key: str                     # join key (§5) — indexed; fold applied
    resolution_display_candidates: tuple[str, ...]# page keys (§5) — lookup result; () when no registry row
    resolution_role: Role                         # §4.2
    resolution_pinpoint: str | None               # e.g. "para. 50" — Stage 2 asset, §5/§9
    citation_sense: Sense                         # §3 taxonomy
    citation_position: CitationPosition           # body vs annex-title content; note-level fact, stored per occurrence
    organ_provenance: OrganProvenance             # how the organ was determined; audit label, not a display gate
    note_span: tuple[int, int]                    # citation token offsets in the note element; note_span[0] is part of the row identity key
    source_note_text: str                         # the verbatim note element it came from (§4.1)


@dataclass(frozen=True)
class UnparsedNote:
    """
    A DIAGNOSTIC record, not part of any consumed interface. It is a note element in
    which at least one citation could not be resolved DETERMINISTICALLY — the
    element carried a mandate construction but no resolvable symbol at all (worked
    example: "pursuant to the relevant resolutions of the General Assembly" — zero link
    rows), or a citation token had no governing organ and was withheld, or a resolved
    citation occurrence had no sense cue preceding it and was refused a sense. In the
    latter two cases any citations that DID classify have ordinary link rows alongside this record:
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
# "I/O at the edges"). SQL text lives here as named constants, like the regexes above:
# compiled once, named, never inline.
# =====================================================================================

# Selection clause (1) — the sole report-identity test: MARC 989$c, recovered from
# marcxml by XPath (the field has no mirror column; doc_class_code is a cross-check
# only, never the selector). No other predicate belongs in this SQL: clauses (2)-(4)
# run in Python (see _partition_selection) so each one's removals are counted exactly
# in a single corpus scan, and so the corrigendum/revision test uses the SAME
# canonical() that mints stored resolution identities — one fold, one identity, no
# SQL twin to drift from it. ORDER BY recid: deterministic read order.
_SELECT_SG_REPORTS_SQL = """
SELECT recid, document_symbol, notes, deleted_at
FROM digitallibrary.documents
WHERE %s = ANY (
    (xpath(
        '//*[local-name()="datafield" and @tag="989"]/*[local-name()="subfield" and @code="c"]/text()',
        marcxml::xml
    ))::text[]
)
ORDER BY recid
"""

# The registry side of §5's display lookup. Every page-key variant, byte-exact; the
# fold down to match_key happens in Python via the same match_key()/canonical() pair
# used on the citation side.
_SELECT_PAGE_SYMBOLS_SQL = """
SELECT ppb_full_document_symbol
FROM public.unified_documents
"""

# Selection clause (3) — corrigendum/revision markers, tested against the canonical
# fold of document_symbol. The fold matters: spaced markers ("A/... / Corr.1") exist
# live (2 corpus-wide, measured 30 Jul 2026) and a raw-byte test misses them.
_CORR_REV_MARKERS: tuple[str, str] = ("/CORR.", "/REV.")

# Run-record residual counter, NOT an exclusion: parsed-set documents whose folded
# symbol carries a corrigendum/revision marker in a form clause (3) deliberately does
# not catch — spelled-out CORRIGENDUM, or bare no-period /CORR / /REV. Counted so the
# residual is a known number rather than an unknown gap. Addenda are NOT counted:
# clause (3) keeps addenda in scope by design, so a spelled-out addendum is ordinary
# retention, not a missed marker.
# (?![A-Z.]) keeps bare /REV out of /REV. (clause-3 territory) and /REVIEW-like runs.
_WIDER_MARKER_RE = re.compile(r"CORRIGENDUM|/(?:CORR|REV)(?![A-Z.])")

_DELETE_REPORT_SCOPE_SQL = """
DELETE FROM mandates.sg_report_to_mandate_links
WHERE report_recid = ANY(%s)
"""

_INSERT_LINK_ROWS_SQL = """
INSERT INTO mandates.sg_report_to_mandate_links
    (id, report_recid, report_symbol, note_index, note_span_start, note_span_end,
     resolution_canonical, resolution_match_key, resolution_display_candidates,
     resolution_role, citation_sense, citation_position, organ_provenance,
     resolution_pinpoint, source_note_text)
VALUES %s
"""

_INSERT_RUN_RECORD_SQL = """
INSERT INTO mandates.sg_report_to_mandate_link_runs
    (started_at, finished_at, selected_by_marc, removed_null_symbol,
     removed_corr_rev, removed_deleted, reports_parsed, wider_marker_retained,
     link_rows_written, notes_unparsed)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
"""


@dataclass(frozen=True)
class SelectionCounts:
    """
    Per-clause selection accounting (§2). The run record stores each clause's
    removals separately because a clause that silently excludes zero — or everything —
    is exactly the state that must stay visible: once link rows exist, nobody
    re-derives the selection. selected_by_marc is also the drift tripwire on 989$c
    (expected magnitude ~28,201, measured 30 Jul 2026).
    Invariant, enforced by a CHECK on the run table: selected_by_marc =
    removed_null_symbol + removed_corr_rev + removed_deleted + len(reports).
    """
    selected_by_marc: int        # clause (1): documents carrying 989$c = SG_REPORT_MARC_989C
    removed_null_symbol: int     # clause (2): document_symbol IS NULL (17,383 corpus rows)
    removed_corr_rev: int        # clause (3): CORR./REV. marker in the folded symbol
    removed_deleted: int         # clause (4): deleted_at set (measured zero; recorded so non-zero shows)
    wider_marker_retained: int   # residual counter over the parsed set — see _WIDER_MARKER_RE


def _partition_selection(
    fetched: Iterable[tuple[int, str | None, list[str], Any]],
) -> tuple[tuple[SourceReport, ...], SelectionCounts]:
    """
    Pure partition of clause-(1) rows into the parsed set plus per-clause removal
    counts. Clauses apply in the settled order (2) null symbol, (3) corr/rev on the
    canonical fold, (4) deleted_at — each document is removed by exactly the first
    clause it fails, so the counts are disjoint and reconcile to selected_by_marc.
    notes arrives as a real text[] (measured: NULL on zero SG reports); a NULL here
    is an unmodelled source state and crashes on tuple(None) by design.
    """
    reports: list[SourceReport] = []
    removed_null_symbol = 0
    removed_corr_rev = 0
    removed_deleted = 0
    wider_marker_retained = 0
    selected_by_marc = 0
    for recid, document_symbol, notes, deleted_at in fetched:
        selected_by_marc += 1
        if document_symbol is None:
            removed_null_symbol += 1
            continue
        folded = canonical(document_symbol)
        if any(marker in folded for marker in _CORR_REV_MARKERS):
            removed_corr_rev += 1
            continue
        if deleted_at is not None:
            removed_deleted += 1
            continue
        if _WIDER_MARKER_RE.search(folded):
            wider_marker_retained += 1
        reports.append(
            SourceReport(
                report_recid=recid,
                report_symbol=document_symbol,
                notes=tuple(notes),
            )
        )
    return tuple(reports), SelectionCounts(
        selected_by_marc=selected_by_marc,
        removed_null_symbol=removed_null_symbol,
        removed_corr_rev=removed_corr_rev,
        removed_deleted=removed_deleted,
        wider_marker_retained=wider_marker_retained,
    )


def _read_selection(conn: DbConn) -> tuple[tuple[SourceReport, ...], SelectionCounts]:
    """Fetch clause (1) from the database and partition. The counts exist only here —
    read_sg_report_rows discards them for callers that need the reports alone."""
    with conn.cursor() as cur:
        cur.execute(_SELECT_SG_REPORTS_SQL, (SG_REPORT_MARC_989C,))
        fetched = cur.fetchall()
    return _partition_selection(fetched)


def read_sg_report_rows(conn: DbConn) -> tuple[SourceReport, ...]:
    """
    Read the in-scope SG reports. The settled selection (§2), in full:
      (1) MARC 989$c = SG_REPORT_MARC_989C, via XPath over marcxml — the SOLE
          report-identity test. resource_subtype is not consulted: measured 30 Jul
          2026 it disagrees with 989$c on 19 of 28,201 documents, and all 19 read
          individually are real SG reports (the weaker field is wrong).
      (2) document_symbol IS NOT NULL — stated explicitly rather than left to
          three-valued logic.
      (3) not a corrigendum/revision: CORR./REV. tested against the canonical fold
          of document_symbol, not the raw bytes.
      (4) deleted_at IS NULL — soft deletion is a stated contract of the source
          table; currently removes zero, recorded each run so a non-zero shows.
    There is NO resource_subtype filter, NO report-side symbol-prefix filter (organ
    scope is enforced entirely on the resolution side), NO has-a-citing-note
    predicate (a report with no citing note emits no rows by construction — never
    approximate it in SQL), NO date bound (the survey view's 2023-to-present
    restriction is that view's own scope), and NO un_body filter (A/HRC sits inside
    un_body = 'General Assembly').
    Governs: §2.
    """
    return _read_selection(conn)[0]


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
    with conn.cursor() as cur:
        cur.execute(_SELECT_PAGE_SYMBOLS_SQL)
        fetched = cur.fetchall()
    return _build_display_index(symbol for (symbol,) in fetched)


def _build_display_index(page_symbols: Iterable[str]) -> DisplayIndex:
    """Pure grouping: byte-exact page keys under match_key(canonical(...)) — the same
    two functions the citation side folds through, so the two sides cannot drift.
    Variants are sorted within each key: SQL fetch order is not deterministic, and
    determinism of every produced row is a HARD CONSTRAINT. A NULL page symbol is an
    unmodelled registry state (measured: zero of 43,872) and crashes in canonical()."""
    variants: dict[str, list[str]] = {}
    for symbol in page_symbols:
        variants.setdefault(match_key(canonical(symbol)), []).append(symbol)
    return {key: tuple(sorted(group)) for key, group in variants.items()}


def _link_row_id(row: LinkRow) -> str:
    """The row's stored uuid5 identity, recomputable from the row itself — same
    namespace and colon-join as paragraphs.id (uuid5(NAMESPACE_URL, "<symbol>:<pos>"),
    sql/schema/mandates.sql). Components are colon-safe: three integers, and
    resolution_canonical's alphabet (organ prefixes + number-form grammars, folded by
    canonical()) admits no colon."""
    name = (
        f"{row.report_recid}:{row.note_index}:"
        f"{row.resolution_canonical}:{row.note_span[0]}"
    )
    return str(uuid.uuid5(uuid.NAMESPACE_URL, name))


def write_link_rows(conn: DbConn, rows: Iterable[LinkRow]) -> None:
    """
    Materialise the lossless link table (§8 — request-time note parsing is too slow for a
    public page). MUST NOT write any coverage-derived field: no pending_coverage, no
    completeness, no displayable count (§0.1 — those are read-time).
    MUST NOT drop any row (§4 lossless). MUST NOT dedup — the occurrence is the stored
    grain; the one-per-(report, resolution) grain is derived at read time.
    Inserts in the order given — extract's output is span-sorted (HARD CONSTRAINT),
    and this function preserves it. Mints the uuid5 identity here at the write edge
    (_link_row_id); the pure core never touches it. Plain INSERT, no ON CONFLICT:
    run_stage1's scope-delete has already cleared every recid this run re-emits, so a
    key collision is an invariant violation and must crash, not be absorbed.
    display_candidates are sorted at write — byte-stable re-runs — and an empty tuple
    inserts as an explicit empty array (a modelled state, never NULL; the column is
    NOT NULL by schema).
    Transaction is owned by the caller: no commit here.
    """
    values = [
        (
            _link_row_id(row),
            row.report_recid,
            row.report_symbol,
            row.note_index,
            row.note_span[0],
            row.note_span[1],
            row.resolution_canonical,
            row.resolution_match_key,
            sorted(row.resolution_display_candidates),
            row.resolution_role,
            row.citation_sense,
            row.citation_position,
            row.organ_provenance,
            row.resolution_pinpoint,
            row.source_note_text,
        )
        for row in rows
    ]
    with conn.cursor() as cur:
        execute_values(cur, _INSERT_LINK_ROWS_SQL, values, page_size=1000)


def write_unparsed_notes(records: Iterable[UnparsedNote], path: str) -> None:
    """
    Append the diagnostic records to a JSONL artefact at `path` — NOT a database (takes no
    DbConn), NOT a table, NOT in §8's contract, NOT read by any consumer. Exists so the
    §7 audit can count and inspect rejected/unresolved notes.
    MUST NOT invent a symbol or a nearest match for any of these.
    Governs: §7 (quality bar); no fallback.
    One JSON object per line, keys exactly the UnparsedNote fields, sorted; LF line
    endings; UTF-8 unescaped. The parent directory must already exist — a bad path
    is a caller error and crashes here.
    """
    with open(path, "a", encoding="utf-8", newline="\n") as sink:
        for record in records:
            sink.write(json.dumps(asdict(record), ensure_ascii=False, sort_keys=True))
            sink.write("\n")


# =====================================================================================
# THE SPINE — pure transform. A reader can follow ONE report from source row to link
# rows by reading run_stage1 then extract, top to bottom, without jumping. Order here
# is the pipeline order. Determinism is imposed by sorting the output (HARD CONSTRAINT).
# =====================================================================================

def _delete_report_scope(conn: DbConn, report_recids: Iterable[int]) -> None:
    """
    Scope-delete: remove every stored row for the reports selected THIS run, before
    their current rows are inserted. This is correct single-owner write semantics,
    not a fallback — the extractor is the table's only writer, and a source-text
    offset change moves a row's key, so delete-then-insert is what converges the
    table to the current source. The scope is the full parsed set, including reports
    that now emit zero rows: a citation removed from a note must converge to absence.
    Deliberately NOT swept: rows for reports the predicate no longer selects — they
    strand until re-selected, the settled trade-off of scoping the delete to the
    selection.
    """
    with conn.cursor() as cur:
        cur.execute(_DELETE_REPORT_SCOPE_SQL, (list(report_recids),))


def _write_run_record(
    conn: DbConn,
    started_at: datetime,
    finished_at: datetime,
    counts: SelectionCounts,
    reports_parsed: int,
    link_rows_written: int,
    notes_unparsed: int,
) -> None:
    """One row per run, inserted in the SAME transaction as the run's delete+insert
    so the recorded counts can never disagree with the table state they describe.
    The table's CHECK re-asserts the partition invariant at write time."""
    with conn.cursor() as cur:
        cur.execute(
            _INSERT_RUN_RECORD_SQL,
            (
                started_at,
                finished_at,
                counts.selected_by_marc,
                counts.removed_null_symbol,
                counts.removed_corr_rev,
                counts.removed_deleted,
                reports_parsed,
                counts.wider_marker_retained,
                link_rows_written,
                notes_unparsed,
            ),
        )


def run_stage1(conn: DbConn, unparsed_path: str) -> None:
    """
    Top-level entry. Thin I/O wrapper: read at the edge, transform in the pure core,
    write at the edge. This is a plain batch pass over the ~28,000-report corpus.
    MUST NOT add chunking / resumption / checkpointing / streaming / parallelism /
    progress machinery — argue the case in review if one seems required.
    All database writes — scope-delete, link rows, run record — happen in ONE
    transaction, committed here: a crash anywhere leaves the table exactly as the
    previous run left it, never part-swept or part-written. The JSONL sidecar is
    written after the commit, so its records always describe a run that landed.
    Governs: §2 (selection) / §8.
    """
    started_at = datetime.now(timezone.utc)
    reports, counts = _read_selection(conn)                # boundary  (§2 selection + accounting)
    display_index = load_display_index(conn)               # boundary  (§5 display)
    output = extract(reports, display_index)               # PURE spine (below)
    _delete_report_scope(conn, (r.report_recid for r in reports))
    write_link_rows(conn, output.links)                    # boundary  (the consumed table)
    _write_run_record(
        conn,
        started_at=started_at,
        finished_at=datetime.now(timezone.utc),
        counts=counts,
        reports_parsed=len(reports),
        link_rows_written=len(output.links),
        notes_unparsed=len(output.unparsed),
    )
    conn.commit()
    write_unparsed_notes(output.unparsed, unparsed_path)   # boundary  (diagnostic JSONL, no DB)


def extract(reports: Iterable[SourceReport], display_index: DisplayIndex) -> Stage1Output:
    """
    The pure spine. For each report, for each note element, in order:
      recognise -> classify position (once per element) -> if citations: (per citation)
      classify sense — an un-cued occurrence is refused and skipped, never defaulted —
      tag role, extract pinpoint, canonicalise, fold to match_key, resolve display
      candidates -> assemble LinkRow.
      If the element had a mandate construction but yielded no citation, OR withheld a
      citation token for want of a governing organ (had_unresolvable_citation), OR
      refused an un-cued occurrence -> one UnparsedNote, alongside any link rows the
      same element did yield. An element carrying BOTH an organ-withheld token and an
      un-cued occurrence raises: measured absent in the corpus, not designed for.
      Otherwise ignore.
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
            # Note-level by observation (see classify_position): computed once per
            # element, stamped on every row it yields.
            citation_position = classify_position(note)
            uncued_refused = False
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
                    try:
                        sense = classify_sense(citation, note)
                    except UncuedCitationError:
                        # Refused: skipped with the diagnostic record below — no row,
                        # no default, no placeholder sense.
                        uncued_refused = True
                        continue
                    row = LinkRow(
                        # Unresolved decision bites here: a dual symbol ("A/80/723 -
                        # S/2026/357") lands verbatim, one row per cited resolution —
                        # the straightforward reading. Do not split per organ or de-dup
                        # on it until the cardinality question is settled (§4/§8).
                        report_symbol=report.report_symbol,
                        report_recid=report.report_recid,
                        note_index=note_index,
                        resolution_canonical=resolution_canonical,
                        resolution_match_key=key,
                        resolution_display_candidates=resolve_display(key, display_index),
                        resolution_role=tag_role(citation, note),
                        resolution_pinpoint=extract_pinpoint(citation),
                        citation_sense=sense,
                        citation_position=citation_position,
                        # Provenance is computed at recognition (the only place the
                        # mention/head geometry exists) and passed straight through — it is
                        # an audit label, never a display gate.
                        organ_provenance=citation.organ_provenance,
                        note_span=citation.note_span,
                        source_note_text=note,
                    )
                    keyed_links.append(
                        ((report.report_recid, note_index, citation.note_span), row)
                    )
            # Refusal-kind coexistence, settled by measurement. At OCCURRENCE grain the
            # two refusals are mutually exclusive by construction: recognise_citations
            # withholds an organ-less token BEFORE any RawCitation exists, and this loop
            # iterates resolved citations only, so classify_sense never sees a withheld
            # occurrence — no check needed. At NOTE grain nothing prevents one element
            # carrying both a withheld token and an un-cued occurrence; measured absent
            # across the corpus (S-009 census evidence), so the unobserved state raises
            # rather than being designed for. The check sits here, after the citation
            # loop, because only here are both refusal kinds known for the element.
            if uncued_refused and recognition.had_unresolvable_citation:
                raise ValueError(
                    f"note element carries both an organ-withheld citation token and "
                    f"an un-cued citation occurrence — an unobserved state the refusal "
                    f"record does not model (recid {report.report_recid}, "
                    f"note {note_index}): {note!r}"
                )
            if uncued_refused:
                keyed_unparsed.append(
                    (
                        (report.report_recid, note_index),
                        UnparsedNote(
                            report_symbol=report.report_symbol,
                            report_recid=report.report_recid,
                            source_note_text=note,
                            reason=_UNCUED_CITATION_REASON,
                        ),
                    )
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

    # Organ mentions in element order (finditer is left-to-right — deterministic). The
    # mention END is retained too: the "stated" provenance gap is measured from the mention
    # end to the citation head, so the start offset alone is insufficient.
    organ_mentions = [
        (mention.start(), mention.end(), PARSER_ORGANS[mention.group().lower()])
        for mention in ORGAN_MENTION_RE.finditer(note_element)
    ]

    citations: list[RawCitation] = []
    had_unresolvable = False
    for cited_list in CITATION_LIST_RE.finditer(note_element):
        # The head is the "resolution(s)" word the list opens on (after any pinpoint
        # prefix). The list grammar requires it, so absence is an invariant violation.
        head = _RESOLUTION_HEAD_RE.search(
            note_element, cited_list.start(), cited_list.end()
        )
        if head is None:
            raise ValueError(
                f"citation list with no resolution head: {note_element[cited_list.start():cited_list.end()]!r}"
            )
        first_in_list = True
        for token in CITATION_TOKEN_RE.finditer(
            note_element, cited_list.start(), cited_list.end()
        ):
            organ_prefix = None
            governing_end = None
            for mention_start, mention_end, prefix in organ_mentions:
                if mention_start < token.start():
                    organ_prefix = prefix  # nearest mention earlier in the element wins
                    governing_end = mention_end
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
            # Organ provenance. Only the first list member can be "stated": it is the one
            # written next to the head. The gap is the count of whitespace-separated words
            # between the governing mention's end and the head start (str.split() counts
            # \S+ runs). A later member appeared as a bare token in the list and is never
            # written next to an organ, so it is always inherited.
            if first_in_list:
                gap_words = len(note_element[governing_end:head.start()].split())
                organ_provenance = "stated" if gap_words == 0 else "inherited"
            else:
                organ_provenance = "inherited"
            citations.append(
                RawCitation(
                    organ_prefix=organ_prefix,
                    organ_provenance=organ_provenance,
                    prose_symbol=prose_symbol,
                    note_span=(token.start(), token.end()),
                )
            )
            first_in_list = False

    for prst in PRST_SYMBOL_RE.finditer(note_element):
        # PRST arrives symbol-form, so it is its own organ context: prose_symbol is the
        # full symbol and extract's prefix+token reassembly reproduces it byte-for-byte.
        # Its organ is carried by the grammar itself, needing no mention: intrinsic.
        citations.append(
            RawCitation(
                organ_prefix="S/PRST/",
                organ_provenance="intrinsic",
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


class UncuedCitationError(ValueError):
    """
    Raised by classify_sense for a kept citation with no sense cue preceding it in its
    note element. Part of the function's contract: a sense is never defaulted, and the
    refusal is typed so extract can record it without message inspection. The message
    prefix ("no sense cue precedes citation") is itself part of the contract, pinned by
    test — do not reword it.
    """


def classify_sense(citation: RawCitation, note_element: str) -> Sense:
    """
    Assign the §3 mandate-instrument sense from the citation's phrasing/context. This is
    the display-eligibility decision (direct_request … body_established; prst_note_decision).
    Raises UncuedCitationError for a citation no sense cue precedes — refused, never
    defaulted; extract records the refusal on the UnparsedNote stream.
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
        # sense — refuse, typed, with the evidence.
        raise UncuedCitationError(
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


def classify_position(note_element: str) -> CitationPosition:
    """
    Classify WHERE the element's citations sit: annex-description content or report
    body. Note-level by observation — every observed annex-title note is annex content
    throughout (S-009 census) — so extract calls this once per element and stamps every
    row the element yields with the result.
    MUST NOT widen beyond the observed note-initial forms (_ANNEX_TITLE_RE); a new form
    is added when observed, not before.
    """
    return "annex_title" if _ANNEX_TITLE_RE.match(note_element) else "body"


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
