# Paragraph extraction: first-pilot design

Working branch: `tasks` (renamed from `codex/paragraph-extraction-taxonomy`). Existing uncommitted work
was carried onto the branch without committing unrelated edits.

## Agreed analysis population and sample

As of 9 November 2026, restrict to the mandate registry under the PPB2027 lens.
Include readable English fulltexts of registry documents published from
9 November 2021 through 9 November 2026, plus PPB2027-cited resolutions of any age.
Recent documents may be any registry document type. Older cited additions must
have registry type `Resolutions`. Programme-budget citations are scoped through
`budget_documents.doc_type = ppb`; peacekeeping and plan-outline citations are
not added as a separate older cohort. All symbols are normalized/deduplicated.

This population has **3,736 documents**, versus 3,845 in the prior cost scenario
that included older cited documents of every type. The sample is **374 documents**
(10.01%), selected without replacement by seeded SHA-256 ranking of normalized
symbols. It is a simple random document sample, not a stratified sample or a
10% paragraph/token sample. Seed: `mandate-registry-paragraph-analysis-v1-20261109`.
The frozen source snapshot contains **18,700 content elements**. The initial
stored flags selected **8,131 operative paragraphs in 329 documents**. Source-text
review of all 45 zero-target documents recovered **168 logical operative targets**,
including decisions, presidential statements and the declaration in A/RES/48/104.
The executed pilot therefore has **8,299 logical targets across the same 374 documents**.
True preambles, article headings, footnotes and decision membership rosters are
excluded. Split source fragments are grouped where necessary. No production
paragraph flags were changed.

Manifest: `data/references/paragraph-analysis-sample-20261109.json`.
Reviewed additions: `data/references/paragraph-operative-eligibility-overrides-20261109.json`.
Population and paragraph snapshot: `.cache/paragraph-analysis-20261109/`.
The census frequencies below still describe stored operative flags; the reviewed
pilot additions are a separate eligibility layer and do not change those counts.

## Pilot execution, 9 November 2026

GPT-6 Luna deployment preflight succeeded with `reasoning.effort=none`.
The Azure deployment uses GlobalStandard; Batch submission was rejected with
`invalid_deployment_type` (GlobalBatch/DataZoneBatch required). The authorized
sample is running through standard Responses requests instead.

Implemented the shortened prompt, strict activity hierarchy, five actor types,
17 output kinds, exact evidence validation and frozen context. No verbs or
regenerated fulltexts are requested. The first diagnostic version validated
94/100 outputs; fixes included enforcing type/subtype combinations in schema
and reading final-answer response messages separately from commentary.
The revised check validated **100/100**, with **zero reasoning tokens**.
It used 534,156 input tokens (493,822 cached) and 23,372 output tokens.

This is an exploratory pilot, not a production-quality sign-off. Source review
found false negatives, inconsistent canonical actor names and classifications,
non-organization mentions, and uncertain activity splitting. The same diagnostic
cases informed prompt revisions; 100/100 is a technical validation count, not a
held-out accuracy score. No claim of equivalence to the original model is made.
See `pilot-smoke-review-20261109.json` for review IDs and specific known issues.

The 100 revised responses are reused; **8,199 additional requests** were started.
Run state, raw replies, validated outputs and quarantined errors are under
`.cache/paragraph-activity-pilot-v3-20261109/`. No production import is authorized
by this exploratory review. See `pilot-run-20261109.md` for reproduction and status.

## What is actually stored — operative paragraphs only

The legacy classifier has 17 flat `deliverable_type` values. The three parent
families below are source-code comments, not stored hierarchy fields. Counts are
annotation records, not unique activities, paragraphs or documents; one paragraph
may contain multiple records. Scope is always the mandate registry.

Legacy operative coverage is 72,038 stored paragraphs across 2,343 registry
documents, with nonempty annotations in **6,389 paragraphs across 91 documents**.
Within the agreed population, 5,778 operative paragraphs across 88 documents
are annotated; in the sample, 1,384 paragraphs across 12 documents are annotated.
These historical annotations are not representative registry frequencies.
Digital Library and legacy segmentation differ; compare by verified source text,
not old array positions mapped onto current UUIDs.

| Source-code family | Deliverable type | Registry records | Agreed population | Random sample |
|---|---|---:|---:|---:|
| Documentation & communication | report | 323 | 282 | 89 |
| Documentation & communication | briefing | 22 | 20 | 4 |
| Documentation & communication | update | 66 | 42 | 10 |
| Documentation & communication | information sharing | 525 | 493 | 86 |
| Documentation & communication | analysis | 497 | 461 | 96 |
| Documentation & communication | recommendations | 112 | 107 | 32 |
| Documentation & communication | meeting | 330 | 287 | 51 |
| Documentation & communication | review | 237 | 222 | 73 |
| Policy & legal | legislation | 173 | 170 | 35 |
| Policy & legal | policy | 1,999 | 1,891 | 570 |
| Policy & legal | strategy | 403 | 373 | 104 |
| Policy & legal | standards | 307 | 291 | 72 |
| Resources & support | financial resources | 819 | 739 | 164 |
| Resources & support | capacity building | 652 | 616 | 161 |
| Resources & support | technical assistance | 315 | 301 | 65 |
| Resources & support | humanitarian assistance | 147 | 141 | 20 |
| Resources & support | infrastructure | 414 | 388 | 126 |

Documentation & communication: **2,112 registry records**, 1,914 in the population.

Policy & legal: **2,882 registry records**, 2,725 in the population.

Resources & support: **2,347 registry records**, 2,185 in the population.

The operative-only registry total is **7,341 deliverable records**; the population
has 6,824, and the sample 1,758. Previous all-paragraph counts are superseded for
this pilot. The earlier five service labels in the other extractor are a separate
taxonomy and do not occur in `mandates.mandate_deliverables`.

The separate five-category action taxonomy is restored in the dropdown.
[Complete operative-only actor, category and verb frequencies](operative-assignees-and-action-frequencies.md)
include inherited-versus-own labels, unclassified rows and coverage denominators.
No preambular frequencies contribute to these analysis tables.

## Recommended taxonomy direction

Use **activity type/subtype**, **implementing actor** and **institutional target**
as distinct fields. An actor can be tasked with reporting, substantive work or
an institutional review; a task can have both UN and Member State implementers.
Putting actors only under Substantive creates duplication and loses joint work.
The UI can derive “for the UN system” and “for Member States” under Substantive
from actor links while keeping the stored classifications orthogonal.

Activity families adopted as the first-pilot baseline:

| Activity type | Candidate subtypes | Boundary |
|---|---|---|
| Substantive implementation | policy/normative action; technical assistance; capacity building; operational/humanitarian delivery | Concrete implementation action; general aspirations do not automatically create a task. |
| Reporting | written report; oral briefing; update; requested assessment/recommendations | Requested reporting output; merely noting an existing report creates no new reporting activity. |
| Deliberation | meeting; dialogue/consultation; conference; agenda consideration | Convening/considering/participating are linked to their assigned actors; preparing a report for a meeting is a separate activity. |
| Institutional | establishment; renewal/extension; amendment; termination | Name the mission/body/mechanism or mandate affected. A reporting deadline extension is not a mandate renewal. |
| Resources and support | funding; personnel; facilities/infrastructure | Proposed extra family: funding a country programme or humanitarian operation is not necessarily institutional change. |
| Mandate review | explicit review/evaluation of a mandate; consolidation/rationalization review | Require an explicit mandate as review target; generic programme review or monitoring is insufficient. |

Keep the 17 old deliverable types as `deliverables[].kind` initially, when there
is an actual concrete output, so the activity taxonomy and output kind serve
different purposes. An institutional decision can have `deliverables: []`.
Decide whether the old `policy` category is too broad before keeping it unchanged:
it is the largest old operative label (1,999 registry records), but that is not a reason to preserve
its definition. A non-task paragraph returns `activities: []`.

`institutional_target` identifies a body, mission, mechanism or mandate, rather
than treating the affected mechanism as an implementer. Resource provision can
additionally link to that target when it funds/supports the institution. Use a
many-activity structure: one paragraph can both renew a mission and request a
report, without forcing a single top-level label on the whole paragraph.

## First-pilot output contract

Keep the old actor quote, normalization, type and deliverable quote fields.
Replace the old per-verb mandate bundle with per-activity records. Remove
`action_verb_quote`, `action_verb_normalized`, `action_verb_type` and
`textWithHighlights` from model output. Verbs, classifications and inherited
verb relationships are supplied/computed deterministically and stored separately.
Remove verb-lexicon, verb-taxonomy and highlighting instructions from the prompt;
only include deterministic action annotations as contextual input if useful.

```json
{
  "activities": [
    {
      "activity_type": "reporting",
      "activity_subtype": "written_report",
      "evidence": [
        {"paragraph_ref": "p17", "quote": "to submit an annual report", "occurrence": 0}
      ],
      "assignees": [
        {
          "normalized_name": "UN Secretary-General",
          "entity_type": "un_secretariat",
          "basis": "explicit",
          "evidence": {"paragraph_ref": "p17", "quote": "Secretary-General", "occurrence": 0}
        }
      ],
      "deliverables": [
        {"kind": "report", "quote": "annual report", "description": "Annual implementation report"}
      ],
      "institutional_target": null
    }
  ],
  "mentioned_entities": [],
  "uncertainties": []
}
```

The example illustrates the accepted pilot design; provider validation and the
final shortened prompt must be implemented before submission. The caller
attaches document symbol, paragraph UUID, source hash and model/prompt versions;
those do not need to be repeated by the model in every response. `paragraph_ref`
identifies the target paragraph or a provided parent/context paragraph. `basis`
is explicit, inherited or implicit; implicit assignment to the issuing body
uses null quote evidence and a stated basis. Never highlight the pronoun “we”.
Referenced actors may be normalized against a pinned registry vocabulary, with
an explicit other/unresolved path. Mentioned-entity records use the same evidence
and normalization fields without assigning an implementation duty.

Validate exact source quotes and repeated-quote occurrence locally, derive offsets
and highlights in code, and reject unsupported evidence or context references.
Do not regenerate fulltext. Validate parent/subtype compatibility locally. Keep
uncertainty on the activity/field rather than pretending a numeric confidence
score has been calibrated. Reuse hierarchy/context by correct nearest parent
within section/annex/text boundaries, fixing the old all-earlier-parent loop.

Pilot defaults:

1. Six activity families, with Resources and support separate from Institutional.
2. Retain the 17 old output kinds initially; implementing actors remain separate
   from activity classification and support multiple assignees.
3. Start with concrete assignments/outputs, with reviewable uncertainties for
   broad/ambiguous commitments rather than automatically treating aspirations as tasks.
4. Analyse operative paragraphs only. Do not redraw the 374-document sample;
   documents with no operative targets generate no requests.
5. Remove verb extraction instructions and all verb output fields. Reuse the
   deterministic annotations; do not generate a highlighted copy of fulltext.

The assignee-side baseline remains UN Organs, UN Secretariat, UN System,
Member States and other, with named actor identities and evidence. A display
parent “UN actors” can group the first three; “UN System” should be labelled as
other UN-system entities when shown alongside Secretariat to avoid apparent
set overlap. Unresolved normalization is not synonymous with a legitimate
non-UN “other” actor.

## HRC Mapper comparison

The supplied screenshots show Reporting, Dialogue or Meeting, Mechanism,
Technical Assistance & Capacity Building, Miscellaneous and Mandate Renewal.
The public application confirms six top-level activity labels in its detailed
activity data. Its adopted-text facet exposes five top-level labels (renewal is
handled differently there), so screenshots from different views should not be
assumed to represent one consistent schema.

The public subtypes include Mandate Establishment, Mandate Change, Mandate
Extension, Resource Provision, Review, Annual Report and Oral Update. This
supports the broad direction of the proposed categories. However, “Mechanism”
identifies the object affected, “Mandate Renewal” a lifecycle operation, and
“Technical Assistance” a delivery mode: importing them as peer categories would
mix dimensions. The registry spans GA/SC/ECOSOC as well as HRC; substantive
implementation and resourcing need explicit homes beyond HRC reporting and
mechanism workflows. Avoid an automatic Miscellaneous bucket without evidence
and a reviewable reason.

HRC page counts in the screenshots are view/filter-specific and are not used as
registry frequencies. No HRC classifications have been imported into our DB.

Sources and reproduction:

- [Original LLM classifier](https://github.com/UN-EOSG-Analytics/un80-docs-processing/blob/a6c56cb6b8ddeebf64b93faa3392c145e3da9592/src/mandates/classification/classify_paragraphs.py)
- [HRC Mapper](https://hrcmap.ohchr.org/)
- [Public HRC facet definitions](https://hrcmap.ohchr.org/data/facets.js)
- `website/src/lib/data/paragraph-taxonomy-audit.ts`: exact read-only queries,
  scoped through the website's shared registry predicate.
- `website/scripts/prepare-paragraph-analysis.ts`: seeded sample and snapshot.
- `data/references/paragraph-taxonomy-audit-20261109.json`: executed counts,
  including coverage, entity types, verbs and distinct paragraph/document counts.

## Verification

The four action-filter helper tests pass, including category/leaf selection,
paragraph-level deduplication, zero-count options and inherited actions.
TypeScript checks pass; full ESLint has no errors (existing warnings plus the
preparation script’s console output). A browser check on A/RES/70/1 verified all
five taxonomy groups, Directive category selection, category search with child
verbs retained, and no page errors. The selected category showed four paragraphs.
Sample checks verify eligibility, unique document selection, population
membership and source-element reconciliation.
