# DB Grep: Review Clauses / Review Mechanisms

Systematic ILIKE scan over `mandates.paragraphs` (197,369 paragraphs across 2,829 documents; 79,162 operative, 51,060 preambular, 11,769 heading rows). Date: 2026-05-12. Framing: PPB 2026/27.

All counts produced by `psql` against the `mandates.paragraphs` table. Snippets truncated to ~200 chars.

---

## 1. Overall pattern counts

Counts are total paragraph hits / operative-only / preambular-only / heading-only / distinct documents touched.

| Pattern | total | op | pre | hd | docs |
|---|---:|---:|---:|---:|---:|
| review (any) | 6,771 | 3,815 | 1,729 | 168 | 1,670 |
| assess / assessment | 3,764 | 2,328 | 676 | 53 | 1,177 |
| monitor / monitoring | 3,616 | 2,361 | 680 | 74 | 1,235 |
| evaluate / evaluation | 1,545 | 961 | 249 | 41 | 713 |
| effectiveness | 1,352 | 813 | 258 | 14 | 659 |
| renew / renewal | 1,295 | 709 | 424 | 3 | 660 |
| extend / extension | 1,133 | 669 | 274 | 4 | 731 |
| lessons learned | 721 | 496 | 136 | 5 | 413 |
| annual report | 589 | 383 | 55 | 19 | 405 |
| periodic review | 459 | 293 | 105 | 4 | 259 |
| requests the Secretary-General to report | 431 | 392 | 1 | 0 | 291 |
| progress report | 390 | 243 | 76 | 12 | 184 |
| remain (...) seized | 367 | 347 | 2 | 0 | 364 |
| submit a report | 290 | 224 | 16 | 0 | 265 |
| quadrennial comprehensive policy review | 248 | 110 | 118 | 1 | 102 |
| no later than | 236 | 180 | 18 | 0 | 190 |
| comprehensive review | 235 | 117 | 72 | 7 | 169 |
| for a period of | 234 | 175 | 24 | 0 | 210 |
| cite "60/1" | 163 | 12 | 142 | 0 | 155 |
| requests ... to review | 128 | 110 | 0 | 0 | 98 |
| expir* | 116 | 29 | 19 | 4 | 67 |
| decides to consider | 104 | 86 | 2 | 0 | 99 |
| continue to consider | 95 | 87 | 1 | 0 | 86 |
| in advance of | 86 | 52 | 10 | 0 | 67 |
| consider further | 61 | 42 | 7 | 0 | 58 |
| decides to review | 47 | 42 | 0 | 0 | 46 |
| revert to | 35 | 35 | 0 | 0 | 25 |
| taking stock | 34 | 12 | 5 | 13 | 25 |
| mid-term review | 27 | 11 | 7 | 0 | 19 |
| report back | 27 | 21 | 4 | 0 | 23 |
| biennial report | 25 | 15 | 2 | 0 | 18 |
| strategic review | 23 | 10 | 6 | 0 | 18 |
| in-depth review | 22 | 8 | 9 | 1 | 20 |
| will review | 21 | 14 | 5 | 0 | 20 |
| biennialization | 18 | 11 | 1 | 0 | 13 |
| shall be reviewed | 17 | 5 | 4 | 0 | 16 |
| further report | 14 | 9 | 0 | 1 | 12 |
| triennialization | 13 | 7 | 0 | 0 | 10 |
| thorough review | 10 | 4 | 4 | 0 | 9 |
| cite "60/257" | 9 | 3 | 5 | 0 | 6 |
| shall remain in force | 6 | 4 | 0 | 0 | 4 |
| clustering and elimination | 5 | 5 | 0 | 0 | 3 |
| review of mandates | 2 | 2 | 0 | 0 | 1 |
| QCPR (acronym) | 1 | 0 | 1 | 0 | 1 |
| mandate review | 1 | 1 | 0 | 0 | 1 |

Headline: "review" appears in 1,670 of 2,829 documents (59%). The acronym "QCPR" is essentially unused in the corpus — it almost always appears spelled out as "quadrennial comprehensive policy review".

---

## 2. Examples by pattern (operative paragraphs unless noted)

### 2.1 `decides to review`

Highly stylized clause; almost a fixed template at the Human Rights Council.

- `A/HRC/RES/51/7` p70 — *Decides to review the progress of the implementation of the present resolution, as a matter of priority, at its future sessions.*
- `A/HRC/RES/54/6` p37 — *Also decides to review progress in the implementation of the present resolution as a matter of priority at its future sessions.*
- `A/HRC/RES/57/19` p69 — *Decides to review the progress of the implementation of the present resolution, as a matter of priority, at its future sessions.*
- `A/RES/2997(XXVII)` p76 — *Decides to review as appropriate, at its thirty-first session, the above institutional arrangements...*
- `A/RES/319(IV)` p29 — *Decides to review, not later than at its eighth regular session, the arrangements for the High Commissioner's Office for Refugees...*
- `A/RES/45/248` p61 — *Decides to review at its forty-sixth session the arrangements regarding the payment of subsistence allowance...*

### 2.2 `shall be reviewed`

Rare and structural. Used where the review clause is built into the establishing instrument itself.

- `A/RES/72/305` p17 — *Decides that the arrangements contained in the present resolution and its annex shall be reviewed at its seventy-fourth session and at subsequent review cycles...*
- `A/RES/75/290 B` p41 — *The high-level political forum on sustainable development convened under the auspices of the Economic and Social Council...*
- `A/RES/1995(XIX)` p62 — *The lists of States contained in the annex shall be reviewed periodically by the Conference...*
- `A/RES/69/214` p27 — recalling §5 of res 67/203, *...decided to review the arrangement to designate the Economic and Social Council as the ad interim Member State body...*

### 2.3 `remain seized`

The classic terminal/holding clause — see structural analysis (sits at the very end of the operative section, avg relative position 0.974).

- `A/HRC/RES/12/10` p23 — *Decides to remain seized of the implementation of the present resolution.*
- `A/HRC/RES/21/3` p22 — *Decides to remain seized of the matter.*
- `A/HRC/RES/27/31` p34 — *Decides to remain seized of the matter.*
- `A/HRC/RES/28/3` p15 — *Decides to remain seized of the matter.*
- `A/HRC/RES/31/29` p39 — *Also decides to remain seized of this matter.*

Functions as a soft review-trigger: the body retains the agenda item with no scheduled date.

### 2.4 `decides to consider` / `continue to consider` / `consider further`

These are scheduling clauses — they pin a specific future session for review.

- `A/HRC/RES/21/7` p40 — *Decides to consider this matter at its twenty-seventh session under the same agenda item...*
- `A/HRC/RES/52/25` p50 — *Decides to consider this issue, in accordance with its programme of work, at its sixty-first session.*
- `A/RES/42/211` p79 — *Also decides to consider at its forty-third session the question of a comprehensive solution to the problem of all additional expenditures...*
- `A/RES/54/234` p22 — *Decides to consider at its fifty-sixth session the modalities for undertaking the final review and appraisal of the New Agenda...*

`consider further` is mostly used in HRC resolutions citing UNGA's request that HRC consider further proposals for strengthening UN human-rights action.

### 2.5 `revert to`

A budget/admin idiom — defer + commit to re-open.

- `A/RES/55/258` p16 — *Decides to revert to this issue at its fifty-seventh session;*
- `A/RES/59/276` p146 — *Decides to defer consideration of the expansion of the security service fitness facility and to revert to this issue in the context of...*
- `A/RES/60/254` p24 — *...decides to revert to the issue of the terms of reference...*
- `A/RES/60/260` p58 — *...decides to revert to the issue of undertaking a detailed cost-benefit analysis of relocation...*
- `A/RES/60/283` p29 — *Decides to revert to the consideration of the report of the Joint Inspection Unit on policies of United Nations system organizations towards the use of open-source software...*

### 2.6 `requests the Secretary-General to report` (reporting-back proxy)

The single most common review proxy — 392 operative hits in 291 documents.

- `A/RES/2099(XX)` p42 — *Requests the Secretary-General to report on the implementation of the present resolution and decides to include in the provisional agenda of its twenty-first session...*
- `A/RES/35/201` p128 — *Requests the Secretary-General to report on the implementation of the present resolution to the General Assembly at its thirty-sixth session;*
- `A/RES/37/90` p68 — *Further requests the Secretary-General to report to the General Assembly at its thirty-eighth session on the implementation of the present resolution.*
- `A/RES/45/106` p46 — *Requests the Secretary-General to report to the General Assembly at its forty-sixth session on the implementation of the present resolution;*

### 2.7 `no later than`

Time-bounding deadline for review/reporting.

- `A/HRC/RES/52/12` p68 — *Requests the High Commissioner to organize in 2024, and no later than the seventy-seventh session of the World Health Assembly, a one-day consultation...*
- `A/RES/42/211` p78 — *Decides to review the procedures for the use and operation of the contingency fund in the light of experience gained, no later than at its forty-seventh session;*
- `A/RES/50/203` p32 — *Emphasizes that Governments should, as soon as possible and no later than 1996, develop comprehensive implementation strategies...*

### 2.8 `for a period of` (mandate duration)

The standard sunset/extension language for special-procedure mandates.

- `A/HRC/RES/32/19` p62 — *Decides to extend the mandate of the Special Rapporteur on violence against women, its causes and consequence... for a period of [three years]*
- `A/HRC/RES/32/2` p20 — *Decides to appoint, for a period of three years, an Independent Expert on protection against violence and discrimination based on sexual orientation and gender identity...*

### 2.9 `shall remain in force` (rare; SC truce / sanctions framing)

- `S/RES/54(1948)` p30 — *Decides that, subject to further decision by the Security Council or the General Assembly, the truce shall remain in force...*
- `S/RES/1989(2011)` p54 — *Decides that the requirement for States to take the measures described in paragraph 1 of this resolution shall terminate...*

### 2.10 `mandate review` / `review of mandates`

Notable: the term-of-art "mandate review" is *barely used* in the corpus (3 hits total). The actual mandate-review work appears under proxies — biennialization/triennialization, working methods, rationalization.

- `A/RES/79/78` p42 — *...renew the mandate of the Implementation Support Unit agreed to at the Seventh Review Conference, mutatis mutandis, for the period from 2023...*
- `E/CN.9/2006/2` p51 — *The Bureau took note of the review of mandates and outputs in the field of population conducted by the Population Division of the Department of Economic and Social Affairs at the request of the Secretary-General...*

### 2.11 Biennialization / triennialization / clustering and elimination

The actual operative vocabulary for "mandate review" in this corpus.

- `A/520/REV.20` p1128 — *Biennialization and triennialization of items on the agenda of the Main Committees could be considered in accordance with the relevant resolutions of the General Assembly;*
- `A/RES/48/162` p113 — *Work overload in the Second and Third Committees of the Assembly and in the Council shall be avoided through agreed periodicity, such as biennialization and triennialization;*
- `A/RES/57/270 B` p107 — *Underlines that consideration should be given to the biennialization or triennialization of agenda items;*
- `A/RES/59/95` p8 — *Invites Member States to consider the biennialization or triennialization of the agenda items discussed in the First Committee, on a voluntary basis...*
- `A/RES/77/335` p60 — *...further biennialization, triennialization, clustering and elimination [of agenda items]...*
- `A/HRC/PRST/OS/12/1` p22 — *Welcomes the voluntary commitments of States to rationalize their initiatives and related outcomes, including, but not limited to, through biennialization and triennialization...*

### 2.12 `periodic review`

The standard recurring-review formula. Note: in HRC docs, "universal periodic review" is the dominant phrase — about half of the hits are UPR references, not generic periodicity clauses.

- `A/520/REV.20` p1124 — *There shall be periodic reviews of the agenda...* (one of the few "clean" periodic-review clauses)
- `A/HRC/RES/35/22` p26 — *...periodic review and revision of school curricula, textbooks, programmes and teaching methods...*

### 2.13 `comprehensive review`

- `A/RES/61/245` p5–6 — comprehensive review of governance and oversight within the UN
- `A/RES/55/258` p49 — *Requests the International Civil Service Commission to conduct a comprehensive review of the question of mobility...*

### 2.14 QCPR / quadrennial comprehensive policy review

Almost exclusively GA development-operations text.

- `A/RES/67/226` (multiple paras) — the canonical QCPR resolution
- `A/RES/68/1`, `A/RES/63/311` — follow-up references

### 2.15 Citations of 60/1 (World Summit) and 60/257 (mandate review)

- `A/RES/60/260` p64 — *Recalls paragraphs 9 to 15 of its resolution 60/257, paragraph 8 of its resolution 60/259 and paragraphs 4 to 7 of its resolution 60/254...*
- `A/RES/63/276` p15 — *Reaffirms paragraph 2 of its resolution 60/257, in which it endorsed the benchmarking framework for the implementation of results-based management...*
- `A/RES/64/259` p5; `A/RES/76/236` p4; `A/RES/79/247` p4 — recurring "recalling" chains
- `UNEP/GC SS.XI/5` p78 — *...drawing on the results-based management framework endorsed by General Assembly resolution 60/257...*

### 2.16 `mid-term review`

Cited mostly in connection with the New Agenda for the Development of Africa, the IPoA for LDCs, and HRC UPR follow-up — i.e. major decade-scale frameworks.

### 2.17 `strategic review`

- `A/RES/76/274` p86, `A/RES/77/64` p60, `A/RES/79/53` p48 — independent strategic review of UN peacekeeping responses to IEDs
- `A/RES/78/184` p4 — UNHCR decennial strategic review
- `A/79/755` p17 — UNSOS strategic review

### 2.18 `in-depth review`

Tightly associated with the HLPF in the 2030 Agenda follow-up architecture (e.g. `A/RES/75/290 B` p41–43).

### 2.19 `lessons learned` / `effectiveness`

Soft-review vocabulary. 813 operative hits for "effectiveness", 496 for "lessons learned". Often paired with `assess`, `evaluate`.

### 2.20 `taking stock` / `stocktaking`

- `A/HRC/PRST/OS/13/1` p26 — *Decides to implement the measures contained in the present statement on a trial basis for one year, and requests the President of the Human Rights Council to organize an informal stocktaking...*
- `A/HRC/PRST/OS/15/1` p13 — *Decides to extend the measures contained in President's statement PRST OS/13/1 for one additional year...*
- `A/HRC/RES/34/17` p19; `A/HRC/RES/52/15` p22 — periodic workshops to take stock of regional human-rights mechanisms

---

## 3. Structural / positional analysis

Position normalised per document (`(position − min) / (max − min)` over operative paragraphs only — 1.0 = last operative paragraph).

| Pattern | n | avg rel. position |
|---|---:|---:|
| ALL operative paragraphs (baseline) | 79,160 | 0.497 |
| operative paragraphs containing "review" | 3,815 | 0.519 |
| operative paragraphs with `remain (...) seized` | 347 | **0.974** |
| operative paragraphs with `decides to review` | 42 | **0.819** |
| operative paragraphs with `requests the Secretary-General to report` | 392 | **0.745** |

Findings:

- **`remain seized` is essentially a closing marker** — it sits at the very tail of operative paragraphs in every document where it appears. This is a structural signal: the presence of `remain seized` reliably identifies the last 1–3 operative paragraphs of an HRC/SC-style resolution.
- **`decides to review` and SG-reporting clauses cluster strongly in the back third** of operative content (relative positions ~0.75–0.82). They are review-clauses-as-tail-matter — a clear pattern to exploit for downstream extraction (look at the bottom ~25% of operative paragraphs in each document).
- The bare term "review" is only mildly back-loaded (0.519 vs 0.497) — that's because "review" also appears mid-document in substantive contexts (e.g. "universal periodic review", "review of legislation").

Type distribution of "review" hits:

| type | paragraph_type | review count | total rows |
|---|---|---:|---:|
| paragraph | operative | 3,815 | 79,162 |
| paragraph | preambular | 1,729 | 51,060 |
| backmatter | (NULL) | 567 | 26,321 |
| frontmatter | (NULL) | 383 | 24,425 |
| heading | (NULL) | 168 | 11,769 |
| title | (NULL) | 76 | 2,383 |

The 168 heading-level hits are worth a separate look: documents whose heading text contains "review" are themselves *about* a review (e.g. QCPR, strategic reviews, mid-term reviews).

---

## 4. Top documents by review-clause density (operative)

Density = share of operative paragraphs matching any of {`review`, `remain seized`, `report back`, `submit a report`, `requests the Secretary-General to report`, `decides/continue to consider`, `shall be reviewed`, `no later than`, `evaluat*`, `assess*`, `monitor*`}. Filtered to documents with ≥5 operative paragraphs.

| document_symbol | op total | review-clause paras | % |
|---|---:|---:|---:|
| `A/HRC/RES/51/30` | 8 | 8 | 100.0 |
| `A/RES/66/293` | 12 | 11 | 91.7 |
| `E/RES/2020/8` | 19 | 16 | 84.2 |
| `E/RES/2022/5` | 5 | 4 | 80.0 |
| `A/RES/74/298` | 8 | 6 | 75.0 |
| `A/RES/75/290 B` | 49 | 32 | 65.3 |
| `E/RES/2013/5` | 36 | 23 | 63.9 |
| `A/HRC/RES/54/28` | 19 | 12 | 63.2 |
| `E/RES/2023/12` | 13 | 8 | 61.5 |
| `E/RES/2021/8` | 13 | 8 | 61.5 |
| `A/RES/77/334` | 5 | 3 | 60.0 |
| `E/RES/1991/44` | 5 | 3 | 60.0 |
| `A/RES/73/226` | 12 | 7 | 58.3 |
| `A/HRC/RES/35/29` | 7 | 4 | 57.1 |
| `A/RES/74/238` | 7 | 4 | 57.1 |
| `A/RES/78/309` | 16 | 9 | 56.3 |
| `A/HRC/RES/36/29` | 9 | 5 | 55.6 |
| `A/RES/71/313` | 11 | 6 | 54.5 |
| `E/RES/2022/19` | 17 | 9 | 52.9 |
| `A/RES/79/78` | 27 | 14 | 51.9 |
| `A/RES/78/257` | 24 | 12 | 50.0 |
| `UNEP/GC SS.XII/4` | 16 | 8 | 50.0 |
| `E/RES/2021/11` | 14 | 7 | 50.0 |
| `E/RES/2017/7` | 12 | 6 | 50.0 |
| `A/RES/54/234` | 10 | 5 | 50.0 |

Notable clusters:

- ECOSOC `E/RES/...` resolutions are heavily over-represented — they are typically thin, follow-up-style instruments whose operative body is largely a request-to-report.
- `A/RES/75/290 B` (HLPF review/architecture, 65% review-clause density) and `A/RES/79/78` (BWC ISU mandate, 52%) are good candidates for **manual inspection** as exemplars of dense, well-structured review architectures.
- `A/HRC/RES/51/30` and `A/RES/66/293` are tiny dense docs — likely "follow-up" resolutions.

---

## 5. Variant phrasings observed in the wild (additions to the starter list)

Things downstream extraction should also catch:

1. **`keep under review` / `keeping under review`** — strong recurring formula, especially in older GA resolutions (e.g. `A/RES/1995(XIX)`, `A/RES/2997(XXVII)`, `A/RES/32/197`, `A/RES/47/191`, `A/RES/52/220`). Equivalent to "remain seized" but with a substantive review obligation attached.
2. **`subject to review` / `subject to review every X years`** — formal review-trigger clause; e.g. `A/RES/13(I)` p86: *"...shall be subject to review every five years..."*; `A/RES/45/110` p87, p137 (criminal-justice contexts).
3. **`stocktaking`** (as a noun) — informal review formulation, esp. HRC Presidential Statements (`A/HRC/PRST/OS/13/1`, `OS/15/1`).
4. **`sunset provisions` / `sunset clauses`** — only 8 hits but explicitly the concept: `A/51/950` p157 (Annan reform), `A/RES/57/300` p43, `A/RES/77/335` p41, `A/RES/69/321`, `A/RES/70/305`.
5. **`review every two years` / `every three years` / `every five years`** — explicit periodicity clauses; 70 operative hits. Examples: `A/RES/61/296`, `A/RES/65/274`, `A/RES/67/302` (UN–AU cooperation review every 2 years).
6. **`include in the provisional agenda of its [Nth] session`** — 567 hits. Functions as an implicit review-scheduling clause (the very common GA pattern: "requests SG to report ... + decides to include in provisional agenda of its Nth session"). The pair is the canonical GA review architecture.
7. **`oral report` / `oral update` / `oral briefing`** — 54 / 116 hits. Lighter-weight reporting obligations than "submit a report".
8. **`final review and appraisal`** — used for decade-scale plans (e.g. `A/RES/54/234` re: the New Agenda for Africa).
9. **`review the implementation of the present resolution`** — 149 hits; the canonical self-referential review clause.
10. **`as a matter of priority, at its future sessions`** — HRC boilerplate; goes with `decides to review` and `decides to consider`. Pattern: "Decides to review the progress of the implementation of the present resolution, as a matter of priority, at its future sessions."
11. **`on an annual basis`** — 71 operative hits; alternative phrasing to "annually" / "annual report".
12. **`subsequent review cycles`** — appears in `A/RES/72/305` and `A/RES/75/290 B` (HLPF architecture).
13. **`mutatis mutandis`** clauses for renewing mandates (e.g. BWC ISU in `A/RES/79/78`) — a renewal mechanism that piggy-backs on a prior review decision.
14. **`benchmarking framework`** — `A/RES/60/257` p2 introduces this for RBM; recurringly cited by later resolutions.
15. **`rationalization` / `working methods`** — 528 hits. The operational language for mandate-review work at the GA Main Committee level.
16. **`with a view to`** — 2,063 operative hits — very common framing that often precedes a review obligation (e.g. "...with a view to assessing/evaluating/considering further at the Nth session...").
17. **`follow-up`** — 1,599 operative hits; the catch-all review-adjacent term, especially in development-conference outcomes.
18. **HRC-style "Decides to remain seized of the matter."** — explicitly closing-formula; almost always the *very last* operative paragraph (mean relative position 0.974).
19. **`independent strategic review`** — specific peacekeeping-context formula (UNISFA, UNSOS, IED responses, UNHCR decennial).
20. **`in the context of the proposed [budget] / consideration of`** — Fifth Committee deferral language; appears with `revert to`.
21. **`progress made` + "review"** — common collocation in HRC.
22. **`programme of work`** — HRC scheduling vocabulary, paired with `consider this issue ... in accordance with its programme of work`.

---

## 6. Recommendations for the manual-inspection phase

1. **Start with the top-density docs in §4** — particularly `A/RES/75/290 B`, `A/RES/79/78`, `A/RES/67/226` (QCPR), `A/RES/72/305` (HLPF), `A/RES/77/335`, and the ECOSOC cluster (`E/RES/2020/8`, `E/RES/2013/5`, `E/RES/2022/19`).
2. **Exploit positional priors**: in any document, the last ~25% of operative paragraphs is where review clauses cluster. Build the manual-inspection workflow to surface those rows first.
3. **Watch for "include in the provisional agenda"** — this 567-hit pattern is the GA's canonical implicit review clause and is currently underweighted in the starter list. It's distinct from "decides to consider" because it is procedural-only (the review obligation is on the *agenda*, not the *body*).
4. **Treat `remain seized` as a structural marker, not a review clause** — it indicates *no* scheduled review but rather a standing item.
5. **The umbrella mandate-review vocabulary in this corpus is biennialization / triennialization / clustering / rationalization**, *not* the literal phrase "mandate review". Any downstream classifier or query needs to include those terms.
6. **The Annan-era reform residue** is clearly visible: `A/51/950` (1997 reform), `60/1` (2005 World Summit), `60/257` (2006 mandate review). Documents citing `60/257` are a small but important set (6 docs) — they are the legal anchor for current mandate-review work.
