# Pilot review for the medium-reasoning rerun

A separate reviewer inspected **44 locally validated outputs and 12 rejected raw replies across 48 documents** from the completed GPT-6 Luna, reasoning-none pilot. This is a diagnostic source review, not an accuracy estimate or legal/subject-matter adjudication. No API calls or production writes were made by this reviewer.

The 44 cases combine eight previously identified challenge cases, four seeded cases from each of the six task families, and twelve seeded empty outputs. The twelve errors comprise three seeded examples each of quote mismatches, evidence-scope failures, implicit-actor violations and missing institutional targets. Seed ranking uses SHA-256 of `review-medium-<request_id>` for outputs and `medium-errors<request_id>` for errors. Families were sampled sequentially excluding previously selected IDs, so this is deliberately not a representative corpus sample.

## Findings and prompt repairs

| Finding | Source-linked diagnostic example | Change |
|---|---|---|
| Real assignments can be omitted inside long mixed paragraphs. | `A/RES/80/172`, position 18, `a-9797bc7575f610a41ad7b105`: explicit request to remove restrictions returned no task. | Whole-target clause scan and an empty-output check for explicit assignments. A task does not need a deadline or measurable deliverable. |
| Parent-governed child actions can be missed. | `A/HRC/RES/52/38`, position 36, `a-fabca59ead0f77808dda6f39`: gerund child under a call on States returned empty. | Read governing scope for gerunds/infinitives without copying neighboring tasks. |
| An adopted financial decision can be lost while analogous decisions are captured. | `A/RES/77/315` position 21, `a-45af4200544ce5f1165190b0`, tax set-off empty; `A/RES/77/4` position 10, `a-cb227a644cd10a51d10fd5b0`, appropriation captured. | Explicitly include adopted appropriations, apportionments and set-offs; issuer is decision-maker, beneficiaries are not payment assignees. |
| Resource operations can be merged into substantive work. | `A/RES/73/165`, position 173, `a-9204d56222a6fc3a98566be0`: increased investment was only a deliverable on a policy task. | Separate an actual resource allocation/investment operation from an independently requested policy obligation. |
| Implementation reviews were overclassified as mandate review. | `A/RES/35/170` position 18, `a-f471e47b6d6f5ea7775d7805`; `A/RES/70/1` position 333, `a-d9cdf47fcc88e84fc7e8bc6a`; `A/RES/79/194` position 62, rejected `a-50df8cde34b6ab2d2678cf7d`. | Reserve mandate_review for scope, continued need, duplication, consolidation or institutional architecture; code/application/workplan assessment is not automatically mandate review. |
| Preparatory means and purposes can be inflated into separate tasks. | `A/RES/58/153` position 15, `a-7b0ad2323c92387536d64591`: report prepared in consultation became a separate dialogue. `A/RES/64/289` position 126, `a-af5a68f50c0dee8f719ab0a6`: mechanism purpose also became generic support. | Merge methods, report topics and purpose clauses unless independently required. |
| Grammatical responsibility and consulted actors can be confused. | `A/RES/79/275` position 42, `a-73cbed7e6d34c22a9b4754ef`: entrusting body selected instead of the Committee. `S/RES/2719(2023)` position 45, `a-5a6622706defc063db290b7d`: consultation partner promoted to report assignee. | Resolve subject/recipient/partner/affected target per task; joint report is not by itself a joint assignment to every consulted actor. |
| Actor classifications are not reliably inferred from a broad actor phrase. | `E/RES/2024/8` position 97, `a-8b38ae816bb64e9cf556cca9`: States and parties all typed member_states. `A/RES/58/153` position 15: High Commissioner for Refugees typed Secretariat. | Split evidenced coordinated actors where types differ; classify office-holders by actual organization/role; avoid guessing mixed collectives. |
| Mentions still contain processes and social/beneficiary categories. | `A/RES/75/233` position 92, `a-5a88dcf25d5d5c7a76482d15`; `A/RES/80/180` position 73, `a-6874150b33b98442e7c41211`. | Omit known non-actors, rather than emitting null type and a disclaimer. Stored mentions remain in the schema although frontend hides them. |
| Evidence hallucination and occurrence counting produce rejected outputs. | `A/RES/71/243` position 85, `a-fa4eeff44540ab4031767b7c`: spliced actor phrase; `A/RES/76/187` position 128, `a-973d01aed99963da7b344596`: invented ellipsis; `A/RES/76/3` position 104, `a-d9610abbf296097ee3a4da6a`: longer quote occurred once but occurrence=1. | Require contiguous literal quotes, no ellipses/coordination splicing, exact-quote zero-based occurrences. |
| Missing actors/targets can trigger fabrication or invalid output. | `A/RES/76/274` position 38, `a-039eaa253b0ceb0b54fd50d3`: guessed implicit Secretary-General; `A/RES/61/105` position 105, `a-672c8e3706fe52ee5af9cbd5`: no institutional_target. | Keep actor empty with uncertainty rather than guessing; require supported affected targets for institutional/review categories; generic source-supported newly created targets are valid. |

## Useful negative controls

`S/RES/2396(2017)` position 58 (`a-a92914aa580a0d3ed030966e`) only recalls earlier obligations. Its empty task list is consistent with the current-task rule; treating every shall inside a historical reference as a new task would inflate results. Likewise routine remain-seized formulae, descriptions of disasters, existing-report acknowledgments and rights-list entries were generally reasonable empty outputs. Several apparently empty clauses are genuine ambiguity, not proven false negatives. The rewrite preserves these exclusions.

## Rerun and evaluation limits

Only `activity_prompt.txt` was changed. The schema, model, document sample, frozen source/context, deterministic verb annotations and eligibility ledger are unchanged by this review. The parent agent runs the new prompt with medium reasoning in a fresh run directory. The change combines prompt revision and reasoning level: an improvement cannot be attributed to reasoning alone. API-reported reasoning/output tokens and local rejection rates must be measured, not assumed. Ensure output-token cap accommodates reasoning plus the JSON reply.

These diagnostic cases informed the prompt. They are not a held-out score. A source-linked follow-up review should compare both runs on the same IDs, include new seeded cases and empty outputs, and report unresolved source corruption/actor ambiguity separately. Schema/evidence validation does not establish semantic correctness. No claim of quality preservation or production readiness follows from this prompt edit.

## Reviewed request IDs

| Request | Document | Position | Local status |
|---|---|---:|---|
| `a-fabca59ead0f77808dda6f39` | `A/HRC/RES/52/38` | 36 | validated |
| `a-9204d56222a6fc3a98566be0` | `A/RES/73/165` | 173 | validated |
| `a-5a88dcf25d5d5c7a76482d15` | `A/RES/75/233` | 92 | validated |
| `a-45af4200544ce5f1165190b0` | `A/RES/77/315` | 21 | validated |
| `a-9797bc7575f610a41ad7b105` | `A/RES/80/172` | 18 | validated |
| `a-6874150b33b98442e7c41211` | `A/RES/80/180` | 73 | validated |
| `a-5c2c681a9fae12b3dcdd35b3` | `E/RES/2026/16` | 11 | validated |
| `a-a92914aa580a0d3ed030966e` | `S/RES/2396(2017)` | 58 | validated |
| `a-3793b54bb1a448af85ed6be9` | `S/RES/2707(2023)` | 7 | validated |
| `a-af5a68f50c0dee8f719ab0a6` | `A/RES/64/289` | 126 | validated |
| `a-33868e5b26be5c75188fc946` | `A/RES/64/289` | 105 | validated |
| `a-88fee7a6a4a1c37fb4079dea` | `S/RES/2799(2025)` | 9 | validated |
| `a-cb227a644cd10a51d10fd5b0` | `A/RES/77/4` | 10 | validated |
| `a-5539617b8e58df0a0bb10ca6` | `A/RES/80/172` | 26 | validated |
| `a-13b8674bd46a5f3b58192458` | `A/HRC/RES/34/17` | 18 | validated |
| `a-09da6c7d70ba0c73cfb85f2c` | `A/RES/71/243` | 136 | validated |
| `a-7459f47379a4aa0e730b0a4b` | `A/RES/79/194` | 121 | validated |
| `a-f471e47b6d6f5ea7775d7805` | `A/RES/35/170` | 18 | validated |
| `a-d9cdf47fcc88e84fc7e8bc6a` | `A/RES/70/1` | 333 | validated |
| `a-73cbed7e6d34c22a9b4754ef` | `A/RES/79/275` | 42 | validated |
| `a-c59525b24c6e8d54b2c0b65a` | `A/RES/76/263` | 19 | validated |
| `a-a9b5331cff52d60b673db5d7` | `A/RES/72/249` | 20 | validated |
| `a-7b0ad2323c92387536d64591` | `A/RES/58/153` | 15 | validated |
| `a-153b7731b1f1e3de1fa4b0d6` | `A/RES/77/213` | 32 | validated |
| `a-f18936233537103c31eabb38` | `S/RES/2518(2020)` | 20 | validated |
| `a-5a6622706defc063db290b7d` | `S/RES/2719(2023)` | 45 | validated |
| `a-8c680aa462e5869442fdc6ae` | `A/RES/76/237` | 39 | validated |
| `a-4f147551842668e5b887e15d` | `A/RES/79/248` | 121 | validated |
| `a-8aee44f48c4c0c880279e6a0` | `A/HRC/RES/57/22` | 27 | validated |
| `a-9ef58c6eef74c1085b169390` | `A/RES/78/226` | 52 | validated |
| `a-8b38ae816bb64e9cf556cca9` | `E/RES/2024/8` | 97 | validated |
| `a-362fa5882a6d3387aa740a8a` | `A/RES/79/161` | 66 | validated |
| `a-5a3a50ce07ef3f088996f41b` | `A/RES/79/221` | 41 | validated |
| `a-0760b19a5062cc286145e5de` | `E/RES/2013/39` | 14 | validated |
| `a-33348636a3fafcafea7efb8b` | `A/RES/S-10/2` | 118 | validated |
| `a-59759c283fadad8c3c30ed61` | `A/RES/70/1` | 85 | validated |
| `a-37e0b80010add9ca9315d9f3` | `A/RES/80/113` | 51 | validated |
| `a-544d886c2257f8427788493f` | `A/RES/77/285` | 45 | validated |
| `a-c6c919e70e559b8ffeede6d5` | `A/HRC/RES/62/20` | 81 | validated |
| `a-56c4ac5e8d4c20e3ca701ea7` | `E/RES/2026/7` | 23 | validated |
| `a-c6f0f6176fa34c3169a66649` | `A/RES/72/249` | 31 | validated |
| `a-733e72af7bca4e51065047f5` | `S/PRST/2024/5` | 7 | validated |
| `a-cb8a12d57fe0d3e6f1ac4f5e` | `A/RES/48/104` | 46 | validated |
| `a-1886ff2e2729d736c99132bd` | `S/RES/2719(2023)` | 21 | validated |
| `a-fa4eeff44540ab4031767b7c` | `A/RES/71/243` | 85 | rejected |
| `a-d9610abbf296097ee3a4da6a` | `A/RES/76/3` | 104 | rejected |
| `a-973d01aed99963da7b344596` | `A/RES/76/187` | 128 | rejected |
| `a-227eccf239bf594312838acf` | `A/RES/78/245` | 145 | rejected |
| `a-62d0816ff1efe374b27a7ba0` | `A/RES/76/106` | 55 | rejected |
| `a-6609efd684f82b9be7f05d1d` | `A/HRC/RES/60/33` | 39 | rejected |
| `a-7b2ac89f636319b376be73c3` | `A/RES/77/107` | 47 | rejected |
| `a-215cdf1c70f4712fea5a6890` | `A/RES/76/102` | 40 | rejected |
| `a-039eaa253b0ceb0b54fd50d3` | `A/RES/76/274` | 38 | rejected |
| `a-6e0397b020cbe5659a8987ad` | `A/RES/79/194` | 120 | rejected |
| `a-672c8e3706fe52ee5af9cbd5` | `A/RES/61/105` | 105 | rejected |
| `a-50df8cde34b6ab2d2678cf7d` | `A/RES/79/194` | 62 | rejected |

## Medium-reasoning first-ten preflight review

Reviewed all ten saved raw replies and all nine locally validated results in
`.cache/paragraph-activity-pilot-v4-medium-20261109/` against their frozen target
and context, then compared the same ten baseline outputs. The run metadata says
`reasoning=medium`; API usage actually reports **5,051 reasoning tokens** across
the ten replies (not an inference from the requested setting). All ten API
responses completed; nine passed the local schema/evidence checks. Total usage
was 61,973 input tokens (53,685 cached) and 8,282 output tokens, of which 5,051
were reasoning tokens.

The same diagnostic cases show several plausible improvements:

- `a-9204d56222a6fc3a98566be0` now separates the explicitly increased investment
  as resources/funding from the substantive policy task. Baseline merged it
  into the policy task's output list.
- `a-51e4161ad740294d276c0b2a` calls the requested strategic review
  reporting/assessment, rather than assuming a written-report subtype; it
  remains a single output with its component analytical requirements.
- `a-f5f77dbeea379dc772765d26` keeps dissemination and promoting understanding
  together rather than inventing a separate broad normative task. It no longer
  produces an instrument as a mentioned actor or a generic policy output.
- `a-468e5f11fa9071ecb40034f7` keeps the diplomatic task and two governmental
  assignees without inventing a policy deliverable or treating Gibraltar as an
  organization.
- The two presidential-statement reporting tasks, inherited budget provision
  and ECOSOC consultative-status amendment remain coherent and source-supported.

Remaining issues are material enough to retain review/quarantine, but do not
prevent an exploratory full-sample run:

- `a-7d701f482aa2021966904903` detects complete instructions in the parent
  paragraph that baseline omitted, but its second task quote prepends **States**
  to a clause that actually says **and should not invoke ...**. That spliced
  quote correctly fails validation. Do not silently accept or rewrite it.
- `a-b276820c8758ab54be53522a` now extracts a broad parent contribution task
  where baseline was empty. Its assignment is grammatically supported but
  the boundary between an independent broad task and the governing parent of
  detailed children remains debatable; counting it may increase broad tasks.
  The mixed UN organs/agencies actor is left unclassified with uncertainty,
  rather than guessed, but could instead be split using exact separate quotes.
- `a-4084cf447601cbd494b20364` adds a generic dissemination task from an
  impersonal "every effort" exhortation, with no assignee and an uncertainty.
  This may still be too broad for the concrete-task scope and warrants review.
- ECOSOC's affected consultative status is typed as target_kind=entity, although
  status is an institutional arrangement rather than itself an entity. The
  institutional/amendment task is valid; target ontology remains imperfect.
- Canonical actor names remain inconsistent (e.g. States versus Member States).
  Medium reasoning does not fix normalization automatically.

**Recommendation:** proceed with the user-authorized full sample as an
exploratory rerun, keeping this prompt/schema/sample frozen and continuing to
quarantine evidence failures. There is no severe preflight blocker requiring a
prompt mutation. This is not production import approval or evidence of an
accuracy gain: these ten cases are deliberately selected diagnostics, and
prompt revision plus reasoning level changed together. Compare rejected/empty
outputs and newly seeded source cases after the full run before interpreting
frequency changes as substantive findings.

Reviewed preflight IDs:

- `a-4084cf447601cbd494b20364`
- `a-7d701f482aa2021966904903`
- `a-f728f2a8559d338f68514d23`
- `a-b276820c8758ab54be53522a`
- `a-51e4161ad740294d276c0b2a`
- `a-939bf3a2775fc38727384234`
- `a-468e5f11fa9071ecb40034f7`
- `a-69702cf29420464456c1b6ac`
- `a-f5f77dbeea379dc772765d26`
- `a-9204d56222a6fc3a98566be0`
