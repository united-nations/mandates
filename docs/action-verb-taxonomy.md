# Action verbs in UN resolutions: taxonomy and deterministic extraction

*July 2026. Research + implementation report. The extraction code lives in the
digitallibrary.unfck.org repo (`python/fulltext_verbs.py`, branch
`feature/fulltexts`); this document records the taxonomy, the evidence, and the
evaluation against our previous LLM-based extraction.*

## Question

Preambular and operative paragraphs of UN resolutions use a controlled grammar
opening with specific verbs ("Recalling…", "Requests…", "Decides…"). We
previously extracted these with an LLM (gpt-4.1, the `mandates.paragraph_mandates`
data: 13,310 instances, 71 normalized verbs, 5 categories). Can this be done
deterministically, and what is the right taxonomy?

**Answer: yes.** A closed lexicon of ~82 verbs covers 94–98% of paragraphs; the
remainder is structural (sub-items inheriting a chapeau verb), not lexical.
A deterministic parser reaches 97.5% verb agreement and 98.3% category agreement
with the LLM output — and where they disagree, manual inspection shows the
error is usually on the LLM side.

## Sources

- **DGACM, "Editing of resolutions at the United Nations"** — the UN's own
  editing service's delegate guide, with closed lists of common preambular and
  operative verbs. Most authoritative available list. (The canonical source
  everyone cites, Terminology Bulletin 313 of 1978, ST/CS/SER.F/313, is not
  online — a Dag Hammarskjöld Library request would settle a few edge cases.)
- **UN.org "Drafting resolutions"** guidance (36 preambular + 34 operative
  items, with an explicit strength note).
- **ICJ, *Namibia* advisory opinion (1971)** + M. Wood (MPEPIL) on Security
  Council language: bindingness is *not* verb-deterministic — it requires
  reading "the language … in the light of all circumstances" — but "decides",
  especially "acting under Chapter VII", is the binding marker, while
  calls upon / urges / invites are presumptively hortatory.
- **GA Rules of Procedure rule 153 / ECOSOC rule 31** (programme budget
  implications) and DGACM reporting-cycle practice for the budget dimension.
- **UN80 mandate review (2025–26)** definition: a mandate is "a request or
  directive for action set out in the UN Charter, a resolution or decision by
  a UN intergovernmental organ" — i.e. the *directive/deciding* classes are
  what generate mandates.
- **Empirically**: our fulltext corpus (39.6k operative + 28.7k preambular
  parsed paragraphs across 1,600+ documents at analysis time) and the legacy
  LLM extraction as ground truth.

## The taxonomy: five categories, five dimensions

The five-category spine (from last year's draft list) survives scrutiny — it
matches Searle's illocutionary classes and the LLM's own labels — but it is
only ONE dimension. A verb instance carries five:

| Dimension | Values | Example contrast |
|---|---|---|
| **category** | observing, reinforcing, evaluative, deciding, directive | *notes* vs *recalls* vs *welcomes* vs *decides* vs *requests* |
| **force** | 0–5 rank within category | *invites* ≈ *encourages* < *recommends* ≈ *requests* < *calls upon* < *urges* < *demands* |
| **sentiment** | −1 / 0 / +1 | *commends, welcomes* (+) vs *condemns, deplores, regrets* (−) |
| **bindingness** | binding / hortatory / contextual | *decides* (binding, esp. Ch. VII) vs *calls upon* (hortatory) vs *requests* (contextual) |
| **addressee class** | secretary-general, secretariat entity, member states, UN body, special procedure, other, — | "*Requests* the Secretary-General" = executable mandate; "*Requests* Member States" ≈ exhortation |

Plus a boolean **budget-relevance** flag: *requests* (+ report/conference
deliverables), *appropriates*, *approves*, *authorizes*, *establishes* are the
verbs that carry budgetary consequence; the phrases "within existing resources" /
"from extrabudgetary resources" are absorption markers (108 occurrences in
corpus); "programme budget implications" itself almost never appears in
operative text (4 hits) — budget relevance must be inferred from
verb + deliverable + addressee, which is exactly what rule 153 practice does.

### Corrections to the draft list

1. **"Reinforcing" is an operator, not only a category.** *Also/Further/Once
   again/Reiterates* layer repetition on top of any category (3,116 "Also"
   openings corpus-wide). The DGACM editing rules require *reaffirm/recall* to
   point at actual prior text — these are anaphoric verbs, distinct from mere
   emphasis (*stresses, underlines*). We keep the category for legacy
   compatibility but record repetition separately as a modifier.
2. **Missing mandate-bearing verbs**: *authorizes* (the prime SC/budget verb),
   *approves*, *appropriates*, *directs*, *proclaims*, *endorses* — all added.
3. **No polarity in the draft**: *welcomes* and *condemns* were both just
   "evaluative"; sentiment is now explicit (and HRC texts are measurably
   condemnation-heavy: *strongly condemns* accounts for 144 of 315 "Strongly"
   openings).
4. **Carrier constructions** need object-driven normalization: *expresses …
   concern* (1,754) vs *expresses … appreciation* (356), *takes note with
   appreciation* — the verb alone is meaningless; the object decides the
   normalized verb and sentiment.
5. **Actor dimension confirmed empirically**: *requests* targets the
   Secretary-General/Secretariat 520:7 over Member States; *calls upon/urges*
   target states. Same verb, different meaning — the addressee class is a
   first-class output.

## Deterministic parser: design and evaluation

Design (see `fulltext_verbs.py`): declarative 82-entry lexicon (235 surface
forms — operative 3rd person, preambular participle, imperative and
"We"-declaration forms); longest-match with adverb/modifier stripping;
compound handling (*welcomes and endorses*); **chapeau inheritance** — the
whole "long tail" of verb-less paragraphs turned out to be sub-items
(`(a) To strengthen…`) inheriting their chapeau's verb, which the fulltext
parser's hierarchy already identifies; assignee extraction for directive verbs
(the "to"-infinitive anchor exists in 95.8% of directive paragraphs);
"Acting under Chapter VII" is recognized as a context marker, not a verb.

Evaluation against the legacy LLM extraction (56 overlap documents, 4,566
text-matched paragraph pairs, 5 iteration rounds):

| Metric | Result |
|---|---|
| Operative coverage | **97.6%** (target ≥93%) |
| Preambular coverage | 94.9% (misses are correctly-None non-verb lines) |
| Normalized-verb agreement | **97.5%** |
| Category agreement | **98.3%** |
| Assignee head-noun agreement | 82.9% (ceiling set by legacy picking one member of coordinated lists) |

Disagreement audit: dominated by legacy inconsistency (*note*↔*take note*,
*recognize* typed two ways) and by cases where the deterministic parser is
*more* correct — e.g. in A/RES/79/1 (Pact for the Future) the LLM blanket-
labeled every sub-item "decide" while we extract each bullet's own verb.
Genuine parser bugs found in the audit: ~7 instances out of 4,566.

**Verdict: reliable — integrated.** Migration 004 in the digitallibrary repo
adds `action_verb`, `action_verb_normalized`, `action_category`,
`action_force`, `action_sentiment`, `action_bindingness`,
`action_budget_relevant`, `action_modifiers`, `assignee`, `assignee_head_noun`,
`assignee_class`, `action_inherited`, `action_context_marker` to
`digitallibrary.document_paragraphs`, populated by the semantic parser during
the fulltext load.

## Limitations and follow-ups

- **PRSTs**: presidential statements are narrative prose without the
  verb-initial grammar — excluded by design; a bespoke path (sentence-initial
  "The Security Council <verbs>…") is a follow-up.
- **Mid-paragraph secondary mandates** ("…*and requests* the Secretary-General
  to…") are not yet split into separate records; the legacy `mandate_index`
  did this. Follow-up if per-mandate rows are needed.
- **Declarations / annexed instruments** (Pact-style "We decide to:" chapeaux,
  rules of procedure) parse with lower precision than standard resolutions.
- Terminology Bulletin 313 remains unverified against the primary source.
