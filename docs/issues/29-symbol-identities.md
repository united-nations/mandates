# Issue 29: document identity for abbreviated mandate references

The extraction now resolves document identity before grouping/importing citations.
Local body headings determine the issuer; a budget section or coarse organ facet
cannot determine it. The raw reference and every other citation field are kept.

- Known, unambiguous resolution families get official symbols (GA, HRC, ECOSOC,
  UNEA and SC). HRC presidential statements have their own family.
- An official symbol already evidenced by another citation can resolve a mixed
  heading only when the candidate is unique within the issuer/reference pair.
- Other references get readable issuer-scoped labels, following the non-ODS
  convention used for CSW outcomes. Labels are not invented official symbols.
- Historic UNEP Governing Council decisions have a separate namespace from UNEA.
- Importers reject missing identities and bare numeric keys. PPB importers use
  the same 20-column resolved CSV and retain organ/non-ODS metadata.

## Local result

Input: `data/processed/ppb2027/all_mandates.csv` (4,081 rows).
Output: `data/processed/ppb2027/all_mandates_resolved.csv` (4,081 rows).
The original exports are untouched. Every field except Full Document Symbol is
preserved, in original row order.

All 539 plain numeric references previously missing a full symbol have identities:
175 have an inferred/evidenced official symbol; 364 have a scoped label.
The 46 reference numbers previously spanning organs no longer collapse across
issuers. In particular `4/6` resolves to:

- UNEP: `UNEP/EA.4/RES.6`
- OHCHR: `A/HRC/RES/4/6`
- UNODC: `UNCAC COSP Outcome 4/6` (not a standalone official symbol)

## Database repair — manual application required

Migration `sql/migrations/042_repair_short_mandate_identities.sql` consumes the
checked-in provenance map. Run from the repository root against the intended
Azure database, with psql's ON_ERROR_STOP enabled. The connection is configured
in `website/.env.local`, not necessarily in the shell. No migration was applied
by the agent.

A read-only preview of the live database found 537 PPB 2027 citations under bare
numeric keys. The map identifies all 537; 536 can be reassigned without changing
citation IDs. One is left unchanged because the canonical target already has an
identical citation natural key: `80/221`, SESG-MYR, Section 3/Add.2, Mandates and
background. It requires a separate alias deduplication decision.

The migration scopes repair to this confirmed numeric class. It leaves old
source document rows, prior-budget citations, paragraphs and external review
records in place. It reports skipped aliases and the remaining bare-key count.
Ambiguous mappings abort; an exact duplicate target is skipped. A bidirectional
full-row conservation check verifies that nothing except the intended citation
key changed. The database constraint rejects new bare keys but permits legacy
orphan document rows to remain during gradual repair.

The map includes other resolved references for audit, but the migration does not
apply those broader aliases. Three source rows with indistinguishable original
provenance are excluded from the map instead of being guessed.

## Reproduction and checks

From `data-processing/`, generate new output paths (existing files are protected):

```sh
uv run python -m utils.mandate_identity_csv INPUT.csv NEW_OUTPUT.csv --repair NEW_MAP.csv
uv run python -m unittest discover -s tests -p 'test_mandate_identity*.py'
uv run python -m unittest discover -s tests -p 'test_report*.py'
```

Normal PPB extraction now writes resolved identities and the resolved CSV itself.
SQL was parsed without executing it; the three new utility modules pass strict
mypy. The unrelated series-metrics test module cannot import in this checkout
because its sibling documents data-pipeline implementation is absent.

Acceptance bar: all 4,081 input rows conserved; all 539 numbered references have
safe identities; no cross-issuer merge in that set; 536/537 live bare-key citations
have a non-conflicting repair, with the one remaining alias explicitly reported.
