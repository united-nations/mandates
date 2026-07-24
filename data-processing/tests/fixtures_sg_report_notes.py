"""
Fixture notes for report_mandate_links Stage A tests.

SEED PROVENANCE — READ FIRST. These are DOC-QUOTED SEEDS: every resolution
number, registry symbol and phrasing fragment below is quoted from the
governing references (maintained separately):
  rules_reports-to-mandates-extraction.md    (§1, §3, §4)
  reference_symbol-grammars-and-join-keys.md (§2, §3, §4)
TO BE AUGMENTED FROM A LIVE SAMPLE QUERY over digitallibrary.documents.notes[].

Three provenance grades, marked per fixture:
  [VERBATIM]  the docs quote this text as it stands (ellipses trimmed).
  [COMPOSED]  assembled ONLY from doc-quoted fragments. The docs' prose examples
              are context-free fragments — most omit the construction verb and/or
              the organ mention an element needs to be recognisable at all — so a
              construction head ("Submitted pursuant to") and/or an organ name
              (from PARSER_ORGANS) is prepended. No invented resolution numbers,
              no invented grammar shapes anywhere (no-fallback discipline:
              never fabricate a fixture for an unobserved shape).
  [LIVE]      a real note element quoted byte-exact from the S-005 sample,
              recid given per fixture — the live augmentation the two grades
              above anticipated.
Grammar gaps that could NOT be covered without inventing a shape are left
uncovered and marked, not papered over.

Report identities: report symbols are doc-quoted (rules_ §3/§4); recids are
synthetic test keys (no recid is quoted in any governing doc) and carry no
domain meaning.
"""

# --- kept elements: one citation, direct request --------------------------------------

# [COMPOSED] rules_ §3 canonical table row 1 + "Submitted pursuant to" (taxonomy row 1).
# Grammar 2 (SC number(year)).
DIRECT_SC = "Submitted pursuant to Security Council resolution 2779 (2025)."

# [COMPOSED] rules_ §3 canonical table row 2 + construction head. Grammar 1 (GA).
DIRECT_GA = "Submitted pursuant to General Assembly resolution 78/176."

# [COMPOSED] rules_ §3 canonical table row 6 + construction head. Grammar 4 (HRC).
DIRECT_HRC = "Submitted pursuant to Human Rights Council resolution 41/19."

# [COMPOSED] rules_ §3 canonical table row 4 ("resolution 3376 (XXX)") + construction
# head + GA organ context (the table maps it to A/RES/ but quotes no context — a known
# doc gap). Grammar 5 (roman session).
DIRECT_ROMAN = "Submitted pursuant to General Assembly resolution 3376 (XXX)."

# [COMPOSED] the same doc fragment WITHOUT any organ context — the §3 canonical table's
# own context-free form. Asserts the no-guess rule: roman session shape is never
# organ-inferred, so this element must yield zero citations (UnparsedNote).
DIRECT_ROMAN_BARE = "Submitted pursuant to resolution 3376 (XXX)."

# [COMPOSED] prose form of grammar 6 (A/RES/ES-10/1, reference_ §2) — the docs quote
# only the symbol form, no prose citation; composed as "resolution ES-10/1" (a known
# doc gap). Emergency special session.
DIRECT_ES = "Submitted pursuant to General Assembly resolution ES-10/1."

# [COMPOSED] rules_ §3 canonical table row 3 ("resolution 72/266 A") + construction
# head + GA context. Grammars 7/8 (letter part).
DIRECT_LETTER = "Submitted pursuant to General Assembly resolution 72/266 A."

# [COMPOSED] rules_ §3 grammar row 11 prose form ("resolution 31/141 A-B") + head +
# GA context. Grammar 11 (letter range, bare) — no fold.
DIRECT_RANGE = "Submitted pursuant to General Assembly resolution 31/141 A-B."

# [COMPOSED] rules_ §3: 'the prose reads "resolution 31/106 A"' + head + GA context.
# Cites the resolution whose registry row is bracket-form A/RES/31/106[A] — the
# fold-meets-join case.
DIRECT_BRACKET_REGISTRY = "Submitted pursuant to General Assembly resolution 31/106 A."

# [COMPOSED] "resolution 40/2 A" + head + GA context. The registry holds BOTH variants
# (A/RES/40/2[A] and A/RES/40/2A — reference_ §4, a real fold-created cluster),
# so this citation resolves to a two-variant candidate tuple.
DIRECT_CLUSTER = "Submitted pursuant to General Assembly resolution 40/2 A."

# [LIVE] recid 246228 (A/52/553), S-005 sample. The "in pursuance of" construction —
# the include rule's first observation-gated verb widening (S-006): the census's B3
# sweep (§6) found it five times in live prose, the only recurring missed verb with
# mandate semantics, and the survey extractor independently catches all five
# (comparison §3.2). No other construction verb in the element: before the widening
# this note was ignored entirely.
IN_PURSUANCE = "In pursuance of General Assembly resolution 51/131."

# [LIVE] recid 177057 (A/48/542), S-005 sample. Same construction, plus the NO-SPACE
# letter part "47/70F" — the case the survey extractor mis-extracts as the parent
# A/RES/47/70 (its suffix regex demands whitespace before the letter); ours must
# resolve it to A/RES/47/70F via _LETTER_PART.
IN_PURSUANCE_LETTER_NOSPACE = "In pursuance of General Assembly resolution 47/70F."

# --- kept elements: multi-citation and classified senses ------------------------------

# [COMPOSED] rules_ §3 taxonomy row 3 with the doc's organ shorthand ("GA", "ECOSOC")
# expanded to the full PARSER_ORGANS names (shorthand treated as doc abbreviation, not
# note text). Grammar 3 (ECOSOC) + additional/joint sense.
ADDITIONAL_JOINT = (
    "Submitted also in response to General Assembly resolution 79/140 "
    "and Economic and Social Council resolution 2024/8."
)

# [VERBATIM] rules_ §3 include-rule discussion (ellipses trimmed). The standing-mission
# form a "Submitted pursuant to" anchor would miss. Sense: activities_carried_out.
UNFICYP = (
    "activities carried out by UNFICYP pursuant to "
    "Security Council resolution 186 (1964)"
)

# [COMPOSED] rules_ §3 taxonomy row 5 ("Committee established pursuant to resolution
# 748 (1992)") + "Security Council" organ context, without which the doc's own quote
# is unresolvable (a known doc gap). Sense: committee_established, confidence low.
COMMITTEE = "Security Council Committee established pursuant to resolution 748 (1992)."

# [COMPOSED] rules_ §3 taxonomy row 2 pair (350 (1974) / 2811 (2025)) laid into the §3
# bare-citation sentence structure ("…and subsequent Council resolutions, most recently
# resolution …"). Exercises BOTH the founding/most_recent pair and bare-citation organ
# inference: "resolution 2811 (2025)" carries no organ of its own and must inherit
# S/RES/ from the "Security Council" mention earlier in the same element.
FOUNDING_RENEWAL = (
    "Submitted pursuant to the mandate contained in Security Council resolution "
    "350 (1974) and subsequent Council resolutions, most recently resolution 2811 (2025)."
)

# [COMPOSED] rules_ §3 scope-table PRST example symbol in its quoted setting ("statement
# of the President … (S/PRST/2024/7)") + construction head. Symbol-form recognition.
PRST = (
    "Submitted pursuant to the statement of the President of the "
    "Security Council (S/PRST/2024/7)."
)

# [COMPOSED] rules_ §1 pinpoint fragment "para. 50 of resolution 2808" (+ year parens
# per grammar 2; 2808 is quoted in §1 as an SC resolution) + SC organ context.
PINPOINT = (
    "The Security Council requested the present report pursuant to "
    "para. 50 of resolution 2808 (2025)."
)

# [COMPOSED] an organ-less citation followed by a fully attributed one in the SAME
# element (both numbers doc-quoted). The organ mention comes AFTER the first token, so
# the first is withheld (never guessed) while the second resolves — the element yields
# its link row AND a diagnostic record.
MIXED_BARE_THEN_RESOLVED = (
    "Submitted pursuant to resolution 3376 (XXX) and to "
    "Security Council resolution 2779 (2025)."
)

# --- retained-but-unresolvable and rejected elements -----------------------------------

# [COMPOSED] a bare citation as its OWN element (doc-quoted number). Paired in tests
# with an organ-naming element in the same report, to assert the §3 boundary rule: an
# organ is NEVER inherited across note elements.
BARE_RENEWAL_ELEMENT = "Submitted pursuant to resolution 2811 (2025)."

# [VERBATIM] rules_ §3 taxonomy row 6 — non-resolution reference, REJECTED (no
# citation), still counted via had_mandate_construction.
MONTREAL = "pursuant to article 6 of the Montreal Protocol"

# [VERBATIM] the worked no-symbol example — mandate construction, zero link rows.
RELEVANT_RESOLUTIONS = "pursuant to the relevant resolutions of the General Assembly"

# [VERBATIM] rules_ §3 — pure noise, no construction: ignored entirely.
NOISE = "Includes UN map no. 2930"

# --- registry-side symbol strings (function-level fixtures, all [VERBATIM]) -----------

# reference_ §2 / §3 — grammars 8, 9, 10, 11, 12 as the registry stores them.
REGISTRY_SPACED_LETTER = "A/RES/72/266 A"        # grammar 8
REGISTRY_BRACKET_SINGLE = "A/RES/31/106[A]"      # grammar 9
REGISTRY_BRACKET_ROMAN = "A/RES/40/252[XII]"     # grammar 10
REGISTRY_BRACKET_DOUBLE = "A/RES/289(IV)[AA]"    # grammar 10
REGISTRY_RANGE_BARE = "A/RES/31/141A-B"          # grammar 11
REGISTRY_RANGE_EN_DASH = "A/RES/79/93 A–B"  # grammar 12 (en dash)

# --- display index ---------------------------------------------------------------------

# DisplayIndex fixture: match_key -> byte-exact ppb_full_document_symbol variants.
# Every string is a doc-quoted registry symbol; the two-variant entries are the two
# REAL fold-created clusters from reference_ §4, verbatim.
DISPLAY_INDEX = {
    "A/RES/40/2A": ("A/RES/40/2[A]", "A/RES/40/2A"),
    "A/RES/40/2B": ("A/RES/40/2[B]", "A/RES/40/2B"),
    "A/RES/31/106A": ("A/RES/31/106[A]",),
    "S/RES/1325(2000)": ("S/RES/1325(2000)",),   # rules_ §5 live page key
}

# --- report identities ------------------------------------------------------------------

# Doc-quoted report symbols: dual-symbol example (rules_ §4) and the ECOSOC-joint
# reports (rules_ §3). Recids are synthetic test keys.
DUAL_SYMBOL_REPORT = "A/80/723 - S/2026/357"
JOINT_REPORT_A = "A/80/75"
JOINT_REPORT_B = "A/80/82"
