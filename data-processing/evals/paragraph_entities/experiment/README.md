# Budget-capped prompt/schema experiment

Results and limitations: `docs/paragraph-extraction/prompt-experiment-20261110.md`.
Frozen public-document inputs, labels, final outputs and ledger:
`data/references/extraction-experiment-20261110/`.

Run from the repository root. Offline reproduction needs Python only:

```bash
python data-processing/evals/paragraph_entities/experiment/reproduce_scores.py
```

The paid runner additionally needs the parent pilot's dependencies (`openai`,
`pydantic`, `python-dotenv`, `tiktoken`). The tested runtime is
`/tmp/mandate-medium-venv/bin/python` with
`TIKTOKEN_CACHE_DIR=/tmp/mandate-medium-tiktoken`.

`prepare_pool.py` selects series-disjoint resolution documents from the frozen
registry population, excluding earlier classified/pilot sources. It requires the
existing upstream checkout next to this repository. The read-only website script
`fetch-extraction-experiment.ts --series` supplies recorded-series metadata;
without `--series` it fetches source paragraphs for `fetch-symbols.json`, using
existing data helpers and the shared database pool. `select_cases.py` selects up
to two operative paragraphs per document and creates governing context.

Source-only labels and the prompt/schema freeze were recorded before final-test
inference. Do not revise prompts against this test and present it as unseen data.

`run.py` sends Azure Responses requests, with no automatic retries. It uses the
single `.cache/extraction-experiment-20261110/ledger.json` across every condition.
Before dispatch it locks that ledger and reserves byte-bounded input plus maximum
output cost, at published uncached prices plus 25%. Unknown-outcome calls keep
their entire reservation. The USD25 cap is checked against completed charges plus
all in-flight reservations. No tool use, batch discount or cache discount is
assumed. Existing requests cannot be silently resent. Credentials come from the
specified dotenv file and are never saved.

Example of an **explicitly paid**, resumable invocation using the existing run:

```bash
python data-processing/evals/paragraph_entities/experiment/run.py \
  --version v4 --condition sol-medium --split test --env-file /path/to/azure.env
```

Test runs require matching hashes for the final prompt/schema, case file and
source-only test labels. The committed JSONL files allow offline score checking
without restoring raw responses or making paid calls. The experimental contract
is not a production importer; it has no website export or database-write path.

Safeguards:

```bash
TIKTOKEN_CACHE_DIR=/tmp/mandate-medium-tiktoken \
  python -m unittest discover \
  -s data-processing/evals/paragraph_entities/experiment -p test_experiment.py
```
