# Completed medium-reasoning pilot: independent diagnostic review

## Recommendation

**Suitable for the clearly labelled exploratory branch preview, with the original run retained for comparison and failed outputs kept unavailable.** This is not approval for a production/legal mandate inventory, a calibrated accuracy claim, or unqualified prevalence estimates. No API requests, prompt changes, schema edits or data repairs were made in this review.

The reviewed prompt plus medium reasoning fixes several concrete original failures. Residual actor-identity and task-threshold errors remain and should be visible as limitations. Medium results should be integrated as their own complete run, without silently filling medium failures from the original model output.

## Execution integrity and technical coverage

- Fixed sample: **374 registry documents**, **8,299 logical operative targets**. Main preambles remain excluded by the frozen eligibility/context rules.
- Every saved medium result's request ID, symbol and paragraph position matches the frozen task table. The parent separately checked that all request IDs and frozen input hashes match the original run.
- Medium: **8,222 locally valid replies (99.1%)**; **73 exact-quote failures**, **3 evidence-scope failures**, and **1 request timeout**. Thus all targets were attempted, but not every API request returned a completed usable reply.
- Original: **8,117 locally valid replies (97.8%)**. The runs share 8,052 valid request IDs; medium recovers validation on 170 IDs but loses it on 65 formerly valid IDs. The net gain of 105 valid targets does not mean every original annotation was preserved or improved.
- Medium valid replies contain **8,731 task records**, compared with **7,272** originally. Medium empty replies number **2,149**, compared with **3,113** originally. This suggests more positive extraction; it does not prove better recall. Coverage differs and some broad statements are overextracted.

These are technical/completeness measurements, not semantic accuracy scores. Prompt revision and reasoning effort changed together, so this comparison cannot attribute a difference to reasoning alone.

## Source-linked review design

Reviewed **51 cases across 44 documents**: 13 earlier challenge cases; 18 genuinely fresh positive cases (three sampled from each of the six output task families); 12 fresh empty outputs; and eight fresh rejected raw replies. The first 43 are locally validated replies and the last eight are rejected replies. Fresh selections exclude every request ID listed in `pilot-medium-review.md` and the medium smoke-check IDs.

Fresh requests are ranked by SHA-256 of `completed-medium-review-v1-<request_id>`. Family pools are processed sequentially, excluding already chosen IDs; empty and rejected pools use the same seed ranking. This is a deliberate diagnostic sample stratified on outputs, not a representative sample or a held-out accuracy benchmark. Earlier challenge cases informed the prompt and therefore cannot establish generalization.

The reviewer read each target, available governing context where identity/scope mattered, the actual new activities/actors/outputs/uncertainties, and source-linked original outputs. Rejected examples were checked against their raw reply and frozen target text. Full source remains in the existing task snapshot; this report stores the review IDs and findings.

## Improvements observed

- `A/RES/80/172`, p18: explicit instruction to remove host-country restrictions is now captured; it was empty originally.
- `A/RES/77/315`, p21: adopted Tax Equalization Fund set-off is captured as a funding decision by GA, rather than omitted or assigned to beneficiary Member States.
- `A/RES/73/165`, p173: increased research investment becomes a separate resources task instead of an output buried inside a policy task.
- `A/RES/35/170`, p18, and `A/RES/70/1`, p333: ordinary application/implementation reviews no longer masquerade as mandate architecture review.
- `A/RES/79/275`, p42: the entrusted Ad Hoc Committee is the actor, rather than the body entrusting it.
- `S/RES/2719(2023)`, p45: the consulted AU Commission chair is no longer automatically made the report assignee.
- `A/RES/58/153`, p15: consultation is kept as part of report preparation, not a separate invented task; the refugee High Commissioner maps to UNHCR/UN-system rather than Secretariat.
- The historical-obligation control `S/RES/2396(2017)`, p58, and the twelve fresh descriptive/acknowledgment controls stay empty. Context-only neighboring assignments are not copied into those targets.

## Residual problems and interpretation limits

1. **Apposition can create a false second actor.** `A/RES/80/105`, p42 (`a-361332a52ed221db9d73cef3`) asks the Secretary-General, described appositionally as President pro tempore of the Special Committee, to meet. Medium emits SG as Secretariat and a second President-pro-tempore actor as UN organ. The first task was missed by the original; recovering it does not justify this duplicated identity/classification.
2. **Broad resource language can become a task.** `A/RES/64/289`, p51 (`a-9c6feae25540af6559670314`) emphasizes broadening the donor base; `A/RES/60/1`, p297 (`a-7c214c064f4848fd9333883d`) emphasizes adequate UN resources. Both were originally empty and now become funding tasks without an identified provider. Under the intended concrete-assignment threshold these are potential false positives. `S/RES/2698(2023)`, p19, similarly captures a conditional review intention; it should not be treated as equivalent in force to a direct instruction.
3. **Mixed paragraphs and subtype boundaries remain judgment-sensitive.** `A/RES/79/140`, p83 (`a-a77a0f94550cffb08a503109`) captures core relief/funding/access work but also produces broad actor-free tasks for need/purpose clauses. Education in `A/RES/80/180`, p73, shifts from operational delivery to policy; these labels are not adjudicated ground truth.
4. **Actor types and canonical names still vary.** `E/RES/2024/8`, p97, appropriately avoids forcing a mixed States/parties collective into one Member-State type, but fails to split its explicit State component. `States` and `Member States` continue to appear as different canonical names. Unresolved types must remain distinguishable from known non-UN actors.
5. **Exact evidence errors persist and rejection matters.** The reviewed rejected replies splice phrases, remove punctuation, change OCR spelling, or cite a context-only output in a target-only field. In `A/RES/174(II)` the frozen source itself mixes corrupted English/French; medium must not silently repair it into an accepted quote. Several semantically plausible tasks are therefore unavailable, not proven absent.

Keep frontend coverage warnings and document-level deduplication. Do not replace missing medium records with original records under a medium label. Displayed percentages are observed matches among sampled documents, potentially biased by rejection and semantic classification errors; they are not a certified share of legally operative mandates.

## Reviewed cases

| Group | Request | Document | Position | Source review outcome |
|---|---|---|---:|---|

| challenge | `a-9797bc7575f610a41ad7b105` | `A/RES/80/172` | 18 | Recovered explicit host-country restrictions task; responsible actor supported. |
| challenge | `a-fabca59ead0f77808dda6f39` | `A/HRC/RES/52/38` | 36 | Recovered parent-governed States task; capacity-building vs policy subtype remains debatable. |
| challenge | `a-45af4200544ce5f1165190b0` | `A/RES/77/315` | 21 | Captured financial set-off decision with implicit GA decision-maker. |
| challenge | `a-9204d56222a6fc3a98566be0` | `A/RES/73/165` | 173 | Separated increased investment from policy task; retained State responsibility. |
| challenge | `a-f471e47b6d6f5ea7775d7805` | `A/RES/35/170` | 18 | Application study/report no longer mislabeled mandate review. |
| challenge | `a-d9cdf47fcc88e84fc7e8bc6a` | `A/RES/70/1` | 333 | Implementation-support review no longer mandate review; governing-body type left unresolved. |
| challenge | `a-7b0ad2323c92387536d64591` | `A/RES/58/153` | 15 | Preserved oral/written reports, removed invented consultation task, corrected UNHCR system type. |
| challenge | `a-73cbed7e6d34c22a9b4754ef` | `A/RES/79/275` | 42 | Assigned structural review to entrusted Ad Hoc Committee rather than entrusting Kimberley Process. |
| challenge | `a-5a6622706defc063db290b7d` | `S/RES/2719(2023)` | 45 | Secretary-General report task retained; consulted AU chair no longer made assignee. |
| challenge | `a-a92914aa580a0d3ed030966e` | `S/RES/2396(2017)` | 58 | Historical obligations remain an empty negative control. |
| challenge | `a-8b38ae816bb64e9cf556cca9` | `E/RES/2024/8` | 97 | Mixed States/parties collective no longer confidently typed Member States, but explicit States component not split. |
| challenge | `a-6874150b33b98442e7c41211` | `A/RES/80/180` | 73 | Assigned education policy retained; beneficiary/partner categories omitted from mentions; subtype changed. |
| challenge | `a-5a88dcf25d5d5c7a76482d15` | `A/RES/75/233` | 92 | Description remains empty; non-organizational activity/process mentions removed. |
| substantive | `a-821f4257edd44460af54cea3` | `S/RES/2692(2023)` | 37 | Support and reporting tasks distinguished; BINUH and UNODC explicit responsibilities separated. |
| substantive | `a-f52b6df367bd70f5c210e22a` | `A/HRC/RES/35/24` | 31 | Investment promotion separated from infrastructure-policy obligation; no invented deliverable. |
| substantive | `a-a77a0f94550cffb08a503109` | `A/RES/79/140` | 83 | Core relief/funding/access tasks supported; broad need/purpose clauses may still be oversplit. |
| reporting | `a-cc9f01c6dd0a89ecd1e9c1f3` | `A/RES/79/248` | 47 | Conference-servicing work and report distinguished without making efficiency review mandate review. |
| reporting | `a-2b24c71017bd1e2cd6a6a6e4` | `A/RES/75/233` | 149 | Regular monitoring/reporting treated as update, not institutional mandate review. |
| reporting | `a-efff5a313381a19714c9afbc` | `A/RES/76/237` | 105 | Explicit continuing SG report captured; cited authors remain mentions. |
| deliberation | `a-361332a52ed221db9d73cef3` | `A/RES/80/105` | 42 | Error: SG and appositional President pro tempore emitted as two differently typed actors. |
| deliberation | `a-52370fb7c298c1c6bab434ef` | `E/RES/2017/7` | 25 | Recommendation for GA adoption treated as issuer procedural task; no invented implementer. |
| deliberation | `a-af140d09600fdbf839d60763` | `A/RES/79/87` | 24 | Committee agenda consideration and contextual COPUOS identity supported. |
| institutional | `a-60b415926da880a2545cd515` | `S/RES/2701(2023)` | 21 | Authority extension, SC decision-maker and affected authority identified. |
| institutional | `a-c4bca5ab6985e1bcff1a4b80` | `A/HRC/RES/52/36` | 13 | Explicit special-rapporteur mandate renewal identified. |
| institutional | `a-533defd828a2e1ac16c51b68` | `A/RES/79/129` | 63 | Recommended working-group establishment assigned to named Sixth Committee. |
| resources | `a-d0358d73a32a5caaacf8a2fc` | `A/RES/79/87` | 49 | New voluntary-contribution invitation distinguished from welcomed historical work. |
| resources | `a-9c6feae25540af6559670314` | `A/RES/64/289` | 51 | Potential overextraction: broad donor-base emphasis becomes funding task, actor unresolved. |
| resources | `a-7c214c064f4848fd9333883d` | `A/RES/60/1` | 297 | Potential overextraction: general adequate-resource aspiration becomes funding task without provider. |
| mandate_review | `a-8da70aa265239a169b2eef6e` | `A/RES/64/289` | 29 | Review targets evaluation institutional framework; consulted bodies not made assignees. |
| mandate_review | `a-25d4ce051ed7103ccc875e86` | `S/RES/2698(2023)` | 19 | Conditional review intention captured; softer commitment than a current concrete instruction. |
| mandate_review | `a-8dae02e33df3433c19c3a6ff` | `A/RES/60/1` | 372 | Explicit SC review of Military Staff Committee composition/mandate captured. |
| empty | `a-cced87f09fe5f94899351cdd` | `E/DEC/2024/330` | 8 | No independent new assignment in supplied target/context; empty is consistent with current-task rule. |
| empty | `a-2a9b74f0ed67dec7fa88829c` | `A/RES/S-10/2` | 18 | No independent new assignment in supplied target/context; empty is consistent with current-task rule. |
| empty | `a-9728439a0e4ab157d369461b` | `A/RES/78/141` | 49 | No independent new assignment in supplied target/context; empty is consistent with current-task rule. |
| empty | `a-25b20a024abcf68f94a8b987` | `A/RES/77/331` | 52 | No independent new assignment in supplied target/context; empty is consistent with current-task rule. |
| empty | `a-8c7c9c28ea15e5978966a1be` | `A/RES/76/83` | 29 | No independent new assignment in supplied target/context; empty is consistent with current-task rule. |
| empty | `a-758bb3dfc72e16c2bc3aad73` | `A/RES/79/161` | 54 | No independent new assignment in supplied target/context; empty is consistent with current-task rule. |
| empty | `a-e4072eee953af047c691c3e7` | `A/RES/78/136` | 37 | No independent new assignment in supplied target/context; empty is consistent with current-task rule. |
| empty | `a-d4010e96e25f9d4a59f8bc12` | `A/RES/77/253B` | 10 | No independent new assignment in supplied target/context; empty is consistent with current-task rule. |
| empty | `a-973b6bd0c87ae12ac266fd1b` | `A/RES/60/1` | 17 | No independent new assignment in supplied target/context; empty is consistent with current-task rule. |
| empty | `a-fc955cfb0f95612861cca919` | `A/RES/80/135` | 32 | No independent new assignment in supplied target/context; empty is consistent with current-task rule. |
| empty | `a-98a759e119cef3726f9d5a63` | `A/RES/78/245` | 142 | No independent new assignment in supplied target/context; empty is consistent with current-task rule. |
| empty | `a-ab5134e2b8f88f05b5f05ef0` | `A/RES/79/273` | 17 | No independent new assignment in supplied target/context; empty is consistent with current-task rule. |
| rejected | `a-e140ad6488c2e3593a67f7c9` | `A/RES/77/300` | 46 | Raw reply fails literal quote/scope validation; quarantine is appropriate. |
| rejected | `a-cad20f451d200466c5b4da46` | `A/RES/174(II)` | 131 | Raw reply fails literal quote/scope validation; quarantine is appropriate. |
| rejected | `a-dfbd18a4b280db1772082720` | `A/RES/60/1` | 166 | Raw reply fails literal quote/scope validation; quarantine is appropriate. |
| rejected | `a-4696cd8afa2a66fc515b9e4a` | `S/RES/2772(2025)` | 6 | Raw reply fails literal quote/scope validation; quarantine is appropriate. |
| rejected | `a-abbc25a7eff2f0e88d627e85` | `A/RES/174(II)` | 28 | Raw reply fails literal quote/scope validation; quarantine is appropriate. |
| rejected | `a-61a68804425f7889de2ddeb3` | `A/RES/76/274` | 64 | Raw reply fails literal quote/scope validation; quarantine is appropriate. |
| rejected | `a-d8474da19afb11ab001a9329` | `A/RES/32/40` | 64 | Raw reply fails literal quote/scope validation; quarantine is appropriate. |
| rejected | `a-ab9e62c67943314537695500` | `A/RES/78/108` | 22 | Raw reply fails literal quote/scope validation; quarantine is appropriate. |
