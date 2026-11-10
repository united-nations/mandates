# Extraction experiment: completed using Azure Foundry

User constraints: compare GPT-6 Luna and GPT-6.1 Sol across supported reasoning
levels; iterate prompt/schema; never reuse development examples for evaluation;
maximum USD 25 of API usage, including usage funded by promotional credits.
Completed: 372 requests, $1.654772 uncached list estimate; $2.068465 including
the conservative 25% allowance. See [results](prompt-experiment-20261110.md).

## Funding prerequisite

Official OpenAI guidance now provides subscription-linked API credits for
eligible Pro/Business subscriptions. They require activation into an owned API
organization, then requests authenticated by a project key from that organization.
The existing direct OpenAI key authenticates and lists both requested models;
its receiving-organization credit balance/linkage has not been verified.
Existing Azure calls cannot consume OpenAI API Platform subscription credits.
The user authorized Azure Foundry instead. No direct API credit-funded inference
was sent; the existing Azure deployment was used.

Source: https://developers.openai.com/api/docs/guides/chatgpt-api-credits

## Evaluation separation

- Maintain development, validation and sealed final-test document pools.
- All previously reviewed documents and all documents in earlier pilot runs
  belong to development only. Exclude their near-duplicate/series families from
  the held-out pools as well.
- Freeze and hash document IDs, paragraph IDs, source text, split assignments,
  annotation instructions and sampling seed before model comparisons.
- Annotate independent reference labels from source text, without inspecting
  candidate outputs. Record ambiguous task/actor interpretations explicitly.
- Iterate only on development/validation. Freeze the final prompt/schema before
  opening final-test predictions. No examples, error cases or references from the
  final test may enter subsequent prompt revisions presented as the same test.
- Compare models/reasoning on identical held-out inputs; keep prompt-only and
  reasoning-only changes separable. Preserve the original baseline.

## Quality targets

Evaluate task existence/statement kind, actor identity and role, qualification
inheritance, category, duplicate/task splitting, exact evidence and short display
spans separately. Include no-task negatives, adopted decisions, general intent,
appositions, conditional child clauses and damaged-source abstentions.
Report case-level findings and document-level facet effects. Do not equate
schema/evidence acceptance with semantic accuracy or make a representative claim
from a targeted edge-case sample.

## Budget control

Verify current per-model prices and supported reasoning levels before calls.
Use a persistent, resumable cost ledger shared by all experiment conditions;
reserve conservative input and maximum output costs before dispatch, include
reasoning in output cost, include failures/retries, and stop before USD25.
Stage small checks, expand only promising conditions, and retain a safety reserve.
No full-corpus rerun or website replacement is implied by this experiment.
