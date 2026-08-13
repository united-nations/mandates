# UN Resolution Action-Verb Taxonomy — Empirical Evidence Base

Read-only analysis of Postgres (`DATABASE_URL`) run 2026-07-19. Two independent corpora:

- **`digitallibrary.document_paragraphs`** — 102,944 rows, 1,605 distinct documents. The *deterministic parser* output (current, growing). Verb signal in `lead_verb` (the leading italic run) + `text`.
- **`mandates.paragraph_mandates`** (13,310 rows) + `mandate_assignees` / `mandate_deliverables` — the *legacy LLM* extraction over ~2.8k legacy paragraphs. This is the taxonomy to audit/learn from.

### Corpus shape (`document_paragraphs`)

`type`: paragraph 76,294 · footnote 12,779 · frontmatter 7,096 · signature 2,477 · title 1,656 · opening 1,558 · heading 711 · vote_record 275 · table 85 · divider 13.

`paragraph_type`: **operative 39,564 · preambular 28,696 · null 34,684** (null = frontmatter/footnotes/openings/sub-items).

`lead_verb` coverage (type=paragraph): operative 87.9% (34,782/39,564), preambular **99.1%** (26,890/27,138), null-ptype 30.4%. **`lead_verb` is 100% a literal prefix of `text`** (position=1 in every populated row) — it is trustworthy as "the leading run", but is occasionally truncated to a bare adverb (e.g. `lead_verb='Strongly'`, 309 rows, where the finite verb sits in `text`). Conclusion: extract from `text` for the verb head, use `lead_verb` only as a cross-check.

### Family breakdown (by `symbol_normalized` regex)

| Family | regex | docs | operative | preambular |
|---|---|---:|---:|---:|
| A/RES (GA) | `^A/RES/` | 1,020 | 28,116 | 19,305 |
| A/HRC/RES | `^A/HRC/` | 297 | 6,444 | 6,146 |
| S/RES (SC) | `^S/RES/` | 154 | 2,959 | 2,083 |
| E/RES (ECOSOC) | `^E/(RES/|[0-9])` | 73 | 2,036 | 1,162 |
| S/PRST | `^S/PRST/` | 61 | **9** | **0** |

**PRSTs are structurally different** and need bespoke handling: they carry *no* `paragraph_type`, *no* `lead_verb`, and are quoted narrative prose whose subject is the collective organ, not an italic verb — e.g. `"The members of the Security Council express their concern over…"`, `"They reaffirm their commitment to…"`. The italic-verb-at-paragraph-start model does not apply to them. (Excluded from the per-family verb tables below.)

### Method note — core-verb normalizer

For the inventory I strip 1–3 leading adverb modifiers (`also|further|once again|strongly|deeply|gravely|seriously|firmly|fully|solemnly|vehemently|resolutely|categorically|unequivocally|particularly|especially|therefore|moreover|likewise|similarly|equally|finally|accordingly|nevertheless|hereby|expressly|…`) from `lower(text)` and take the first token as the head. (Postgres ARE uses `\y`/`\m`/`\M` for word boundaries — **`\b` matches backspace, not a boundary** — a real trap when writing these regexes.) Multi-word verbs (`calls upon` vs `calls for`, `takes note of` vs `takes note with`) collapse to the head token in the tables; they are disambiguated separately in §A.4 and §D.

---

## A. VERB INVENTORY (empirically ranked, from `text`)

### A.1 Operative verb heads by family (top ~30, adverbs stripped)

Ranks below `c`; `to`/`the`/`we`/`a` heads are **sub-paragraph continuations & chapeau lines**, not verbs (see §F).

**A/RES (GA), operative**

| verb | c | verb | c | verb | c |
|---|---:|---|---:|---|---:|
| encourages | 2975 | recalls | 1376 | expresses | 721 |
| calls | 2266 | urges | 1278 | reiterates | 640 |
| requests | 2252 | reaffirms | 1272 | acknowledges | 431 |
| notes | 1818 | takes | 1146 | underlines | 265 |
| welcomes | 1682 | invites | 1001 | endorses | 182 |
| recognizes | 1648 | stresses | 905 | condemns | 177 |
| decides | 1423 | emphasizes | 758 | commends | 165 |
| — | — | *(to 758, the 339, we 211 = continuations)* | | recommends 105, approves 96, affirms 95, underscores 92, demands 62, looks 60, appeals 53, supports 50 |

**S/RES (SC), operative** — note SC-specific `authorizes/authorises` (51), `directs` (23), and imperative sub-items (`provide`, `support`, `protection`, `implementing`, `continue`):

| verb | c | verb | c |
|---|---:|---|---:|
| decides | 395 | condemns | 61 |
| requests | 359 | demands | 54 |
| calls | 216 | notes | 43 |
| encourages | 159 | affirms | 36 |
| urges | 122 | takes | 32 |
| recalls / welcomes / reaffirms | 99 each | authorises 28 / authorizes 23 | |
| expresses | 82 | directs | 23 |
| reiterates | 79 | underlines/underscores | 28/26 |
| stresses | 57 | commends | 11 |

*(`to` 218, `the` 40 = continuations.)*

**E/RES (ECOSOC), operative:** encourages 208, recognizes 165, requests 157, calls 148, welcomes 108, urges 104, invites 92, reaffirms 88, takes 87, notes 80, recalls 60, stresses 52, emphasizes 47, reiterates 45, decides 44, acknowledges 30, recommends 28, expresses 26, endorses 8. *(`to` 256, `the` 44 = continuations — ECOSOC uses the chapeau+sub-item form heavily.)*

**A/HRC/RES, operative** — most directive-heavy; `condemns`/`deplores`/`demands` rank higher than GA (HRC condemnation language): requests 747, calls 747, encourages 528, decides 469, urges 420, welcomes 308, expresses 231, **condemns 178**, reaffirms 164, invites 153, recognizes 152, stresses 145, reiterates 126, notes 122, takes 102, recalls 100, emphasizes 74, acknowledges 73, **demands 60**, **deplores 45**, underlines 35, affirms 33, commends 33. *(`to` 651, `the` 146 = continuations; many gerund sub-items: ensuring 48, promoting 30, adopting 18, encouraging 17, providing 15.)*

### A.2 Preambular participial leads by family (top ~30)

Preambular is more uniform than operative and better-anchored (99% `lead_verb`). Includes adjectival participles (`concerned`, `convinced`, `mindful`, `aware`, `conscious`, `alarmed`, `guided`) that are not `-ing` verbs.

**A/RES (GA), preambular:** recalling 3875, recognizing 2572, noting 1993, reaffirming 1924, welcoming 1148, taking 830, expressing 651, stressing 553, **concerned 525**, emphasizing 521, acknowledging 487, having 319, reiterating 291, **convinced 252**, **mindful 250**, bearing 244, underlining 220, condemning 122, **aware 118**, **conscious 102**, considering 99, **guided 97**, encouraging 92, affirming 84, highlighting 78, underscoring 64, deploring 53, **alarmed 53**, looking 52, commending 47.

**S/RES (SC), preambular** — SC-only Chapter-VII markers **`acting` (71)** and **`determining` (62)**: recalling 321, expressing 248, reaffirming 192, welcoming 101, noting 95, taking 91, stressing 81, recognizing 76, reiterating 75, **acting 71**, condemning 70, **determining 62**, underscoring 41, underlining 36, emphasizing 34, calling 33, encouraging 29, commending 25, urging 25.

**E/RES:** recalling 294, recognizing 184, noting 113, reaffirming 98, expressing 58, taking 52, acknowledging 39, welcoming 38, stressing 28, concerned 28, bearing 20, emphasizing 19, reiterating 16, condemning 8, mindful 8.

**A/HRC/RES, preambular** — `guided` very high (guided by the Charter/UDHR): recalling 1173, recognizing 754, reaffirming 644, noting 490, expressing 462, welcoming 331, **guided 242**, acknowledging 240, **concerned 233**, stressing 216, emphasizing 181, taking 150, condemning 83, underlining 82, reiterating 75, **deploring 55**, bearing 53, affirming 48, **alarmed 40**, underscoring 38, highlighting 31, mindful 28.

### A.3 Modifier patterns

**Leading adverb modifiers (operative, count at text-start):**

| modifier | c | modifier | c |
|---|---:|---|---:|
| Also | 3,116 | Fully | 11 |
| Further | 807 | Deeply | 6 |
| Strongly | 315 | Firmly | 4 |
| Urgently | 19 | Unequivocally | 1 |
| Once again | 16 | | |

`Strongly` + verb (operative): **strongly condemns 144**, strongly encourages 66, strongly urges 64, strongly deplores 7, strongly objects 6, strongly reaffirms 5, strongly appeals 4.

**`Expresses [its/deep/grave/serious] X`** (object of "express", operative+preamb): concern 1,754 · appreciation 356 · alarm 46 · gratitude 36 · intention 27 · support 26 · regret 20 · satisfaction 18. → "express" is a *carrier*; the polarity lives in the object noun.

**`Takes/-ing note with X`:** appreciation 813 · concern 405 · satisfaction 171 · interest 34 · regret 18 · alarm 3. → neutral "note" is coloured by the `with`-qualifier.

**Compound / multi-directive paragraphs** (a paragraph carrying a *second* verb after "and", within operative text): `and encourages` 1,925 · `and requests` 1,252 · `and calls upon` 1,027 · `and invites` 574. Leading compound `Welcomes and X`: welcomes-and-encourages 25, -expresses 7, -supports 4, -urges 3. → **paragraphs are frequently multi-mandate**; a one-verb-per-paragraph parser under-counts. The legacy LLM captured this via `mandate_index` (13,310 mandates over ~2.8k paragraphs ⇒ ~4–5 mandates/paragraph average where present).

### A.4 Multi-word verb disambiguation (operative)

- **calls upon 2,896 (directive, takes assignee) · calls on 121 · calls for 338 (impersonal — no assignee, "calls for the immediate cessation of…").** Splitting `calls` is essential: `calls upon/on` ⇒ directive-with-actor, `calls for` ⇒ impersonal demand.
- **takes note of 1,105 (neutral) · takes note with appreciation 192 (positive) · takes note with concern 2.**

---

## B. LEGACY TAXONOMY AUDIT (`paragraph_mandates`)

13,310 mandates; 647 distinct `action_verb` (verbatim) → **71 distinct `action_verb_normalized`**. Type distribution:

| action_verb_type | count | % |
|---|---:|---:|
| directive | 3,355 | 25.2 |
| observing | 2,981 | 22.4 |
| reinforcing | 2,956 | 22.2 |
| deciding | 1,472 | 11.1 |
| evaluative | 1,310 | 9.8 |
| **NULL** | 1,236 | 9.3 |

### B.1 Full 71-verb × type matrix

Sorted by frequency. Columns: dir=directive, obs=observing, rei=reinforcing, dec=deciding, eva=evaluative, ∅=null.

| normalized | total | dir | obs | rei | dec | eva | ∅ |
|---|---:|---:|---:|---:|---:|---:|---:|
| recognize | 1382 | | 1356 | 15 | | 11 | |
| *(blank verb)* | 1244 | | | 5 | 1 | 2 | **1236** |
| encourage | 1075 | 1073 | | 1 | | 1 | |
| note | 919 | | 896 | | | 23 | |
| reaffirm | 853 | | | 853 | | | |
| recall | 701 | | | 701 | | | |
| request | 672 | 672 | | | | | |
| call upon | 601 | 601 | | | | | |
| decide | 582 | | | | 582 | | |
| welcome | 575 | | | | | 575 | |
| commit | 532 | | | | 532 | | |
| urge | 483 | 483 | | | | | |
| stress | 438 | | | 436 | | 2 | |
| emphasize | 367 | | | 366 | | 1 | |
| take note | 351 | | 351 | | | | |
| acknowledge | 285 | | 275 | 2 | | 8 | |
| reiterate | 276 | | | 276 | | | |
| invite | 272 | 272 | | | | | |
| call for | 186 | 186 | | | | | |
| support | 166 | | | | | 166 | |
| underline | 151 | | | 151 | | | |
| look forward | 134 | | | | | 134 | |
| express concern | 131 | | | | | 131 | |
| be concerned | 110 | | | | | 110 | |
| resolve | 88 | | | | 88 | | |
| underscore | 76 | | | 76 | | | |
| consider | 57 | 1 | 56 | | | | |
| endorse | 54 | | | | 54 | | |
| highlight | 53 | | | 53 | | | |
| express | 42 | | | | | 42 | |
| appreciate | 37 | | | | | 37 | |
| approve | 33 | | | | 33 | | |
| commend | 33 | | | | | 33 | |
| recommit | 32 | | | | 32 | | |
| recommend | 31 | 31 | | | | | |
| continue | 31 | | | | 31 | | |
| bear in mind | 28 | | 27 | 1 | | | |
| adopt | 26 | | | | 26 | | |
| must | 25 | 3 | | | 22 | | |
| call on | 22 | 22 | | | | | |
| affirm | 20 | | 1 | 18 | 1 | | |
| condemn | 19 | | | | | 19 | |
| appropriate | 14 | | | | 14 | | |
| authorize | 12 | | | | 12 | | |
| determine | 11 | | | | 11 | | |
| having considered | 10 | | 10 | | | | |
| pledge | 7 | | | | 7 | | |
| establish | 7 | | | | 7 | | |
| renew | 6 | | | | 6 | | |
| confirm | 5 | | 4 | 1 | | | |
| agree | 5 | | | | 5 | | |
| regret | 5 | | | | | 5 | |
| remain | 4 | | | | 4 | | |
| demand | 4 | 4 | | | | | |
| remind | 4 | 4 | | | | | |
| declare | 3 | | | | 3 | | |
| deplore | 2 | | | | | 2 | |
| trust | 2 | | | | | 2 | |
| state | 2 | | 2 | | | | |
| be convinced | 2 | | | | | 2 | |
| others (1 each) | 14 | maintain, express appreciation, engage(dir), direct(dir), reject, ask(dir), reconfirm, be encouraged, congratulate, observe, realize, be conscious | | | | | |

### B.2 Where the LLM was inconsistent

- **Split-type verbs** (same normalized verb, multiple `action_verb_type`): `recognize` (obs 1356 / rei 15 / eva 11), `note` (obs 896 / eva 23), `stress` (rei 436 / eva 2), `emphasize` (rei 366 / eva 1), `acknowledge` (obs 275 / rei 2 / eva 8), `consider` (obs 56 / dir 1), `affirm` (rei 18 / obs 1 / dec 1), `must` (dec 22 / dir 3), `confirm` (obs 4 / rei 1), `bear in mind` (obs 27 / rei 1). These are the *genuinely ambiguous* verbs — same lemma reads as "noting a fact" vs "reinforcing a principle" vs "evaluating positively" depending on object. A deterministic parser should assign a **default type per verb but flag these ~10 as context-dependent**.
- **NULL type**: 1,236 of the 1,244 blank-`action_verb` rows are un-typed — i.e. the NULLs are almost entirely rows where the LLM failed to extract *any* verb, not typed-but-null. Only ~8 typed rows lack a verb. So the taxonomy is ~90.7% verb-populated.

### B.3 Verbatim → normalized mapping (what the normalization does)

From inspecting the many→one collapses (e.g. into `recognize`, `request`, `stress`, `welcome`, `call upon`):

1. **Lemmatize to base infinitive**: `Recognizes / recognizing / Recognized / Recognize` → `recognize`; `Requests / requested / is requested / shall be requested` → `request`.
2. **Collapse preambular participle and operative present tense to the same lemma** — `Recognizing` (preambular) and `Recognizes` (operative) both → `recognize`. The preambular/operative distinction is *not* in the normalized verb; it is carried by `action_verb_type` (observing/reinforcing vs directive/deciding).
3. **Strip leading adverbs**: `Also requests / Further requests` → `request`; `Recognizing also / further` → `recognize`.
4. **Strip `with X` qualifiers**: `Recognizes with appreciation / with deep concern` → `recognize`; `Stresses the importance` → `stress`.
5. **Passive → active**: `are called upon / is requested` → `call upon` / `request`.
6. **Some semantic merges that are lossy/questionable**: `Appeals → call upon`; `Realizing/Realizes → recognize`; `are encouraged / is encouraged by → welcome`; `ask → request`. These blur intensity and are worth re-examining in a fresh taxonomy.

---

## C. ASSIGNEE PATTERNS (directive verbs)

`mandate_assignees.mandate_id → paragraph_mandates.id`. Overall `assignee_type`: Member States 1,436 · UN Organs 1,369 · other 1,182 · UN Secretariat 831 · UN System 808.

### C.1 Top assignee_normalized for *directive* mandates

| assignee | c | assignee | c | assignee | c |
|---|---:|---|---:|---|---:|
| Member States | 1108 | UN agencies | 68 | ECOSOC | 18 |
| UN Secretary-General | 581 | international community | 65 | regional commissions | 16 |
| UN System | 237 | UN programmes | 64 | GA | 16 |
| UN Development System | 199 | UN funds | 62 | Pres. of the GA | 14 |
| international organizations | 134 | regional organizations | 57 | CSTD | 14 |
| private sector | 79 | UN | 47 | UN-Women | 11 |
| int'l financial institutions | 71 | NGOs / civil society | 30 / 29 | UNODC | 10 |

Two dominant classes: **sovereign actors** (Member States/States/Governments, 1,100+) and **the Secretariat** (Secretary-General, 581).

### C.2 Syntactic pattern — "Verb [the] ASSIGNEE to …"

Structural signals over 2,844 distinct directive paragraphs:

| signal | count | % |
|---|---:|---:|
| contains a `to`-infinitive | 2,726 | **95.8** |
| `to` occurs *before* the first comma (clean single "Verb NP to X") | 1,677 | **59.0** |
| starts `Verb (the) the Secretary-General …` | 220 | 7.7 |
| starts `Verb (all/the) Member States/States/Governments …` | 362 | 12.7 |

**Naive heuristic — "assignee = text span between the leading verb and the first ` to `":** eyeballed on a random 50 (verbs Requests/Calls upon/Urges/Invites/Encourages/Recommends/Demands):

- **~30/50 fully correct** — single clean assignee whose head noun = the normalized assignee. `Requests the Secretary-General to report…`, `Calls upon Member States to consider…`, `Urges multilateral development banks to bring…`.
- **~17/50 partially correct** — the span is right but contains (a) a **coordinated list** (`Member States, international organizations, the private sector and other partners to…`) where the LLM picked one member, or (b) an **intervening qualifier clause** (`Member States, when legislative and budgetary provisions allow, to…`; `the Commission…, within its mandate, to…`; `all States, in cooperation with the IMO…, to…`). The head noun is still recoverable.
- **~3/50 fail** — no `to`-infinitive (`Recommends the provisional rules … for adoption by the Conference`), or the true assignee is buried deep in a long list (`… and new partners to deliver…` with assignee=`new partners`).

**Estimate:** the naive span heuristic recovers the correct assignee **head noun ~90%+** of the time and an exact single-assignee string **~55–60%** of the time. The 41% of paragraphs with a comma before `to` are exactly the list/qualifier cases needing extra parsing (split on `and`/commas, strip parenthetical `, … ,` clauses). ~4% have no `to`-anchor (`recommends X for adoption by Y`, `calls for …`).

---

## D. EXTRA-DIMENSION EVIDENCE

### D.1 Force / intensity — bare vs adverb-escalated (operative)

| verb | bare start | +strongly | +deeply/gravely/seriously | +urgently |
|---|---:|---:|---:|---:|
| condemns | 224 | **144 (39%)** | 0 | 0 |
| urges | 1,689 | 64 | 0 | 0 |
| encourages | 3,418 | 66 | 0 | 0 |
| deplores | 64 | 7 | 3 | 0 |
| regrets | 14 | 0 | 3 | 0 |
| calls | 3,021 | 2 | 0 | 10 |
| requests | 3,049 | 0 | 0 | 4 |
| welcomes / reaffirms | 1,883 / 1,371 | 2 / 5 | 0 | 0 |

Escalation is **verb-specific**: `condemn` is escalated ~39% of the time (`strongly condemns`), and escalation clusters on the negative/directive end (condemn, urge, deplore). A directive-intensity ordering emerges from the data: **`takes note of` < `notes` < `invites` < `encourages` < `calls upon` < `urges` < `strongly urges` < `demands` < `condemns` / `strongly condemns`**. `demands` (153) is SC/HRC-heavy and never softened; `requests`/`invites` are addressed to cooperative actors and rarely escalated.

### D.2 Sentiment polarity (operative + preambular)

| polarity | verb | c |
|---|---|---:|
| POS | welcomes / welcoming | 2,197 / 1,618 |
| POS | commends / commending | 213 / 93 |
| POS | endorses | 195 |
| POS | supports | 58 |
| POS | appreciates / appreciating | 40 / 15 |
| NEG | concerned (preamb) | 750 |
| NEG | condemns / condemning | 403 / 285 |
| NEG | deploring / deplores | 114 / 78 |
| NEG | alarmed | 96 |
| NEG | regretting / regrets | 19 / 18 |
| NEG | rejects / denounces | 11 / 2 |

Positive appraisal (welcome/commend, ~4,400) hugely outweighs negative (~1,900). Polarity is often *not* in the verb but in a carrier + object: `expresses concern` (1,754) / `expresses appreciation` (356); `takes note with appreciation` (813) / `with concern` (405). A parser must read the object noun to score polarity for the carrier verbs `express` and `take note`.

### D.3 Repetition / back-reference markers (operative + preambular)

| marker | c | reads as |
|---|---:|---|
| Recalls / Recalling | 7,035 | reference to prior resolution/principle |
| Reaffirms / Reaffirming | 4,234 | re-endorses existing text |
| Also (leading) | 3,129 | adds to immediately-prior paragraph |
| Reiterates / Reiterating | 1,311 | repeats a prior call |
| Further (leading) | 824 | extends prior paragraph |
| "…again…" (mid) | 370 | |
| Once again | 16 | |

`Recall/Reaffirm/Reiterate` + leading `Also/Further` = ~16,900 paragraph-openings that **point at other text** rather than create new obligation — a "novelty=0 / back-reference" flag the taxonomy should carry (relevant to de-duplicating mandates).

### D.4 Actor-dependence — same verb, different actor class

`action_verb_normalized × assignee_type` (legacy):

| verb | Member States | UN Secretariat | UN System | UN Organs | other |
|---|---:|---:|---:|---:|---:|
| **request** | **7** | **520** | 108 | 22 | 51 |
| call upon | 334 | 34 | 266 | 10 | 146 |
| urge | 306 | 35 | 103 | 2 | 152 |
| encourage | 527 | 101 | 151 | 35 | 346 |
| invite | 88 | 30 | 114 | 32 | 223 |

**Verb choice is strongly conditioned by addressee.** `request` is aimed at the **Secretariat** (520) and essentially never at Member States (7) — you *request* the Secretary-General but *call upon / urge / encourage* sovereign states. `call upon`/`urge` skew Member States; `invite` skews "other" (external bodies, conferences) and the UN system. This actor-dependence is a first-class taxonomy dimension, not noise: the same illocutionary force ("do X") is lexicalised differently by addressee sovereignty.

---

## E. BUDGET-RELEVANCE SIGNAL

### E.1 Deliverable types (`mandate_deliverables`, 8,140 rows)

Distribution: policy 2,200 · financial_resources 878 · capacity_building 734 · information_sharing 614 · analysis 550 · infrastructure 491 · strategy 435 · meeting 368 · technical_assistance 351 · standards 351 · **report 332** · review 254 · legislation 207 · humanitarian_assistance 171 · recommendations 114 · update 67 · briefing 23.

### E.2 Which verbs carry which deliverables

| verb | signature deliverables (top types) |
|---|---|
| **request** | **report 202**, policy 148, **analysis 124**, information_sharing 81, **recommendations 58**, review 55, standards 51, **update 43**, briefing 8 |
| **decide** | policy 187, **meeting 98** (sessions/conferences), financial_resources 72, review 18, report 17 |
| **appropriate / approve / authorize** | **financial_resources 12 / 18 / 10** (near-exclusively) |
| encourage | policy 271, financial_resources 166, information_sharing 149, capacity_building 130, analysis 122 |
| urge | policy 263, financial_resources 131, capacity_building 101 |
| call upon | policy 282, financial_resources 103, capacity_building 94 |
| invite | policy 51, financial_resources 46, meeting 30 |

**Budget-relevant verb signatures:**
- **`request`** = the reporting/documentation engine → owns `report` (202/332 of all report deliverables), `analysis`, `recommendations`, `update`, `briefing`. These are recurring Secretariat outputs = staff time / DGACM costs.
- **`decide`** = creates **meetings/conferences/sessions** (98 of 368 meeting deliverables) and bodies = conference-servicing costs.
- **`appropriate` / `approve` / `authorize`** = **direct financial** verbs (money & operations), almost only `financial_resources`.

### E.3 Budget-phrase co-occurrence (operative text)

Overall prevalence: voluntary contributions 408 · **within existing resources 304** · extrabudgetary 76 · regular budget 74 · programme budget implications 4.

By leading verb (rows containing any budget phrase):

| verb | within existing res. | extrabudgetary | any budget phrase |
|---|---:|---:|---:|
| requests | 108 | 22 | **167** |
| invites | 19 | 16 | 107 |
| encourages | 28 | 3 | 64 |
| stresses | 5 | 1 | 55 |
| decides | 12 | 8 | 50 |
| recalls | 20 | 1 | 41 |
| welcomes | 12 | 6 | 39 |
| notes | 23 | 1 | 35 |
| authorizes | 1 | 0 | 19 |

**`requests` dominates budget language** (167 hits; 108 "within existing resources") — the classic zero-cost hedge `Requests the Secretary-General, within existing resources, to …`. `invites` co-occurs with `voluntary contributions`/`extrabudgetary` (funding appeals). `authorizes`/`decides` carry the mandatory spend. The literal phrase "programme budget implications" almost never appears in resolution operative text (it lives in the separate PBI/ACABQ documents) — so PBI must be inferred from verb+deliverable, not string-matched.

---

## F. PARSER FEASIBILITY

### F.1 Closed-list coverage (core-verb head from `text`, adverbs stripped)

| scope | top-20 | top-30 | top-50 | top-80 | top-120 |
|---|---:|---:|---:|---:|---:|
| **operative** | 87.4% | 91.9% | 94.2% | 95.9% | 97.0% |
| **preambular** | 92.1% | 96.4% | 98.8% | 99.5% | 99.9% |

Note these percentages *include* the non-verb heads (`to`/`the`/`we`) as if they were "matched" tokens; the real finite-verb coverage is slightly lower but the shortfall is entirely the structural tail below, which is identifiable by `prefix`/`level`, not by verb.

### F.2 The tail — what fails to open with a known verb

Operative rows whose head is a non-verb token (`to`, `the`, `a`, gerunds, …): **3,247 / 39,564 = 8.2%.** Preambular tail is negligible (<0.5% past top-50).

Random sample of 30 tail rows, categorised (**every one has a non-empty `prefix` like `(a) (b) (i) (ii) (d)` — they are enumerated sub-items of a parent chapeau**):

| category | ~share of 30 | example |
|---|---|---|
| **`To …` sub-paragraph** (parent verb said `Requests X:` then `(a) To do…`) | ~20/30 | `(h) To develop or maintain and implement adequate legislation…` |
| **Noun-phrase budget/allocation sub-item** | ~6/30 | `(b) The amount of 43,209,100 dollars, to be prorated among the budgets…`; `(a) The unencumbered balance in the amount of 3,234,100 dollars…` |
| **Gerund commitment sub-item** | ~3/30 | `(e) Adopting and implementing sustained and inclusive child-empowering…`; `(u) Continuing to work closely with the humanitarian coordinators…` |
| **Prose declaration line** (GA declarations, `We`/`The`) | ~1/30 | `(a) The global threat posed by nuclear weapons must urgently be eliminated;` |

**Conclusion: there are essentially no genuine novel/unknown finite verbs in the tail.** The misses are 100% *structural* — sub-paragraphs that continue a parent chapeau's verb, plus budget-allocation noun phrases. A deterministic parser therefore needs a **chapeau→sub-item hierarchy** (use `level`, `prefix`, `inferred_operative`) so that a `(a) To …` item inherits the parent's verb (`Requests`), rather than treating every paragraph as verb-initial. With that hierarchy in place, a **closed list of ~50 operative + ~30 preambular verbs covers ~94% / ~99%** of leaf paragraphs directly, and the remaining sub-items inherit.

### F.3 Recommended closed verb list (starter, from the data)

- **Operative directive:** request, call upon, call on, call for, urge, encourage, invite, demand, recommend, appeal, remind, direct, authorize.
- **Operative deciding/administrative:** decide, resolve, endorse, approve, adopt, appropriate, establish, authorize, renew, confirm, agree, pledge, commit.
- **Operative appraisal/observation:** welcome, note, take note (of/with), recognize, acknowledge, commend, appreciate, support, condemn, deplore, regret, express (concern/appreciation), look forward.
- **Operative reinforcing:** reaffirm, recall, reiterate, stress, emphasize, underline, underscore, affirm, highlight, recognize.
- **Preambular** (`-ing` / adjectival): recalling, recognizing, noting, reaffirming, welcoming, taking (note/into account), expressing, stressing, emphasizing, acknowledging, reiterating, bearing in mind, concerned, convinced, mindful, aware, conscious, alarmed, guided, considering, condemning, deploring, underlining, affirming, highlighting, **acting** (SC), **determining** (SC).

### F.4 Parser design implications (summary)

1. **Extract the verb from `text`, adverb-stripped; use `lead_verb` only as a prefix cross-check** (it is a true prefix 100% of the time but occasionally truncated to a bare adverb).
2. **Handle 5 families separately** by `symbol_normalized`; **PRSTs need a bespoke path** (no `paragraph_type`/`lead_verb`, quoted prose, collective subject).
3. **Disambiguate multi-word verbs**: `calls upon/on` (directive) vs `calls for` (impersonal); `takes note of` (neutral) vs `takes note with appreciation/concern` (polar).
4. **Split modifiers into structured attributes**: leading `Also/Further` = additive/back-reference; `Strongly/Deeply/Gravely/Urgently` = intensity; `Recall/Reaffirm/Reiterate` = back-reference/novelty=0.
5. **Multi-mandate paragraphs are common** (`and requests/encourages/calls upon` mid-text) — emit multiple mandates per paragraph (legacy did this via `mandate_index`, ~4–5/para).
6. **Assignee** = span between verb and first `to`-infinitive; ~95% of directives have that anchor, ~59% comma-free (clean); split lists on `and`/comma and drop parenthetical `, … ,` qualifiers for the other ~41%.
7. **Budget relevance** is best inferred from **verb + deliverable_type** (`request`→report/analysis, `decide`→meeting, `appropriate/approve/authorize`→financial) plus co-occurring phrases (`within existing resources`, `extrabudgetary`, `voluntary contributions`) — *not* from "programme budget implications" (absent in operative text).
8. **Type ambiguity**: ~10 verbs (`recognize, note, stress, emphasize, acknowledge, consider, affirm, confirm, must, bear in mind`) legitimately span multiple types — assign a default but flag as context-dependent.
