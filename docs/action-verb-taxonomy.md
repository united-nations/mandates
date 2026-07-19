# Action verbs in UN resolutions: taxonomy, sources, and deterministic extraction

*July 2026. Research + implementation report. The extraction code lives in the
digitallibrary.unfck.org repo (`python/fulltext_verbs.py`, branch
`feature/fulltexts`); annotations are stored in
`digitallibrary.document_paragraphs` (migration 004). This document records the
sources in detail, the dimension definitions, the complete lexicon as
implemented, the evaluation against the previous LLM-based extraction, and the
database representation.*

---

## 1. Question and answer

Preambular and operative paragraphs of UN resolutions use a controlled grammar
opening with specific verbs ("Recalling…", "Requests…", "Decides…"). We
previously extracted these with an LLM (gpt-4.1; the
`mandates.paragraph_mandates` data: 13,310 instances, 71 normalized verbs,
5 categories). Two questions: can extraction be deterministic, and what is the
*right* taxonomy?

**Answers.** (1) Yes: a closed lexicon of 81 normalized verbs (235 surface
forms) covers 94–99% of paragraphs; the remainder is structural — sub-items
inheriting a chapeau verb — which the fulltext parser's hierarchy already
resolves. The deterministic parser reaches 97.5% verb agreement and 98.3%
category agreement with the LLM output, and the audited disagreements are
mostly LLM errors. (2) The 5-category draft survives as *one* dimension of
five: category, force, sentiment, bindingness, and addressee class, plus a
budget-relevance flag.

---

## 2. What the sources say, in detail

### 2.1 DGACM, "Editing of resolutions at the United Nations" (the closest thing to an official list)

The delegate guide of the DGACM Editing Section — the office that actually
edits every draft resolution — states the structural rules verbatim:

> "Preambular paragraphs … **must begin with a verb in the form of a present,
> past or perfect participle or an adjective in italics.**"
> "Operative paragraphs are numbered … **must begin with an action verb.**"
> "When the opening verb of a paragraph is repeated in the following
> paragraph(s), the word **also** is used. If the verb is repeated a second
> time in succession, the word **further** is used."

Its Annex lists the **common preambular verbs/adjectives**: *Acknowledging ·
Affirming · Alarmed · Aware · Bearing in mind · Believing · Cognizant ·
Commending · Concerned (Gravely/Deeply) · Conscious · Convinced · Deploring ·
Disturbed · Emphasizing · Expressing (alarm, appreciation, concern, gratitude,
satisfaction) · Guided · Having considered/heard/received · Mindful · Noting
(with concern/appreciation/satisfaction) · Reaffirming · Realizing ·
Recalling · Recognizing · Stressing · Taking into account · Taking note (with
appreciation/concern) · Thanking · Underlining/Underscoring · Urging* — and the
**common operative verbs**: *Accepts · Adopts · Affirms · Agrees · Appeals ·
Appreciates · Approves · Authorizes · Calls upon · Commends · Condemns
(Strongly condemns) · Decides · Declares · Demands · Denounces · Deplores ·
Discourages · Emphasizes · Endorses · Expresses (…) · Invites · Notes (…) ·
Reaffirms · Recognizes · Recommends · Reiterates · Rejects · Renews · Requests ·
Supports · Takes note (…) · Underlines/Underscores · Urges · Welcomes*.

Crucially, several "verb choices" turn out to be **enforced editorial rules**,
not style preferences:

- "*Takes note* is used when the object is a report, statement or decision.
  *Notes* is used in the sense of 'observes'."
- "A body should **not take note of or welcome its own past decision**" — the
  editor substitutes *recalls* or *reaffirms*.
- "*Reiterates* … means that the Assembly is **repeating something it has said
  in a previous resolution.** If the editor can find no such previous text …
  'affirms' or 'stresses'." — i.e. *reaffirm / recall / reiterate* are formally
  **anaphoric**: they must point at prior text. This validates treating
  repetition as a real, checkable property rather than a connotation.

### 2.2 Other UN-official lists

- **DGACM Editorial Manual online** (res-dec-draft-edit): preambular paragraphs
  open with a participle/participial phrase/adjective; operative paragraphs
  with "an operative verb (or phrase) in the present indicative tense"; only
  the opening verb is italicized (this italic is exactly the signal our docx
  extractor captures as `lead_italic_text`).
- **UN.org "Drafting Resolutions"**: 36 preambular + 34 operative items
  (adds *Directs, Proclaims, Repeals, Suggests, Determines* to the operative
  side), with the explicit strength note: "'Requests' is most neutral; 'Calls
  upon' is stronger; 'Urges' even stronger; 'Demands' represents the highest
  emotion level, rarely used."
- **UN Terminology Bulletin 313 (ST/CS/SER.F/313, 8 Dec 1978)** is the
  canonical reference every guide cites — and it is not available online. A
  Dag Hammarskjöld Library request would settle residual edge cases. No single
  closed canonical list exists post-Bulletin-313; the living authority is the
  DGACM guide above.

### 2.3 Legal bindingness (scholarship)

- **ICJ, *Namibia* advisory opinion (1971)**: "The language of a resolution of
  the Security Council should be carefully analysed before a conclusion can be
  made as to its binding effect … having regard to the terms of the resolution
  to be interpreted, the discussions leading to it, the Charter provisions
  invoked and, in general, all circumstances." → **Bindingness is not
  verb-deterministic.** Any verb-level bindingness value is *presumptive*.
- **M. Wood, "The Interpretation of Security Council Resolutions" (MPUNYB
  1998)**: mandatory decisions in practice combine "**acting under Chapter
  VII**" with "**decides**", but drafting practice is inconsistent; most SCR
  provisions are not intended to bind states at all. Also documents the
  standard executable-mandate construction: the Council "requests the
  Secretary-General to submit a report … then approves … and requests the
  Secretary-General to implement."
- Consensus across the legal literature (Higgins 1972; EJIL:Talk!; EIP): the
  binding marker is *decides* (esp. under Chapter VII); *calls upon, reaffirms,
  underlines, stresses, urges, invites* are presumptively hortatory; *calls
  upon, requests, warns* are explicitly contested grey areas. GA resolutions
  are recommendatory (Charter arts. 10–14) **except** internal/budgetary
  matters (art. 17 — GA budget decisions bind).

### 2.4 Budget relevance

- **GA rule 153 / ECOSOC rule 31**: no resolution involving expenditure may be
  approved without a Secretary-General cost estimate (the PBI machinery, with
  rule 154 / Fifth Committee / ACABQ).
- Mandate-generating constructions recognized in practice: "*requests the
  Secretary-General to report/submit*" (the classic reporting mandate),
  "*authorizes*", "*establishes*", "*decides to extend/continue*",
  "*approves*". Absorption phrases ("within existing resources", "from
  extrabudgetary resources", "subject to availability of resources") cap the
  budget impact without removing the mandate. No official closed list of these
  phrases exists; ours is empirically derived.
- **Mandate definitions**: UN80 review (2025–26): a mandate is "a request or
  directive for action set out in the UN Charter, a resolution or decision by
  a UN intergovernmental organ" (GA res. 79/318, decision 79/571); A/60/733
  ("Mandating and delivering", 2006) built the earlier framework with
  reporting mandates as the dominant subclass. Takeaway: **deciding +
  directive-to-Secretariat are the mandate-generating classes**; observing/
  reinforcing/evaluative essentially never create mandates alone.

### 2.5 Force ordering (converging sources)

UN.org, Legal Response International (treaty-body verb strength), and the IPI
Security Council compliance-coding literature converge on:

> **invites ≈ suggests ≈ encourages < recommends ≈ requests < calls upon <
> urges < demands** — with **decides** above all of these but as a *category
> jump* (commissive/binding), not one more notch, and **demands** de facto
> Security-Council-only (convention, not written rule).

Our corpus confirms the ordering empirically and adds the observed escalation
ladder *… urges < strongly urges < demands < condemns < strongly condemns*
(see §6).

---

## 3. Dimension definitions

Every lexicon entry carries six values. Definitions, and how values were
assigned:

**category** — the illocutionary function of the clause (see §4 for the
Searle mapping). Assignment follows the legacy 5-way scheme for
compatibility, corrected where the literature was decisive (e.g. *authorizes*
→ deciding).

**force (0–5)** — ordinal strength *within the directive/deciding spine*,
anchored to the multi-source ordering in §2.5:

| rank | anchor verbs | reading |
|---|---|---|
| 0 | notes, welcomes, recalls (all observing/evaluative/reinforcing) | no demand made |
| 1 | invites, encourages, suggests, expresses intention | polite/optional |
| 2 | recommends, reminds, appeals, decides-to-remain-seized | soft ask |
| 3 | requests, calls upon, calls for, commits | the standard ask |
| 4 | urges, directs, endorses, resolves, declares | pressing |
| 5 | demands, decides, authorizes, approves, adopts, establishes | maximal / dispositive |

Force is only *meaningful* for directive/deciding verbs; observing/evaluative
verbs sit at 0 by construction. Intensity **modifiers** (*strongly, deeply,
urgently*) are recorded separately in `action_modifiers` rather than bumping
the rank — the data shows escalation is verb-specific (*condemns* is escalated
39% of the time; *requests* almost never), so "strongly urges" is represented
as urge(4) + modifier, preserving both facts.

**sentiment (−1 / 0 / +1)** — appraisal polarity: *welcomes, commends,
endorses* (+1); *condemns, deplores, regrets, expresses concern* (−1);
everything else 0. For the **carrier verbs** (*expresses X*, *takes note with
X*) polarity lives in the object noun, and the normalized verb is derived from
it (*expresses concern* → `express concern`, −1; *expresses appreciation* →
`appreciate`, +1) — the bare carrier is meaningless.

**bindingness (binding / hortatory / contextual)** — the *presumptive* legal
force per §2.3, verb-level only: `binding` for the dispositive verbs
(*decides, authorizes, demands, adopts, approves, establishes*), `hortatory`
for exhortations to actors the body cannot command (*calls upon, urges,
invites, encourages*), `contextual` for verbs whose force genuinely depends on
addressee and organ (*requests, endorses, declares* …). Per *Namibia*, even
"binding" is a presumption: organ (SC vs GA), Chapter-VII context (captured
separately as `action_context_marker='chapter_vii'`), and addressee co-decide.
We deliberately did **not** try to compute a final legal verdict per paragraph
— the data model stores the ingredients (verb bindingness + organ + addressee
+ context marker) and leaves the judgment to the consumer.

**budget_relevant (boolean)** — true for the ~10 verbs whose constructions
typically trigger rule-153 machinery or create resource/reporting mandates:
*requests* (to Secretariat), *authorizes, approves, appropriates, adopts,
establishes, decides* (extend/continue constructions), *directs*, *endorses*
(programmatic). Corpus evidence in §6.4.

**addressee_expected (boolean) → assignee extraction** — directive verbs take
a grammatical object = the assignee. When set, the parser extracts the span
between the verb and the first *to*-infinitive anchor (present in 95.8% of
directive paragraphs) and classifies it into
`secretary_general | secretariat_entity | member_states | un_body |
special_procedure | ngo_other | unclear`. Empirically this is the sharpest
dimension of all: **"requests" targets the Secretariat 520:7 over Member
States, while "calls upon"/"urges" target states** — same speech act,
different lexicalization by addressee sovereignty (§6.3).

**Modifiers** (recorded per instance, not per verb): repetition markers
(*Also, Further, Once again* — the DGACM anaphora convention; 3,116 "Also"
openings corpus-wide), intensity adverbs (*Strongly, Deeply, Urgently…*), and
connectives (*In this regard*).

---

## 4. Mapping the draft categories to illocutionary classes

The draft's five class names map onto Searle's speech-act taxonomy almost
one-to-one — which is why the spine was kept:

| Draft category | Searle class | What the utterance does | Core verbs |
|---|---|---|---|
| observing | **assertive/representative** | commits the body to a truth claim | notes, recognizes, acknowledges, considers |
| evaluative | **expressive** | expresses the body's attitude | welcomes, commends, condemns, deplores |
| deciding | **commissive + declarative** | binds the body itself, or *changes institutional reality by being uttered* | decides, resolves, pledges (commissive); adopts, proclaims, establishes, declares (declarative) |
| directive | **directive** | tries to get someone else to act | requests, calls upon, urges, demands, invites |
| reinforcing | *(no Searle class)* | **anaphora/repetition operator** | reaffirms, recalls, reiterates + emphasis verbs |

Two refinements from the mapping exercise:

1. **"Reinforcing" is not a peer class but an operator.** "Reaffirms its
   condemnation" = reinforcing ∘ evaluative; "Recalls resolution X" =
   reinforcing ∘ observing. DGACM's editorial rules (§2.1) confirm the
   anaphoric half (*reaffirm/recall/reiterate* must point at prior text); the
   emphasis half (*underlines, stresses, emphasizes, highlights*) is a
   different thing that the draft lumped in. We keep the category for legacy
   compatibility but record repetition separately in `action_modifiers`, so
   the operator reading is recoverable.
2. **"Deciding" spans two Searle classes** (commissive vs declarative). We did
   not split it — the mandate-analysis use case treats both as "the body
   dispositively acts" — but the force ranks separate the weighty members
   (decides 5, adopts 5) from the near-procedural ones (decides-to-remain-
   seized 2, expresses-intention 1).

Other corrections to the draft list: *authorizes* (the prime SC/budget mandate
verb), *approves*, *appropriates*, *directs*, *proclaims*, *appeals*,
*suggests* were missing entirely; *support* is evaluative in the draft but
borders on endorsement when operative (kept evaluative, force 1); *remind* is
directive in form but reinforcing in function (kept directive, force 2);
polarity was invisible (fixed by the sentiment axis).

---

## 5. The lexicon as implemented (81 normalized verbs, 235 surface forms)

Generated from `fulltext_verbs.py::LEXICON` — this table IS the
implementation, not a summary of it. "Force" and flags as defined in §3.
Surface forms are abbreviated here (operative 3rd-person and preambular
participle forms shown; imperative and "We"-declaration forms exist for the
core verbs).

### observing (19 verbs)

| Normalized | Force | Sent. | Bindingness | Budget | Takes assignee | Operative forms | Preambular forms |
|---|---|---|---|---|---|---|---|
| **acknowledge** | 0 | 0 | contextual | – | – | acknowledges | acknowledging |
| **be aware** | 0 | 0 | contextual | – | – | – | aware, fully aware |
| **be cognizant** | 0 | 0 | contextual | – | – | – | cognizant |
| **be conscious** | 0 | 0 | contextual | – | – | – | conscious, fully conscious |
| **be convinced** | 0 | 0 | contextual | – | – | – | convinced, fully convinced |
| **be mindful** | 0 | 0 | contextual | – | – | – | mindful |
| **bear in mind** | 0 | 0 | contextual | – | – | bears in mind | bearing in mind |
| **believe** | 0 | 0 | contextual | – | – | believes | believing |
| **confirm** | 0 | 0 | contextual | – | – | confirms | confirming |
| **consider** | 0 | 0 | contextual | – | – | considers | considering |
| **consider** | 0 | 0 | contextual | – | – | – | having considered, having examined, having heard … |
| **desirous** | 0 | 0 | contextual | – | – | – | desirous |
| **guided by** | 0 | 0 | contextual | – | – | – | guided |
| **note** | 0 | 0 | contextual | – | – | notes | noting |
| **observe** | 0 | 0 | contextual | – | – | observes | observing |
| **realize** | 0 | 0 | contextual | – | – | realizes, realises | realizing, realising |
| **recognize** | 0 | 0 | contextual | – | – | recognizes, recognises | recognizing, recognising |
| **take into account** | 0 | 0 | contextual | – | – | takes into account | taking into account, taking into consideration, taking account |
| **take note** | 0 | 0 | contextual | – | – | takes note | taking note |

### reinforcing (11 verbs)

| Normalized | Force | Sent. | Bindingness | Budget | Takes assignee | Operative forms | Preambular forms |
|---|---|---|---|---|---|---|---|
| **affirm** | 0 | 0 | contextual | – | – | affirms | affirming |
| **emphasize** | 0 | 0 | contextual | – | – | emphasizes, emphasises | emphasizing, emphasising |
| **highlight** | 0 | 0 | contextual | – | – | highlights | highlighting |
| **reaffirm** | 0 | 0 | contextual | – | – | reaffirms | reaffirming |
| **recall** | 0 | 0 | contextual | – | – | recalls | recalling |
| **reconfirm** | 0 | 0 | contextual | – | – | reconfirms | reconfirming |
| **reiterate** | 0 | 0 | contextual | – | – | reiterates | reiterating |
| **remain** | 0 | 0 | contextual | – | – | remains | remaining |
| **stress** | 0 | 0 | contextual | – | – | stresses | stressing |
| **underline** | 0 | 0 | contextual | – | – | underlines | underlining |
| **underscore** | 0 | 0 | contextual | – | – | underscores | underscoring |

### evaluative (18 verbs)

| Normalized | Force | Sent. | Bindingness | Budget | Takes assignee | Operative forms | Preambular forms |
|---|---|---|---|---|---|---|---|
| **support** | 1 | + | contextual | – | – | supports | supporting |
| **appreciate** | 0 | + | contextual | – | – | appreciates | appreciating |
| **be alarmed** | 0 | − | contextual | – | – | – | alarmed, gravely alarmed, deeply alarmed |
| **be concerned** | 0 | − | contextual | – | – | are concerned, is concerned, are deeply concerned, are gravely concerned … | concerned, gravely concerned, deeply concerned … |
| **be disturbed** | 0 | − | contextual | – | – | – | disturbed, deeply disturbed |
| **commend** | 0 | + | contextual | – | – | commends | commending |
| **condemn** | 0 | − | contextual | – | – | condemns | condemning |
| **congratulate** | 0 | + | contextual | – | – | congratulates | congratulating |
| **denounce** | 0 | − | contextual | – | – | denounces | denouncing |
| **deplore** | 0 | − | contextual | – | – | deplores | deploring |
| **deprecate** | 0 | − | contextual | – | – | deprecates | deprecating |
| **express** | 0 | 0 | contextual | – | – | expresses | expressing |
| **look forward** | 0 | + | contextual | – | – | looks forward, look forward | looking forward |
| **regret** | 0 | − | contextual | – | – | regrets | regretting |
| **reject** | 0 | − | contextual | – | – | rejects | rejecting |
| **thank** | 0 | + | contextual | – | – | thanks | thanking |
| **trust** | 0 | + | contextual | – | – | trusts | trusting |
| **welcome** | 0 | + | contextual | – | – | welcomes | welcoming |

### deciding (18 verbs)

| Normalized | Force | Sent. | Bindingness | Budget | Takes assignee | Operative forms | Preambular forms |
|---|---|---|---|---|---|---|---|
| **adopt** | 5 | 0 | binding | yes | – | adopts | adopting |
| **appropriate** | 5 | 0 | binding | yes | – | appropriates | – |
| **approve** | 5 | 0 | binding | yes | – | approves | approving |
| **authorize** | 5 | 0 | binding | yes | yes | authorizes, authorises | authorizing, authorising |
| **decide** | 5 | 0 | binding | yes | – | decides | deciding |
| **determine** | 5 | 0 | binding | – | – | determines | – |
| **establish** | 5 | 0 | binding | yes | – | establishes | establishing |
| **renew** | 5 | 0 | binding | yes | – | renews | renewing |
| **agree** | 4 | 0 | contextual | – | – | agrees | agreeing |
| **continue** | 4 | 0 | contextual | – | – | continues | continuing |
| **declare** | 4 | 0 | contextual | – | – | declares | declaring |
| **endorse** | 4 | + | binding | yes | – | endorses | endorsing |
| **proclaim** | 4 | 0 | contextual | – | – | proclaims | proclaiming |
| **resolve** | 4 | 0 | contextual | – | – | resolves | resolving |
| **accept** | 3 | 0 | contextual | – | – | accepts | accepting |
| **commit** | 3 | + | contextual | – | – | commits, are determined, is determined, commit ourselves … | committing |
| **pledge** | 3 | + | contextual | – | – | pledges | pledging |
| **recommit** | 3 | + | contextual | – | – | recommits, rededicate ourselves, recommit ourselves | – |

### directive (15 verbs)

| Normalized | Force | Sent. | Bindingness | Budget | Takes assignee | Operative forms | Preambular forms |
|---|---|---|---|---|---|---|---|
| **demand** | 5 | 0 | hortatory | – | yes | demands | demanding |
| **direct** | 4 | 0 | binding | yes | yes | directs | directing |
| **urge** | 4 | 0 | hortatory | – | yes | urges | urging |
| **ask** | 3 | 0 | hortatory | – | yes | asks | asking |
| **call for** | 3 | 0 | hortatory | – | – | calls for | calling for |
| **call on** | 3 | 0 | hortatory | – | yes | calls on | calling on |
| **call upon** | 3 | 0 | hortatory | – | yes | calls upon | calling upon |
| **request** | 3 | 0 | hortatory | yes | yes | requests | requesting |
| **appeal** | 2 | 0 | hortatory | – | yes | appeals | appealing |
| **recommend** | 2 | 0 | hortatory | – | yes | recommends | recommending |
| **remind** | 2 | 0 | hortatory | – | yes | reminds | reminding |
| **discourage** | 1 | − | hortatory | – | yes | discourages | discouraging |
| **encourage** | 1 | + | hortatory | – | yes | encourages | encouraging |
| **invite** | 1 | 0 | hortatory | – | yes | invites | inviting |
| **suggest** | 1 | 0 | hortatory | – | – | suggests | suggesting |

Special non-verb handling: **"Acting under Chapter VII of the Charter…"** is
recognized as a context marker (`action_context_marker='chapter_vii'`), not an
action verb — it flags the bindingness context for the operatives that follow.
The opening formulas ("The General Assembly,") are their own element type and
carry no verb.

---

## 6. Empirical evidence (corpus: 39.6k operative + 28.7k preambular paragraphs at analysis time)

### 6.1 Coverage of a closed list

| scope | top-20 | top-30 | top-50 | top-80 |
|---|---:|---:|---:|---:|
| operative | 87.4% | 91.9% | 94.2% | 95.9% |
| preambular | 92.1% | 96.4% | 98.8% | 99.5% |

The operative tail is **100% structural**: enumerated `(a) To strengthen…`
sub-items and chapeau-continuation lines that *inherit* their parent's verb —
identifiable by `prefix`/`level`, not vocabulary. This is why chapeau
inheritance, not a longer word list, closes the gap (final coverage 98.7%).

### 6.2 Modifiers and carriers

Leading modifiers (operative): *Also* 3,116 · *Further* 807 · *Strongly* 315
(of which *strongly condemns* 144) · *Urgently* 19 · *Once again* 16.
Carrier objects: *expresses … concern* 1,754 vs *appreciation* 356 vs *alarm*
46; *takes note with appreciation* 813 vs *with concern* 405. Multi-word
disambiguation that matters: *calls upon* 2,896 (directive, takes assignee) vs
*calls for* 338 (impersonal, no assignee). Compounds: paragraphs carrying a
second verb after "and" are frequent (*and encourages* 1,925, *and requests*
1,252) — the parser records leading compounds (*Welcomes and endorses*);
mid-paragraph secondary mandates are future work (§9).

### 6.3 Actor-dependence (legacy assignee data × verb)

| verb | Member States | UN Secretariat | UN System | UN Organs |
|---|---:|---:|---:|---:|
| request | **7** | **520** | 108 | 22 |
| call upon | 334 | 34 | 266 | 10 |
| urge | 306 | 35 | 103 | 2 |
| encourage | 527 | 101 | 151 | 35 |
| invite | 88 | 30 | 114 | 32 |

You *request* the Secretary-General; you *call upon / urge* sovereign states;
you *invite* external bodies. The addressee is a first-class dimension.

### 6.4 Budget signal

Overall phrase prevalence in operative text: *voluntary contributions* 408 ·
*within existing resources* 304 · *extrabudgetary* 76 · *regular budget* 74 ·
**"programme budget implications" only 4** — PBIs live in separate ACABQ/Fifth
Committee documents, so budget relevance must be inferred from
verb + addressee + deliverable, never string-matched. *Requests* dominates
budget language (167 co-occurrences; 108 "within existing resources" — the
classic zero-cost hedge); *invites* co-occurs with voluntary/extrabudgetary
funding appeals; *authorizes/decides/approves* carry the mandatory spend.

### 6.5 Sentiment asymmetry

Positive appraisal (~4,400: *welcomes* 3,815, *commends* 306, …) outweighs
negative (~1,900: *condemns* 688, *concerned* 750, *deplores* 192, …) about
2.3:1 corpus-wide; HRC texts are the condemnation-heavy outlier.

---

## 7. The deterministic parser

`fulltext_verbs.py` (digitallibrary.unfck.org repo). Stateless per paragraph;
`extract_action(text, paragraph_type, level, prefix, chapeau_action) → dict`.

1. **Strip and record modifiers** (repetition / intensity / connective), and a
   leading "We" for declaration-style texts (Pact for the Future).
2. **Longest-surface-form match** at paragraph start against the lexicon
   (multi-word first: *takes note with appreciation* before *takes note*
   before *notes*; *calls upon* ≠ *calls for*). Operative third-person,
   preambular participle, and imperative forms per entry; British spellings
   folded.
3. **Carrier resolution**: *expresses/takes-note* + object noun → normalized
   verb + sentiment from the object.
4. **Compounds**: *Welcomes and endorses* → primary + secondary verb list.
5. **Chapeau inheritance**: a sub-item (`(a)`, `(i)`, `To <verb>…`) with no
   finite verb inherits the governing chapeau's action (marked
   `action_inherited=true`, with its own infinitive recorded). The chapeau
   context is resolved by the caller (`fulltext_parse.py::annotate_actions`)
   from the element sequence: the most recent shallower operative ending in
   ":", plus declaration chapeaux ("We decide to:", passive "are
   encouraged…:").
6. **Assignee extraction** (directive verbs): span between verb and first
   *to*-infinitive anchor → verbatim, head noun, and one of 7 addressee
   classes via a curated actor list.
7. **Context markers**: "Acting under Chapter VII" → `chapter_vii`, no verb.

Excluded by design: **S/PRST bodies** (narrative prose with a collective
subject — no verb-initial grammar; needs a bespoke path), annex/table content,
and null-`paragraph_type` elements — annotations never leak onto them.

A 30-case self-test covers adverb stripping, compounds, carriers, inheritance,
assignee extraction, and the Chapter-VII marker
(`uv run python python/fulltext_verbs.py`).

---

## 8. Evaluation against the legacy LLM extraction

Method: `fulltext_verbs_eval.py` matches our parsed paragraphs to legacy
`mandates.paragraphs` rows by normalized symbol + text similarity (99.8% match
rate; positions differ between corpora), then compares against
`paragraph_mandates`. 56 overlap documents, 4,566 matched rows, five
iteration rounds:

| round | operative coverage | verb agreement | category agreement | assignee agreement |
|---|---|---|---|---|
| 1 | 87.4% | 96.3% | 98.5% | 78.5% |
| 3 | 97.6% | 96.6% | 98.3% | 82.9% |
| 5 (final) | **97.6%** | **97.5%** | **98.3%** | **82.9%** |

The round-1→3 jump was entirely the Pact-for-the-Future declaration grammar
("We decide to:" chapeaux with imperative bullets). Preambular coverage 94.9%
(the "misses" are correctly-None non-verb lines: opening formulas,
rules-of-procedure headings).

Disagreement audit (every residual class read by hand):

- **Legacy inconsistency** (dominant): *note*↔*take note* (24 — legacy itself
  maps *Taking note*→`take note` 62:24, which we follow, consistent with the
  DGACM notes/takes-note rule), *express*↔*appreciate* (7), *recognize* typed
  both observing and reinforcing (11).
- **Ours better / genuine ambiguity** (~25): Pact sub-items where legacy
  blanket-labeled every bullet "decide" while we extract each bullet's own
  verb (*Encourage…*, *Invite…*).
- **Our bugs**: ~7 instances of 4,566 (*agree*→*resolve* chapeau synonym,
  *underline*→*underscore*). Negligible.
- **Assignee 82.9%**: head-noun recovery is strong; exact-string agreement is
  capped by legacy picking a single member of coordinated lists ("Member
  States **and** relevant organizations").

Verdict: reliable → integrated (parser version `sem-v2`). The text-preservation
acceptance gate confirms annotation changed no text (100.0000% preserved).

---

## 9. Implementation and database representation

**Code** (digitallibrary.unfck.org, branch `feature/fulltexts`):

| File | Role |
|---|---|
| `python/fulltext_verbs.py` | lexicon + `extract_action()` + self-test (importable module, stdlib+regex only) |
| `python/fulltext_verbs_eval.py` | evaluation harness vs legacy LLM data |
| `python/fulltext_parse.py::annotate_actions` | integration pass: chapeau-context resolution over the element sequence, annotation of preambular/operative elements |
| `sql/migrations/004_action_verbs.sql` | DB columns (idempotent; mirrored in `sql/schema/fulltext_tables.sql`) |

**Database** — 13 nullable columns on `digitallibrary.document_paragraphs`
(one row per semantic element; annotations only on
`paragraph_type IN ('preambular','operative')` rows):

| Column | Type | Meaning |
|---|---|---|
| `action_verb` | text | verbatim as it appears ("Strongly condemns") |
| `action_verb_normalized` | text | lexicon lemma ("condemn") — partial index |
| `action_category` | text | observing / reinforcing / evaluative / deciding / directive |
| `action_force` | smallint | 0–5 (§3) |
| `action_sentiment` | smallint | −1 / 0 / +1 |
| `action_bindingness` | text | binding / hortatory / contextual (presumptive, §3) |
| `action_budget_relevant` | boolean | verb-level budget flag |
| `action_modifiers` | jsonb | `{"repetition": "also", "intensity": "strongly", …}` |
| `assignee` | text | verbatim assignee span (directive verbs) |
| `assignee_head_noun` | text | normalized head ("Secretary-General") |
| `assignee_class` | text | 7-class addressee — partial index |
| `action_inherited` | boolean | true for chapeau-inherited sub-items |
| `action_context_marker` | text | e.g. `chapter_vii` |

The parser's JSON output (`parsed_dev/*.json`) carries the same data as a
nested `action` object per element (plus `compound`/`secondary_verbs` and
`context_dependent`, which intentionally have no DB columns yet).

**Worked example** — `S/RES/2803(2025)` straight from the database:

| pos | prefix | verb | category | force | bind | assignee_class | text (head) |
|---|---|---|---|---|---|---|---|
| 3 | | welcome | evaluative | 0 | contextual | | *Welcoming the Comprehensive Plan…* |
| 5 | 1. | endorse | deciding | 4 | binding | | *Endorses the Comprehensive Plan…* |
| 8 | 4. | authorize | deciding | 5 | binding | member_states | *Authorizes Member States participating in the BoP…* |
| 10 | 6. | call upon | directive | 3 | hortatory | ngo_other | *Calls upon the World Bank and other financial institutions…* |
| 12 | 8. | decide | deciding | 5 | binding | | *Decides the BoP and international civil and security presence…* |

(Positions 4 and 9 — "*Determining that…*" and "*Understands that…*" — are
honest tail examples: not in the lexicon, left unannotated rather than
guessed.)

**Query sketches:**

```sql
-- All binding decisions addressed to the Secretariat, with budget relevance
SELECT symbol_normalized, position, text
FROM digitallibrary.document_paragraphs
WHERE action_bindingness = 'binding' AND action_budget_relevant
  AND assignee_class IN ('secretary_general','secretariat_entity');

-- Force profile of a document
SELECT action_category, action_force, count(*)
FROM digitallibrary.document_paragraphs
WHERE symbol_normalized = 'A/RES/79/1' GROUP BY 1,2 ORDER BY 1,2;
```

---

## 10. Where sources disagree, limitations, future work

**Source disagreements** (recorded, resolved as noted): the *also/further*
ordering (DGACM's own PDF wins: *also* 2nd, *further* 3rd); *decides* as
top-of-ladder vs category-jump (resolved by separating force from
bindingness); the contested grey-area verbs *calls upon / requests / warns*
(bindingness marked `contextual`/`hortatory` accordingly); "*demands* is
SC-only" (convention, not rule); and the fact that DGACM's own two lists and
UN.org's list don't fully coincide (no closed canon exists).

**Limitations / future work:**

1. **S/PRST bodies** need a bespoke sentence-initial path ("The Security
   Council *underlines*…").
2. **Mid-paragraph secondary mandates** ("… *and requests* the
   Secretary-General to …", 1,000+ occurrences) are not split into separate
   records; the legacy `mandate_index` did this. Needed if per-mandate rows
   are wanted (e.g., to fully supersede the LLM extraction for the
   mandate registry).
3. **Bindingness is presumptive** — a per-paragraph legal verdict would need
   organ + Chapter-VII marker + addressee combined (the ingredients are all
   stored; the join is deliberately left to consumers).
4. **Declarations/annexed instruments** parse with lower precision than
   standard resolutions.
5. **Terminology Bulletin 313** remains unverified against the primary
   source.
6. **Deliverable extraction** (what the assignee must produce — report,
   conference, operation) exists in the legacy data
   (`mandate_deliverables`) and is the natural next deterministic target,
   since it co-determines budget relevance.
