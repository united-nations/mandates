# Explicit task definitions and source-backed display (v6)

Review/results: `docs/paragraph-extraction/quality-review-20261123.md`.
Frozen sources, original annotations, configurations, labels, outputs and budget:
`data/references/paragraph-quality-20261123/`.

`prompt-v6.txt` and `schema.py` define the current experimental candidate.
`prompt-v5.txt` is a development draft, not a production prompt. The exact draft
schema is retained in the reference configurations. `display.py` compiles only
short task/output highlights and implementation actors; it does not import data
or overwrite the website snapshot. Existing source hash/parser checks must remain
in any later importer.

`run.py` uses the original experiment's file-locked cost reservation guard and
rates. The new run starts with all previous charges in its ledger, preserving the
**original cumulative USD25 cap**. The runtime was
`/tmp/mandate-quality-venv/bin/python`, with openai3.58, pydantic2.14.4,
python-dotenv and tiktoken. Token cache `/tmp/mandate-quality-tokenizer`.
No paid retries or silent model substitutions. Test calls require matching frozen
prompt/schema/case/label hashes. Models supported by the deployed endpoint were
GPT-6 Luna and GPT-6.1 Sol; GPT-6.2 Sol was unavailable.

Source and output JSON are untrusted. Validators check exact quotes, their scope,
compatible family/subtype pairs, bounded display lengths and allowed issuer roles.
They cannot establish semantic correctness. The source-only rubric is frozen and
imperfect; do not present its checks as an expert accuracy score.

Offline reproduction needs Python only for scores:

```bash
python data-processing/evals/paragraph_entities/quality/score.py
```

Schema/display tests additionally need pydantic:

```bash
python -m unittest discover -s data-processing/evals/paragraph_entities/quality -p test_schema.py
```

Do not tune against this final test and describe it as unseen data again. Keep
current analytics and paragraph data consistent; no partial mixed-model production
import is performed by these scripts.
