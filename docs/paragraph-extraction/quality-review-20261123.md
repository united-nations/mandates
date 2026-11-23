# Highlight and extraction review — 23 November 2026

The screenshot is A/RES/79/223, *Women in development*, OP38–41. There are both
presentation and extraction problems. Colour overlaps are not independent
corroboration: the old renderer paints full evidence and chooses assignee green
before output amber before task blue. The same words often have two roles.

## Colours and immediate interface change

Blue **text** marks deterministic action verbs. Blue **background** denotes a task;
green background an assigned actor; amber background a deliverable. These are
semantic roles, not confidence levels or the six task categories.

The interface now offers **Tasks / Assignees / Outputs / None**. Tasks is the
default. One semantic layer is displayed at a time, with its own tooltips, while
verb text remains independent. This removes competing background colours without
changing source text, filters, task counts or the frozen underlying annotations.
Newer task summaries can appear in task tooltips. Long old evidence spans remain
long until those records are re-extracted; this UI change does not correct their
classifications by itself.

## Manual pass: 20 published pilot passages

Reviewed source text, relevant governing context and original stored annotations,
not just coloured screenshots. IDs below map to the committed cases and original
annotations in `data/references/paragraph-quality-20261123/`.

| ID / source | Finding |
| --- | --- |
| d01 A/RES/79/223 OP38 | False funding task from “stresses the importance”. Training, networking and beneficiary participation were split into separate categories; the government is not itself assigned to participate in a forum. Task and output quotes duplicate the same words. |
| d02 same, OP39 | Most of the long actor enumeration really is addressed. Do not delete legitimate assignees to make it prettier. “Other intergovernmental bodies” is not necessarily UN organs; broad financial institutions are not automatically IMF/World Bank. The output quote includes content/qualifiers rather than a compact noun phrase. |
| d03 same, OP40 | Several genuine tasks and different actors, plus unassigned encouragements and an issuing-body commitment. Broad spans paint almost the whole paragraph. “Consider” must remain conditional. A body's self-commitment must not silently turn it into an implementation assignee. Do not force every complex paragraph into one task. |
| d04 same, OP41 | Several genuine State assignments, interspersed with acknowledgments and a less clearly assigned capacity encouragement. Beneficiaries, financial-product examples and “regardless of…” qualifications need not all be painted. |
| d05 A/HRC/RES/62/12 OP22 | Actor includes a very long eligibility condition. Keep “Governments” as the actor head and preserve the restrictive condition separately. |
| d06 A/RES/80/105 OP17 | Secretary-General and his appositive President pro tempore title incorrectly become two actors/types. |
| d07 A/RES/64/289 OP29 | Importance of broadening the donor base becomes an unassigned funding task. General importance language is not an allocation. |
| d08 A/RES/60/1 OP148 | Broad need for adequate UN resources becomes funding plus a financial output without a concrete assignment. |
| d09 S/RES/2349(2017) OP16 | Administrative procedures facilitating humanitarian access are split off as another delivery task. The concrete access requirement and applicable condition must remain. |
| d10 A/HRC/RES/45/2 OP15 | Engagement supporting technical assistance is classified separately as dialogue; oral update is labelled unspecified update. Written report is a genuinely separate result. |
| d11 E/RES/2026/15 OP18(a) | Inherited UNODC assignment and biennial dissemination are plausible, but parent resource/review conditions need structured retention, rather than a whole-parent actor quote. |
| d12 A/RES/48/104 Article4(h) | Genuine budget-resource assignment with an inherited State actor. Whole-child output quote masks the task; an inherited actor need not have a green span in the child. |
| d13 A/RES/78/245 OP132 | Applying translation quality standards and reporting are two legitimate results. Long verification support is unnecessary display text. |
| d14 A/RES/78/245 OP18 | Standalone SG consultation with Member States is a valid deliberation task; consulted States are not automatically co-assignees. |
| d15 A/RES/72/266B OP7 | Departmental reorganisation correctly affects institutions; the issuing body's decision role should be distinct from implementation. |
| d16 A/RES/60/1 OP176 | Review of Military Staff Committee composition, mandate and working methods genuinely concerns mandate architecture. Keep this positive control. |
| d17 A/RES/80/245 OP1(b) | Court pensions/expenses are a genuine adopted financial provision, despite nominal child wording. Preserve the amount limit and governing decision. |
| d18 A/RES/78/184 OP14 | “Those who participated” are tasked to implement commitments, but their institutional composition is unresolved. Avoid guessing UN/State membership. |
| d19 A/RES/79/281 OP12 | JIU review of implemented recommendations is ordinary information/implementation work, not automatically mandate review. |
| d20 A/RES/60/1 OP162(c) | Nominal management-reform proposal is governed by a parent request. Keep the SG/report linkage without painting the whole proposal paragraph. |

The additional eight category controls were selected by deterministic hash within
categories, rather than selected because they were wrong. This is a diagnostic
review, not a representative error-rate estimate.

## Prompt and schema changes

`data-processing/evals/paragraph_entities/quality/prompt-v6.txt` gives explicit
family and subtype definitions, exclusions and boundary rules. It preserves the
existing six-family hierarchy. The draft v5 and its exact configuration are
retained for provenance.

- A resource task requires actual provision/allocation or a financial decision;
  importance language, financial inclusion or access to banking is insufficient.
- Methods, examples and beneficiary participation do not automatically create
  extra tasks/categories. Use one primary category per independent result.
- Reporting is an output for consideration/oversight; ordinary information work
  is distinguished from reporting. Formal proposals/work programmes go under
  recommendations; oral updates under oral briefings.
- Deliberation requires the assignee's own deliberative operation. Institutional
  tasks operate on an entity/mission/mechanism/mandate. Mandate review concerns
  mandate architecture, not any implementation review.
- Preserve status `new` versus `reaffirmed`, with historical references and
  possibilities distinguished from concrete assignments. “New” does not assert
  novelty across the history of UN documents.
- Separate implementer, decision-maker and commitment-maker roles. Keep mixed
  actor types nullable; distinguish appositions from actor lists.
- Keep full verification evidence separately from display. At most two task
  display phrases, each at most 32 words; output display at most 20 words.
  Preserve negation/“consider”; do not highlight a negative eligibility clause
  as the requested action. Empty display is preferable to a misleading span.
- Preserve conditions/methods separately. A report section can reference its
  inherited parent output, without painting nonexistent parent text in the child.
- The pure `display.py` adapter uses only display phrases, includes short task
  summaries, excludes decision/commitment actors from implementation highlights,
  deduplicates repeated actor spans and converts source offsets to UTF-16.

## Development findings and fresh test

Draft v5 was run on the 20 reviewed passages. Its first OP38 output still painted
four subsidiary methods, and it repeated the SG apposition error. Final v6 caps
display phrases and adds the SG example from development only. The final prompt
and schema were frozen before opening the fresh test sources; source-only labels
were recorded before inference. No final-test example was then added to the
prompt. Future revisions must use a new final test.

Fresh test: 14 passages in seven resolutions, including one seeded and one long
eligible paragraph per document. Exclude all prior pilot/reviewed document series,
previous experiment pools and source passages with >0.7 word-five-gram Jaccard
similarity to the earlier sample. The eight-document draw had no eligible target
in A/RES/33/141; it was not replaced. All inference remains inside the frozen
registry recent/PPB2027-cited-resolution scope and operative-only boundary.

| Configuration | Source/schema accepted | Median display words | Frozen coarse passage checks |
| --- | ---: | ---: | ---: |
| Original prompt, Luna medium | 14/14 | 20.5 | 13/14 |
| v6, Luna medium | 14/14 | 8 | 12/14 |
| v6, Sol6.1 medium | 14/14 | 8 | 11/14 |

Coarse checks test families, implementation-type unions and task-count ranges;
**these numbers do not demonstrate an overall semantic-accuracy improvement**.
All labels are a single source-only agent rubric, not an independently adjudicated
gold standard. Some frozen expectations were too narrow: SG re-establishing an
expert group can reasonably be institutional rather than substantive; dedicated
budget-funded capacity is a staffing/capacity boundary. Original labels/scores are
preserved rather than silently adjusted after seeing predictions.

Residual findings: Luna invents an HRC implementation assignee for an interactive
dialogue, and treats an intention to review as a self-commitment/review task.
Sol differs on legal affirmations of existing sanctions. In development, Luna
still sometimes quotes the full governing parent as actor evidence and misses
structured inherited resource conditions. More precise definitions have not
eliminated these model/schema-boundary issues.

The screenshot development rerun does improve several concrete issues: OP38 is
one capacity-building task without the funding/participation false positives;
OP39 stops assuming generic intergovernmental bodies are UN organs; SG's two
roles become one actor; explicit budgeting remains a task. OP40 remains complex
(nine candidate tasks versus eight before), so this is not an arbitrary instruction
to reduce task counts. Development fixes are not held-out accuracy evidence.

Azure lists Luna and Sol6.1, but not Sol6.2. No model substitution is hidden.
70 new requests cost **$0.284026** at uncached reference rates, including failures
and reasoning; conservative cumulative cap accounting is **$2.423497 of $25**,
including the prior experiment. No requests remain pending.

## Integration and verification

The one-layer interface change is ready on `tasks`. The full 374-document dataset
and analytics are **not** overwritten by the experimental schema or a mixed
hand-corrected subset. The v6 prompt/schema/adapter are explicit candidates for a
future complete rerun; the old importer cannot silently publish them.

TypeScript, ESLint (six existing warnings), source/display/schema safeguards and
offline score reproduction pass. Chromium checked the actual paragraph components
with the four screenshot source records and compiled project Tailwind CSS, at
1100px and 390px: all four modes, preserved text, keyboard switching and no runtime
errors. The complete Next route could not be checked because the isolated dev
build hit disk quota; no route/DB behavior was changed. A second fixture used the
four v6 candidate display overlays. These screenshots are **candidate fixtures**,
not evidence of a full website re-extraction:

- [Candidate task highlights](quality-20261123-candidate-tasks.png)
- [Candidate outputs on mobile](quality-20261123-candidate-mobile.png)

Offline reproduction:

```bash
python data-processing/evals/paragraph_entities/quality/score.py
python -m unittest discover -s data-processing/evals/paragraph_entities/quality -p test_schema.py
```
