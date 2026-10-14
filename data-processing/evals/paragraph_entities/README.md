# UN80 paragraph extraction pilot

Source: `UN-EOSG-Analytics/un80-docs-processing` at
`a6c56cb6b8ddeebf64b93faa3392c145e3da9592`.

The pilot freezes the repository's actual classification prompt, Pydantic output
schema and live entity/organ CSV inputs, then prepares 30 complete documents:
11 existing evaluation documents, A/RES/79/1, and 18 seeded selections evenly
allocated across six source-length strata. This is a diagnostic sample; it is
not a self-weighting sample of the whole current registry.

The current saved run is at
`.cache/paragraph-entity-pilot-20260924`.
It contains 1,783 prepared paragraph requests. GPT-6 Luna preflight failed with
Azure `DeploymentNotFound`; **no target-model document responses were produced**.
The available Azure deployment names were gpt-5.4-mini, gpt-5.4, and
gpt-4o-transcribe-diarize. Model catalogue availability is not deployment access.

Scripts import only explicit AST definitions from the source classifier to avoid
its import-time Google Sheets, cloud-client and dashboard side effects. They do
not modify production data or change the website feature flag.

Dependencies: openai, python-dotenv, tiktoken, pyyaml, pydantic,
psycopg2-binary and httpx. Installed in `/tmp/mandate-entity-pilot-venv` for this run.

```bash
python pilot.py prepare --repo SOURCE_REPOSITORY --out OUTPUT
python corpus_budget.py --out OUTPUT --env-file ENV_FILE
python audit_baseline.py --repo SOURCE_REPOSITORY --out OUTPUT
# Paid API execution: requires the correct Azure endpoint/key configuration
# and a deployed GPT-6 Luna deployment, under the user's pilot authorization.
python pilot.py run --out OUTPUT --env-file AZURE_ENV_FILE --deployment DEPLOYMENT
```

`run` performs a cheap model preflight before any document requests, records
usage and raw responses, and resumes by skipping saved successful responses.
Use a fresh output directory when changing model, prompt or reasoning settings;
existing response files are keyed by deployment, not configuration hash.
There are no automatic paid retries. The initial comparison uses reasoning=none;
this is an explicit test configuration, not a claim of quality equivalence to
the older GPT-5 run, which did not specify reasoning effort.

`corpus_budget.py` counts the available English registry corpus and estimates
request inputs using o200k_base (a tokenizer proxy). It includes the original
all-earlier-shallower-parent context behavior and separately estimates a
nearest-parent correction. API-reported tokens supersede these estimates.
The original function skips the first paragraph as the resolution subject;
the DL adapter maps `opening` to that role, and the budget includes other
paragraphs with the original context rules. Documents without an opening need
an explicit context-adapter check before any production migration.

`audit_baseline.py` inspects 9,632 unique saved annotation records, preferring
`pred/gpt-5` over overlapping `final` records. Model provenance of `final`
records is not independently recorded; pooled output lengths are a historical
serialization estimate, not new GPT-6 usage measurements. The 90 repository
reference paragraphs and saved GPT-5 predictions have incompatible historical
entity taxonomies. Raw exact-match entity scores in the audit are diagnostic
only and must not be reported as current-schema extraction accuracy. Mentioned
entities are not labelled by that reference set.
