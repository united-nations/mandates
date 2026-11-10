# Operative-only assignee and action frequencies

As of 9 November 2026. All analysis stays within the mandate registry under the
PPB2027 lens. The agreed population is readable English fulltext of recent
registry documents (9 November 2021–9 November 2026) plus PPB2027-cited resolutions
of any age. The document sample is unchanged: 374 of 3,736 documents, selected
using the previously frozen seed. **Only `type = paragraph` and
`paragraph_type = operative` are analysis/model targets.** Preambular and neutral
paragraphs are excluded. Structural headings/issuer/operative parent information
can be context without becoming targets.

## Operative coverage

| Scope | Operative paragraphs | Documents with operative paragraphs |
|---|---:|---:|
| Whole PPB2027 registry | 327,189 | 20,330 |
| Agreed 3,736-document population | 81,235 | 3,292 |
| Frozen 374-document sample | 8,131 | 329 |

There are **8,131** operative targets in **329** of the sampled documents.
The other **45** sampled documents have no paragraphs currently classified
operative and produce no requests. They remain in the document sample; they are
not replaced with other documents. This preserves the sampling design.

## Assignees: original LLM categories

The old five labels form a flat enum. A useful display hierarchy is:

- UN actors: UN Organs; UN Secretariat; other UN System entities.
- Member States: named countries and country groups.
- Other actors: regional/international organizations, civil society, NGOs,
  private sector, academia and other named non-UN actors.

Keep the original five labels for the first pilot, with canonical actor identity
and quote evidence. Derive display grouping from a pinned vocabulary/registry
metadata where possible. The Secretary-General belongs under Secretariat but
can be a named child for filtering. Independent mechanisms/experts must not be
classified as Secretariat merely because an office supports them. Keep legitimate
non-UN actors distinct from unresolved normalization; “other” must not silently
mean “we could not identify the actor”.

Counts below are **assignee records**, potentially several per paragraph and
not mutually exclusive across paragraphs. The agreed-population legacy coverage
is 5,778 annotated operative paragraphs across 88 documents; only 12 sampled
documents have legacy operative annotations. This is sparse historical evidence,
not a representative estimate of actors across all registry mandates.

| Old assignee category | Registry records | Agreed-population records | Share of population assignee records | Sample records |
|---|---:|---:|---:|---:|
| Member States | 1,320 | 1,294 | 26.0% | 152 |
| UN Organs | 1,265 | 1,161 | 23.3% | 374 |
| UN Secretariat | 810 | 690 | 13.9% | 178 |
| UN System | 808 | 792 | 15.9% | 185 |
| other | 1,112 | 1,044 | 21.0% | 165 |

Totals: 5,315 registry records; 4,981 in the population; 1,054 in the sample.

The largest named population assignees are Member States (1,121 records), GA
(994), UN Secretary-General (529), UN System (235), and UN Development System
(216). Named results use the old model's normalization. Issuing bodies can be
implicit assignees of their own decisions; these counts are not all external
requests to those bodies. Multiple actors should remain linked to each activity.

## Deterministic assignee candidates

This is a different heuristic, not a mapping of the five old categories. It
classifies one extracted candidate span per paragraph with keyword rules, so it
can miss co-assignees or mistake an abstract object for an actor. Compare coverage
and distributions, not actor accuracy against the legacy table.

| Current parser class | Population operative paragraphs |
|---|---:|
| [none] | 47,586 |
| unclear | 10,023 |
| member_states | 9,666 |
| secretary-general | 5,609 |
| ngo_other | 1,966 |
| special_procedure | 1,868 |
| un_body | 1,862 |
| un_system | 1,601 |
| secretariat_entity | 1,054 |

Of 33,649 paragraphs with a parser-assignee class, 10,023 are `unclear` (29.8%).
This supports keeping the entity display disabled while testing the LLM pilot;
it does not establish that every remaining candidate is correct.

## Governing action categories

The denominator is **all operative paragraphs**, including those without a
recognized governing action. The deterministic layer supplies one governing
annotation per paragraph. These are not counts of every verb in the prose, nor
of distinct legal mandates or new/budget-bearing tasks. Stored annotations may
include an inherited action from a parent chapeau.

| Category | Registry paragraphs | Population paragraphs | Share of population operative paragraphs | Sample paragraphs | Inherited in population |
|---|---:|---:|---:|---:|---:|
| directive | 133,393 | 34,265 | 42.2% | 3,353 | 4,972 |
| reinforcing | 50,791 | 14,707 | 18.1% | 1,483 | 844 |
| observing | 40,840 | 11,669 | 14.4% | 1,148 | 371 |
| deciding | 42,911 | 8,959 | 11.0% | 696 | 2,435 |
| evaluative | 38,564 | 8,261 | 10.2% | 721 | 462 |
| [unclassified] | 20,690 | 3,374 | 4.2% | 730 | 0 |

**Directive is not synonymous with request.** Request itself labels **8,770**
population paragraphs (10.8% of all operative paragraphs, 25.6% of directive
paragraphs). Encourage, call upon, urge, invite and other directive verbs account
for the rest. Of the request-labelled paragraphs, **1,136 (13.0%)** inherit the
action from a parent; **7,634** are not marked inherited. Thus inheritance
increases the count but does not by itself explain why directive acts are common.
In the whole registry, request labels 44,653 paragraphs (13.6% of operative rows).
The random sample has 874 request-labelled paragraphs (10.7%).

The procedural request verb can introduce many different activities—reports,
meetings, implementation, resources—so verb frequencies should not define the
activity taxonomy. Annotation frequency also cannot show the strength, novelty
or budget implications of a request without analysing its content and context.

## Every normalized action in the agreed population

A paragraph may inherit its parent's label without containing that literal
verb. Surface forms are grouped by the parser's normalized field, falling back
to its literal action field only when no normalized value is present. Unknown
labels are retained. Percentages use the same 81,235-paragraph denominator.

| Category | Normalized action | Population paragraphs | Share | Inherited | Not inherited | Sample paragraphs |
|---|---|---:|---:|---:|---:|---:|
| directive | request | 8,770 | 10.80% | 1,136 | 7,634 | 874 |
| directive | encourage | 7,963 | 9.80% | 576 | 7,387 | 875 |
| directive | call upon | 7,519 | 9.26% | 1,685 | 5,834 | 707 |
| deciding | decide | 6,901 | 8.50% | 1,885 | 5,016 | 493 |
| directive | urge | 5,286 | 6.51% | 1,237 | 4,049 | 532 |
| evaluative | welcome | 4,116 | 5.07% | 130 | 3,986 | 407 |
| observing | recognize | 3,913 | 4.82% | 113 | 3,800 | 421 |
| observing | note | 3,857 | 4.75% | 116 | 3,741 | 346 |
| reinforcing | reaffirm | 3,747 | 4.61% | 204 | 3,543 | 394 |
| [unclassified] | [none] | 3,373 | 4.15% | 0 | 3,373 | 730 |
| reinforcing | recall | 3,018 | 3.72% | 179 | 2,839 | 252 |
| directive | invite | 2,725 | 3.35% | 174 | 2,551 | 233 |
| observing | take note | 2,613 | 3.22% | 62 | 2,551 | 243 |
| reinforcing | stress | 2,489 | 3.06% | 98 | 2,391 | 272 |
| reinforcing | reiterate | 2,024 | 2.49% | 193 | 1,831 | 216 |
| reinforcing | emphasize | 1,877 | 2.31% | 22 | 1,855 | 193 |
| evaluative | express concern | 1,225 | 1.51% | 100 | 1,125 | 109 |
| observing | acknowledge | 989 | 1.22% | 41 | 948 | 114 |
| evaluative | condemn | 887 | 1.09% | 76 | 811 | 64 |
| reinforcing | underline | 704 | 0.87% | 19 | 685 | 63 |
| directive | call for | 689 | 0.85% | 45 | 644 | 45 |
| evaluative | appreciate | 598 | 0.74% | 5 | 593 | 42 |
| deciding | endorse | 485 | 0.60% | 9 | 476 | 31 |
| deciding | authorize | 438 | 0.54% | 268 | 170 | 23 |
| evaluative | commend | 428 | 0.53% | 14 | 414 | 48 |
| reinforcing | affirm | 419 | 0.52% | 108 | 311 | 33 |
| directive | recommend | 411 | 0.51% | 69 | 342 | 31 |
| directive | demand | 366 | 0.45% | 25 | 341 | 17 |
| evaluative | express | 339 | 0.42% | 85 | 254 | 14 |
| reinforcing | underscore | 317 | 0.39% | 15 | 302 | 50 |
| evaluative | support | 253 | 0.31% | 48 | 205 | 12 |
| directive | call on | 232 | 0.29% | 15 | 217 | 14 |
| deciding | approve | 221 | 0.27% | 11 | 210 | 32 |
| deciding | adopt | 187 | 0.23% | 58 | 129 | 13 |
| evaluative | deplore | 155 | 0.19% | 0 | 155 | 11 |
| observing | consider | 154 | 0.19% | 39 | 115 | 11 |
| directive | direct | 153 | 0.19% | 10 | 143 | 12 |
| deciding | resolve | 141 | 0.17% | 68 | 73 | 27 |
| evaluative | look forward | 119 | 0.15% | 4 | 115 | 9 |
| directive | appeal | 111 | 0.14% | 0 | 111 | 8 |
| deciding | agree | 105 | 0.13% | 14 | 91 | 7 |
| reinforcing | highlight | 101 | 0.12% | 6 | 95 | 9 |
| deciding | commit | 97 | 0.12% | 24 | 73 | 35 |
| deciding | declare | 92 | 0.11% | 45 | 47 | 3 |
| observing | confirm | 78 | 0.10% | 0 | 78 | 5 |
| deciding | continue | 64 | 0.08% | 5 | 59 | 6 |
| observing | take into account | 58 | 0.07% | 0 | 58 | 7 |
| deciding | determine | 55 | 0.07% | 25 | 30 | 4 |
| evaluative | regret | 52 | 0.06% | 0 | 52 | 1 |
| evaluative | be concerned | 46 | 0.06% | 0 | 46 | 0 |
| deciding | establish | 43 | 0.05% | 23 | 20 | 5 |
| deciding | recommit | 39 | 0.05% | 0 | 39 | 8 |
| deciding | renew | 37 | 0.05% | 0 | 37 | 5 |
| directive | remind | 35 | 0.04% | 0 | 35 | 4 |
| deciding | appropriate | 27 | 0.03% | 0 | 27 | 4 |
| evaluative | reject | 21 | 0.03% | 0 | 21 | 3 |
| evaluative | congratulate | 17 | 0.02% | 0 | 17 | 1 |
| deciding | proclaim | 16 | 0.02% | 0 | 16 | 0 |
| deciding | accept | 6 | 0.01% | 0 | 6 | 0 |
| observing | realize | 6 | 0.01% | 0 | 6 | 1 |
| reinforcing | reconfirm | 6 | 0.01% | 0 | 6 | 1 |
| deciding | pledge | 4 | 0.00% | 0 | 4 | 0 |
| reinforcing | remain | 4 | 0.00% | 0 | 4 | 0 |
| evaluative | denounce | 3 | 0.00% | 0 | 3 | 0 |
| directive | suggest | 2 | 0.00% | 0 | 2 | 0 |
| deciding | extend | 1 | 0.00% | 0 | 1 | 0 |
| directive | ask | 1 | 0.00% | 0 | 1 | 0 |
| directive | discourage | 1 | 0.00% | 0 | 1 | 0 |
| directive | propose | 1 | 0.00% | 0 | 1 | 1 |
| evaluative | be alarmed | 1 | 0.00% | 0 | 1 | 0 |
| evaluative | trust | 1 | 0.00% | 0 | 1 | 0 |
| observing | bear in mind | 1 | 0.00% | 0 | 1 | 0 |
| reinforcing | draw attention | 1 | 0.00% | 0 | 1 | 0 |
| [unclassified] | acting under chapter vii of the charter of the united nations: | 1 | 0.00% | 0 | 1 | 0 |

## Reproduction and limits

- `website/src/lib/data/paragraph-taxonomy-audit.ts` contains the exact read-only
  SQL with registry membership and operative-only predicates.
- `website/scripts/audit-operative-paragraphs.ts` reads the frozen document
  manifest, asserts unchanged sample identity, refreshes counts and checks that
  current sample operative counts reconcile with the frozen source snapshot.
- `data/references/paragraph-taxonomy-audit-20261109.json` stores all aggregated
  frequencies and distinct paragraph/document coverage by scope.
- `.cache/paragraph-analysis-20261109/sample-operative-targets.json` freezes the
  actual target inputs; the original full-context source snapshot is preserved.
- No model calls, DB writes or entity-display changes were made by this audit.
- Legacy and current corpora have different segmentation and coverage. Their
  counts are not a model-quality comparison; corpus-level frequency does not
  validate individual classifications. No preambular frequencies are used here.
