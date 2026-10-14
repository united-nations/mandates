# Paragraph extraction assessment — 24 September 2026

## Status

`SHOW_PARAGRAPH_ENTITIES = false` remains in `src/lib/feature-flags.ts`.
The original LLM implementation has now been located in
[UN-EOSG-Analytics/un80-docs-processing](https://github.com/UN-EOSG-Analytics/un80-docs-processing),
commit `a6c56cb6b8ddeebf64b93faa3392c145e3da9592`, at
`src/mandates/classification/classify_paragraphs.py`.

Prepared a 30-document pilot, comprising 1,783 paragraph requests. The Azure
preflight for `gpt-6-luna` returned HTTP 404 `DeploymentNotFound`. The configured
resource currently lists only `gpt-5.4-mini`, `gpt-5.4` and
`gpt-4o-transcribe-diarize` deployments. **No GPT-6 Luna document pilot ran; no
claim of preserved or improved quality is supported yet.** Correct endpoint and
deployment configuration is required. No other model was silently substituted.

Reproduction scripts: `data-processing/evals/paragraph_entities/`.
Local frozen prompts, schema, inputs, manifest, error and audit results:
`.cache/paragraph-entity-pilot-20260924/`.

## What the actual extractor does

One API request per paragraph, not per document. Each repeats approximately
5,976 developer-prompt tokens plus 1,151 JSON-schema tokens (o200k_base proxy),
then adds the resolution subject, five preceding elements, parent context and
target paragraph. It returns verbs, assignees, mentioned entities, deliverables,
uncertainties and a complete highlighted copy of the paragraph. Its main runner
uses GPT-5 without an explicit reasoning setting. The prompt includes semantic
rules that directly address the reported errors: never highlight “we”, separate
mentioned actors from tasked actors, reject nonprocedural/material verbs and
use concise entity spans. These rules are a stronger specification than the
current deterministic parser, but do not guarantee model compliance.

The earlier $23–55 whole-registry Batch estimate assumed compact entity-only
JSON and document-level requests. It does not apply to this existing workflow.

## Quality findings before migration

- The parent-context loop does not stop at the nearest parent: it appends every
  preceding element at a shallower level. This inflates inputs and can supply
  unrelated context. A corrected implementation must be evaluated separately.
- Saved output audit: 9,632 unique annotated paragraphs across `pred/gpt-5` and
  `final`, deduplicated with GPT-5 predictions preferred. After removing markup,
  422 copies differ from their input text; 183 still differ after whitespace and
  case normalization. Examples include removing “those” and duplicating “the”.
  These are saved-artifact differences; the audit cannot establish whether
  every difference was introduced by the model or later processing.
- Prefer returning validated literal spans and constructing highlights in code.
  Full paragraph regeneration creates an avoidable text-corruption opportunity.
- The checked-in evaluation has 90 annotated paragraphs across 11 documents.
  Its historical type labels disagree with the current schema (for example,
  “secretary-general” versus “UN Secretariat”); some reference preambular
  assignees conflict with the current prompt's explicit prohibition. It lacks
  mentioned-entity labels. The existing edit-distance metric is not precision/
  recall and cannot certify migration quality. Labels require review before
  a clean paired GPT-5/GPT-6 comparison.
- The entity vocabulary is fetched live from Google Sheets rather than pinned.
  This pilot froze the actual responses. A repeatable evaluation must also pin
  the prompt, vocabulary, model/version, reasoning setting and paragraph input.

## Refined volume and token budget

“All” means the Mandates website registry, not every UN Digital Library record.
“Cited” means any `ppb2026.source_document_citations` match, across origin versions.
Symbols are uppercased, whitespace-normalized and deduplicated. Counts are from
read-only live database queries; ongoing ingestion can change availability.

| Scope | Distinct symbols | With usable English text | Paragraph requests | Estimated input tokens |
|---|---:|---:|---:|---:|
| Cited | 5,286 | 3,177 | 160,257 | 1.308 billion |
| Entire registry | 43,915 | 25,139 | 665,714 | 5.196 billion |

Tokenize source text with o200k_base and reconstruct the original repeated
prompt/schema/context costs. Component addition approximates token merges and
API schema framing; these are not billed token measurements. The available
corpus has 37.14M source tokens; repeated prompt/schema dominates request cost.
Nearest-parent-only context would reduce inputs to 1.224B cited / 5.040B all,
without other prompt changes.

Saved full-schema outputs average 233 visible tokens per annotated paragraph
(median 201), measured from 9,632 saved records restored to API quote-field names.
That gives 37.4M cited / 155.3M all estimated visible output tokens. It is a
historical baseline proxy, not a GPT-6 output-length measurement; reasoning
usage is absent from the saved results and is excluded below.

## GPT-6 Luna cost scenarios (USD)

Official direct-OpenAI rates: $0.10/M input, $0.01/M cached input and $0.50/M
output. These are a reference price, not a verified Azure deployment tariff.
Batch is a hypothetical 50%-discount scenario requiring eligible deployment.

| Scope | Standard, no cache | Batch, no cache | Standard, repeated fixed prefix cached |
|---|---:|---:|---:|
| Available cited text | ~$150 | ~$75 | ~$47 |
| All available text | ~$597 | ~$299 | ~$170 |
| All cited, extrapolated | ~$249 | ~$124 | ~$78 |
| Entire registry, extrapolated | ~$1,036 | ~$518 | ~$295 |

The cache column assumes essentially all repeated developer-prompt/schema tokens
hit cache, but prices dynamic context as uncached. It is an optimistic scenario,
not an observed cache-hit rate. No stacking of Batch and cache discounts assumed.
Extrapolate missing text separately within cited/uncited groups; missing reports
may be systematically longer. Add a 20–30% planning margin for output variability,
request splitting and retries. OCR, download, engineering and review costs excluded.

Reasoning=none is assumed. Each additional 1,000 reasoning tokens per paragraph
would add about $80 for available cited text or $333 for all available text at
standard output prices. Quality at reasoning=none still needs the target pilot.
At GPT-5.6 Luna standard rates ($0.20/M input, $1.20/M output), the same no-cache,
no-reasoning volumes would cost approximately $306 / $1,226 for available cited /
all text, or $510 / $2,127 extrapolated to all cited / the entire registry.

The prepared 30-document run would be approximately $1.73 at uncached GPT-6 Luna
standard rates without reasoning, using historical average output size. This is
an estimate of a run that could not start, not an incurred bill.

## Next experiment

Run the frozen 30-document sample on the actual deployed GPT-6 Luna model,
recording response model/version, input/output/reasoning/cache tokens, latency,
errors/refusals and validation failures. Review the 90 legacy-labelled cases
against current definitions, add explicit assignee-versus-mentioned labels and
the reported narrative/gerund/chapeau edge cases. Compare identical inputs to
saved baseline outputs by literal span, normalized actor and role; do not equate
agreement with old predictions to correctness. Only then evaluate shorter prompts,
nearest-parent context, paragraph grouping and eliminating fulltext echoing.

Sources:
- https://github.com/UN-EOSG-Analytics/un80-docs-processing/blob/a6c56cb6b8ddeebf64b93faa3392c145e3da9592/src/mandates/classification/classify_paragraphs.py
- https://developers.openai.com/api/docs/models/gpt-6-luna
- https://developers.openai.com/api/docs/models/gpt-5.6-luna
- https://developers.openai.com/api/docs/guides/batch
