# Prompt/schema experiment — 10 November 2026

GPT-6.1 Sol with **medium reasoning** was the strongest configuration in this small
held-out comparison. The revised Luna prompt improves display spans and fixes
known development defects, but does not clearly improve held-out semantic checks
at medium reasoning. Higher reasoning is not a substitute for clear scope and
category definitions. The candidate remains experimental; the website still uses
the previously published medium pilot.

Total: **372 Azure Responses requests**, 253 GPT-6 Luna and 119 GPT-6.1 Sol.
API-reported tokens imply **$1.654772 at uncached list prices**. The shared ledger's
25% safety allowance gives **$2.068465**, versus the authorized **$25 cap**.
No requests remain in flight. This is a conservative usage estimate, not an Azure
invoice; cached-input discounts are ignored. Failed validations are included.

## Separation and reference labels

The population remains the frozen Mandate Registry cohort: recent readable English
fulltexts plus PPB2027-cited resolutions of any age. This diagnostic evaluates
**operative paragraphs in resolutions only**, not every document type.

- Development: eight previously inspected defective passages in eight documents.
- Validation: 24 passages in 12 unseen resolutions. Used for prompt iteration.
- Final test: 29 passages in 15 further resolutions. Never used in prompt examples
  or revisions. The candidate was frozen before opening final-test sources;
  reference labels were then recorded before any final-test inference.
- Excluded 488 earlier pilot/upstream classified documents and their 380 recorded
  resolution-series families. All selected validation/test families are disjoint.
- Seeded selection: up to two operative paragraphs per document, 12–250 words.
  Reject candidates with word-five-gram Jaccard similarity above 0.7 to the prior
  374-document source corpus. Largest validation/test target similarity: 0.110.
- The 28-document source draw yielded 27 documents with eligible passages. One
  document had one eligible passage and one had none; no replacement was made.

The reference is a **single source-only agent annotation**, not an independently
adjudicated legal gold standard. Four scope-policy cases were marked ambiguous
before test inference. Some additional category/splitting ambiguities emerged
later; their original test labels and scores remain unchanged. Validation rubric
corrections are retained separately: an optional renewed-mandate implementer and
resource-support/operational-delivery overlap were initially scored too narrowly.

No task examples from validation or test appear in the prompt. The one concrete
apposition example comes from the old development case A/RES/80/105 OP17.
Validation feedback informed general instructions, as intended. Any next prompt
revision must use a new final test; this test is now development evidence.

## What changed

The final candidate is `experiment/prompt-v4.txt` and `experiment/schema.py` under
`data-processing/evals/paragraph_entities/`.

1. Separate full verification evidence, a short display highlight and a task
   summary. Quotes must be contiguous verbatim source text.
2. Separate **implementer** and **decision_maker** roles. An issuing body can be an
   implicit decision maker, never an implicit implementer. Beneficiaries,
   recipients, consultees and affected institutional objects are not assignees.
3. Give explicit conditions, deadlines, frequency, duration and scope their own
   evidence-backed fields, including governing parent-paragraph qualifications.
4. Record omitted acknowledgments, historical references, general intentions and
   insufficient source text. Restrict these omissions to the target paragraph.
5. Preserve concrete outputs and affected institutional targets. Remove mentioned
   entities from this experiment because the frontend uses assigned entities.
6. Tighten independent-result task boundaries, reporting-format choices,
   apposition handling and quote occurrence counting. No action-verb extraction.

Iteration was useful but initially regressed acceptance: v1 copied a context-only
omission, v2 used an incorrect quote occurrence, and v3 abbreviated a quote with
an ellipsis. v4 passed all 24 validation cases with Luna-medium and Sol-medium;
that validation result is **not** the final-test result.

## Frozen final-test comparison

A passage passes the coarse checks only if its response validates and matches
reference task presence, permitted task-count range, task-family set and the
**union of implementer groups**. These checks do not establish precise actor
identity, subtype correctness, complete qualifiers or good highlight boundaries.
Implicit issuer assignees in the baseline are excluded from implementer scoring,
so the baseline is not penalized merely for its older schema.

| Prompt/model | Reasoning | All passage checks /29 | Excluding 4 scope cases /25 | Accepted /29 | Median task-span words | List-price cost, 29 passages |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Original / Luna | medium | 23 | 21 | 29 | 27 | $0.0305 |
| Revised / Luna | none | 23 | 20 | 29 | 9 | $0.0122 |
| Revised / Luna | medium | 23 | 21 | 28 | 10 | $0.0210 |
| Revised / Luna | high | 24 | 22 | 29 | 9 | $0.0291 |
| Revised / GPT-6.1 Sol | low | 26 | 23 | 29 | 9 | $0.2910 |
| Revised / GPT-6.1 Sol | **medium** | **27** | **24** | **29** | **9** | **$0.3422** |
| Revised / GPT-6.1 Sol | high | 25 | 22 | 29 | 9 | $0.4691 |

Span length compares requested display quotes with the old task-evidence quotes;
this is not a visual browser test. Reasoning tokens are included in output cost.
Sol does not support `none`, so its lowest tested setting is `low`. All models
receive identical final-test inputs, strict output schema and no tools; the old
baseline retains its original prompt/schema/vocabulary. Response model IDs verify
that the requested models were used. No paid retries were made.

The sample is small, body-balanced and restricted to short/medium paragraphs.
These are case counts, **not registry-wide accuracy estimates**. One test run per
condition does not measure stochastic variability. Sol-high's lower score partly
reflects defensible taxonomy alternatives, not an established monotonic decline
from additional reasoning.

## Critical manual findings

I inspected the complete Sol-medium final-test output and compared failed cases
across configurations. Important findings beyond the aggregate checks:

| Source | Finding | Implication |
| --- | --- | --- |
| A/RES/76/161 OP31 (`t07`) | Every configuration extracts the OHCHR workshop from “Reaffirms the request of the Human Rights Council…”. The reference excludes historical assignments. | Scope ambiguity: separate a **reaffirmed assignment** from a newly created assignment, rather than forcing a binary task/no-task choice. |
| A/RES/ES-11/10 OP3 (`t14`) | Luna-none misses concrete prisoner exchange, release and return demands; Sol-medium extracts them and honestly leaves assignees unresolved. | Never require a named implementer before admitting a concrete task. |
| A/HRC/RES/51/2 OP5 (`t26`) | Luna-none treats a directed encouragement to States and other stakeholders as general intent. | The conservative prompt can suppress genuine assignments. Sol-medium retains the actors. |
| S/RES/2627(2022) OP4 (`t50`) | Luna-none misses “the panel shall carry out” assessments. | Leading diplomatic verbs are insufficient; the current assignment can occur inside the clause. |
| A/HRC/RES/62/21 OP13(b) (`t21`) | Luna-medium correctly links a required report section to OHCHR and its parent deadline, but validation rejects its parent-sourced report output. Sol-medium passes by omitting that output. | This is partly a **schema/validator defect**, not fabricated model evidence. Permit explicitly inherited output evidence and link child sections to the parent report. |
| E/RES/2026/9 OP19 (`t36`) | Luna-medium/high and the baseline miss the assistance providers implicit in the coordinated appreciation/exhortation. Sol-medium resolves them, with an uncertainty note. | Keep grammatical inheritance distinct from explicit naming; broad “United Nations bodies” remains too vague for a fine institutional subtype. |
| E/RES/2024/11 OP3 (`t40`) | Sol-medium highlights “integrated crime prevention…” inside **“have not yet integrated…”**, an eligibility condition, rather than the operative “to do so”. All coarse checks pass. | Exact source matching alone cannot validate display meaning. Permit linked antecedent/action spans and label their roles; show the summary alongside them. |
| S/RES/2627(2022) OP3 (`t51`) | Sol-medium splits regular Committee engagement into two dialogue tasks and calls the work programme substantive while its updates are reporting. Four tasks exceed the reference range. | Normalize adjacent clauses with the same actor/result, and define whether work programmes and suggestions are reporting or information work. |
| S/RES/2610(2021) OP104 (`t53`) | Sol-low classifies the Monitoring Team as Secretariat, while Sol-medium uses UN organs. | Resolve organizational hierarchy with a reviewed entity registry, rather than relying solely on model classification. |
| A/RES/77/231 OP6 (`t10`) | Sol-high labels State suggestions as reporting; Sol-medium calls them information work. Both identify the right State and SG actions. | A category-label disagreement can be reasonable; the taxonomy needs a rule for submissions, suggestions and recommendations. |

The **development** fixes are promising but are not held-out evidence: both final
medium configurations reduce the long qualified government actor to “Governments”,
merge the Secretary-General's appositive title into one assignee, exclude the two
unassigned resource aspirations, and preserve UNODC's inherited extrabudgetary
condition. Oral and written reports remain distinguishable.

## Recommendation

Use **Sol-medium as the next quality reference** and Luna-high as the inexpensive
bulk candidate. Luna-none's missed assignments make it a poor default. This test
does not establish that an automatic Luna-to-Sol fallback can identify all errors;
that routing rule needs its own evaluation.

Before a production rerun, change the contract to distinguish new/reaffirmed
assignments and procedural permissions; allow parent-linked report outputs;
separate eligibility from action highlights; define work-programme/submission
categories; and use reviewed entity IDs with nullable unresolved classifications.
Keep uncertainty visible to the frontend. Validate these changes on new, longer
paragraphs and non-resolution registry documents with independent annotation.

The website data was not replaced by this experimental schema. A full 8,299-clause
Sol-medium rerun would exceed the current $25 experiment budget: the observed
per-passage average extrapolates to about $98 before discounts, versus about $8.31
for Luna-high. These are rough extrapolations from short passages, not corpus
quotes or authorization to launch that rerun.

## Inspect and reproduce

Committed sources, labels, freezes, ledger, scores and all 203 final-test outputs:
`data/references/extraction-experiment-20261110/`. Raw API envelopes and all
intermediate validation outputs remain in `.cache/extraction-experiment-20261110/`.
The three preliminary candidates are retained with their prompts and schema.

Offline score reproduction (no credentials or model calls):

```bash
python data-processing/evals/paragraph_entities/experiment/reproduce_scores.py
```

Budget/evidence safeguards and existing schema checks pass. Website TypeScript
and ESLint checks pass (six existing warnings). The `pnpm` launcher could not fetch
its selected signed release in the network sandbox, so the installed Prettier,
TypeScript and ESLint binaries were run directly instead; package-manager safety
checks were not disabled.

Pricing: [Microsoft Foundry Global Standard prices](https://devblogs.microsoft.com/foundry/whats-new-in-microsoft-foundry-september-2026/).
Supported reasoning settings: [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna),
[GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol).
Subscription API credits require activation into an API Platform organization and
do not pay for these Azure calls: [OpenAI credit guide](https://developers.openai.com/api/docs/guides/chatgpt-api-credits).
