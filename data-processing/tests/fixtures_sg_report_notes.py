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
  [LIVE]      a real note element quoted byte-exact from a live sample (the S-005
              sample or the S-009 full-corpus census records), recid given per
              fixture — the live augmentation the two grades above anticipated.
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

# [LIVE] recid 598209 (A/61/824) note[1], S-005 sample. A single "resolutions" head
# governing two tokens — the multi-member list the later-member provenance rule needs. The
# first member is written next to the head (stated); the second (61/642) appeared as a
# bare token in the list and so is inherited, never stated, regardless of distance.
LIST_TWO_MEMBERS = "Prepared pursuant to General Assembly resolutions 61/241 and 61/642."

# [LIVE] recid 441200 (E/2001/44) note[0], S-005 sample. The combined letter-part and
# roman-session form "645 G (XXIII)" (ECOSOC), which no earlier token shape matched, so the
# citation was dropped whole until this form was recognised; two ordinary members follow.
LETTER_ROMAN_SESSION_NOTE = (
    "Submitted in accordance with Economic and Social Council resolution 645 G (XXIII); "
    "concerns the work of the Committee of Experts on the  Transport of Dangerous Goods "
    "during the biennium 1999-2000 and the implementation of Economic and Social Council "
    "resolutions 1999/62 and 1999/65."
)

# [LIVE] recid 4012716 (A/77/877) note[0], S-005 sample. The non-emergency special-session
# form "S-26/2", distinct from the emergency "ES-" tag. Its organ is inherited from the
# "General Assembly" mention earlier in the element.
SPECIAL_SESSION_NOTE = (
    "Submitted pursuant to the Declaration of Commitment on HIV/AIDS, adopted by the "
    "General Assembly in its resolution S-26/2, and the Political Declarations on HIV and "
    "AIDS: Ending Inequalities and Getting on Track To End AIDS by 2030, adopted by the "
    "Assembly in its resolution 75/284."
)

# [LIVE] recid 3927410 (E/2020/53) note[0], S-005 sample. A dated interpolation ("of 16 May
# 1973") sits between the first list member and the rest; until it was consumed the list
# terminated there and 1989/64 / 1995/57 were dropped. "Council decision 2005/247" after
# them is a decision, not a resolution, and stays excluded.
DATED_LIST_NOTE = (
    "10th quinquennial report submitted in accordance with Economic and Social Council "
    "resolutions 1745 (LIV) of 16 May 1973, 1989/64 and 1995/57 and Council  decision "
    "2005/247; covers the period 2014-2018 and reviews developments in  the use of "
    "capital punishment."
)

# [LIVE] recid 788385 (S/2015/124) note[0], S-009 census records. A pinpoint
# interpolation before a list member, in both its observed positions: ", para. 10 of"
# before 2165 (2014) and " and para. 5 of" before 2191 (2014). Until the separator
# admitted an interpolated pinpoint, the list terminated at 2139 (2014) and both later
# members were silently dropped — no citation, no flag (the Syria monthly series loss).
SYRIA_PINPOINT_LIST = (
    "12th report submitted pursuant to para. 17 of Security Council resolutions "
    "2139 (2014), para. 10 of 2165 (2014) and para. 5 of 2191 (2014); covers the "
    "period from 1-31 Jan. 2015."
)

# [LIVE] recid 795322 (S/2015/468) note[0], S-009 census records. The same series with a
# doubled "and and" (source typo): the list must recover 2165 (2014) through the
# pinpoint interpolation but must NOT reach across "and and para. 5 of Security
# Council" — 2191 (2014) resolves via its own later "resolution" head instead.
SYRIA_PINPOINT_DOUBLED_AND = (
    "16th report submitted pursuant to para. 17 of Security Council resolutions "
    "2139 (2014), para. 10 of 2165 (2014) and and para. 5 of Security Council "
    "resolution 2191 (2014)."
)

# [LIVE] recid 801961 (A/70/277) note[0], S-009 census records. A pinpoint
# interpolation AFTER a member (", paragraph 4,") — the postfix form. 68/199 was
# dropped until the separator admitted it; the trailing ", paragraph 24." after the
# last member needs no consuming (the list simply ends there).
POSTFIX_PINPOINT_LIST = (
    "Submitted pursuant to General Assembly resolutions 69/205, paragraph 4, "
    "and 68/199, paragraph 24."
)

# [LIVE] recid 756066 (A/68/269) note[0], S-009 census records. A session appositive
# after a special-session member ("of the 27th special session in 2002") — the
# children-follow-up annual series. 58/282 and 61/272 were dropped until the separator
# admitted the appositive.
SESSION_APPOSITIVE_LIST = (
    "Prepared in response to General Assembly resolutions S-27/2 of the 27th special "
    "session in 2002, 58/282 and 61/272."
)

# [LIVE] recid 692241 (A/65/350/Add.1) note[0], S-009 census records. Arbitrary text
# between members — a parenthetical aside, a "decision" citation, prose with
# intervening words, a missing comma ("60/266 61/244") — none of it is an admitted
# interpolation, so each list still ends where the arbitrary text begins. The known
# losses in this note (61/244, 61/276, the "including" list) are head/member defects
# outside the interpolation fix's scope and stay dropped.
ARBITRARY_INTERPOLATION_NOTE = (
    "Submitted in compliance with General Assembly resolutions 51/243 and 57/281 B "
    "(concerning the employment of gratis personnel), General Assembly decision 51/408 "
    "and subsequent resolutions of the Assembly, including 57/305, 59/266 and 61/244 "
    "(concerning the employment of retirees) and General Assembly resolutions 57/305, "
    "59/266, 60/266 61/244, and 61/276 (concerning the employment of consultants and "
    "individual contractors); presents demographic analysis on the engagements of "
    "gratis personnel (4,979), retirees (3,784) and consultants and individual "
    "contractors (35,231) who were engaged during the biennium from 1 Jan. 2008 to "
    "31 Dec. 2009."
)

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
# is unresolvable (a known doc gap). Sense: committee_established (held for review at
# read time from the sense alone — there is no stored confidence field).
COMMITTEE = "Security Council Committee established pursuant to resolution 748 (1992)."

# [LIVE] recid 71239 (A/39/488) note[0], S-009 census records. A body other than a
# committee ("Group of Consultant Experts") with the "in pursuance of" connective —
# both gaps the body-agnostic establishment cue closes. Before the widening this
# classified direct_request via the generic cue, role co_equal.
GROUP_ESTABLISHED_IN_PURSUANCE = (
    "Annex 1. Replies received from Member States - Annex 2. Report of the Group of "
    "Consultant Experts established in pursuance of General Assembly resolution "
    "37/98 D on provisional procedures to uphold the authority of the 1925 Geneva "
    "Protocol."
)

# [LIVE] recid 634651 (A/63/176) note[0], S-009 census records. "established pursuant
# to" verbatim present but the body is a Panel, so the committee-anchored sense cue
# missed it (the role cue already caught it — role was establishing all along).
PANEL_ESTABLISHED_PURSUANT = (
    "Prepared by the Panel of Governmental Experts, established pursuant to General "
    "Assembly resolution 59/67."
)

# [LIVE] recid 188884 (S/1995/864) note[0], S-009 census records. "Established under" —
# the third observed connective, previously in no vocabulary at all (missed sense AND
# role). The same resolution is cited twice; both occurrences sit after the cue.
COMMISSION_ESTABLISHED_UNDER = (
    "Transmits report submitted by the Executive Chairman of the Special Commission "
    "Established under Security Council Resolution 687 (1991), concerning the status "
    "of the implementation of the plan for the ongoing monitoring and verification of "
    "Iraq's compliance with relevant parts of section C of Security Council resolution "
    "687 (1991)."
)

# [LIVE] recid 750005 (S/2013/326) note[0], S-009 census records. "authorized under" —
# the same family as "established under" but a distinct construction with one observed
# occurrence; deliberately NOT admitted to the establishment cue ("under" is anchored
# on "established", never bare). Both citations classify via the opening generic cue.
UNSOM_AUTHORIZED_UNDER = (
    "Submitted pursuant to para. 29 of Security Council resolution 2010 (2011); covers "
    "major developments that occurred in Somalia during the period from 16 Jan. to 15 "
    "May 2013 and provides a final update on the implementation of the mandate of the "
    "UN Political Office  for Somalia (UNPOS), ahead of its closure on 3 June 2013, "
    "and on planning for the deployment of the UN Assistance Mission in Somalia "
    "(UNSOM) authorized under Security Council resolution 2102 (2013) of 2 May 2013."
)

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
