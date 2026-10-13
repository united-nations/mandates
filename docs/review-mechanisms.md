# Review Clauses and Review Mechanisms in UN Mandates

**Compiled:** 12 May 2026
**Scope:** PPB 2026/27 mandate analysis. Synthesis of web research, systematic DB grep, and random-sample qualitative inspection of the 2,829-document mandate corpus in `mandates.paragraphs`.

> **Companion files** in `docs/_research/`:
> - `web-review-research.md` — external sources, UN80 context, language patterns
> - `db-grep-review.md` — systematic ILIKE counts, positional analysis, top-density docs
> - `db-sample-review.md` — qualitative inspection of 94 random documents

---

## TL;DR

1. **Review is pervasive but mostly implicit.** A literal grep for "review" finds it in 59% of documents (1,670 / 2,829). Once additional review-mechanism markers (reporting back, remaining seized, sunset/extension, agenda inclusion, etc.) are added, **75.8% of documents (2,143 / 2,829)** have at least one review-mechanism operative paragraph. Qualitative inspection of 94 random docs found 65% with explicit mechanisms — most of the gap to 76% comes from "include in the provisional agenda" and short reporting-back clauses that the qualitative pass under-weighted.

2. **The corpus does not use the term "mandate review".** The literal phrase appears 3 times in 2,829 documents. In this corpus, the operative vocabulary is **biennialization / triennialization / clustering / rationalization / working methods**, plus the lifecycle verbs introduced by the March 2026 UN80 resolution: **renewal, adaptation, merger, replacement, retirement**.

3. **No sunset-clause tradition.** "Shall remain in force" — 6 hits. "Sunset" — 9 hits. "Expir*" — 116 hits. UN80's headline finding that **~86% of active mandates lack sunset/termination review** is directly visible in the corpus: review is overwhelmingly handled by *reporting + agenda inclusion*, not by automatic expiry.

4. **Positional priors hold strongly.** `remain seized` sits at average relative position **0.974** of operative content (essentially always the last paragraph). `decides to review` at 0.819, SG-reporting requests at 0.745. Downstream extraction should privilege the bottom ~25% of operative paragraphs.

5. **Two parallel languages of "review".** Explicit operative-clause review (HRC/SC) versus implicit cyclical practice anchored in foundational resolutions (treaty bodies, UPR, QCPR, HLPF, conference +N reviews) — re-stated rarely after the founding resolution.

---

## 1. Mandate Implementation Review (the meta-context)

### 1.1 The 2005-06 exercise

- Launched by **2005 World Summit Outcome A/RES/60/1, paras 163(b) and 164** — "review all mandates older than five years originating from resolutions of the General Assembly and other organs."
- SG report **A/60/733** ("Mandating and delivering", 30 March 2006) put ~7,000 mandates older than five years (~9,000 including newer) on the table. Identified four problems: burdensome reporting, overlap, duplicative architecture, intent-vs-delivery gap.
- GA resolution **A/RES/60/257** (8 May 2006) created the **Ad Hoc Working Group on Mandate Review**.
- **Failed** via North-South mistrust (G77 saw it as a budget-cutting vehicle), methodological infeasibility (costing individual mandates), and the disconnect between mandate cycle and budget cycle. Collapsed into a "tedious bookkeeping exercise" (CIC 2025).

**In the corpus:** 6 documents cite `60/257`; 155 cite `60/1`. The `60/257` chain is the legal anchor for current mandate-review work.

### 1.2 The UN80 Mandate Implementation Review (2025-26)

- Launched March 2025 as Workstream 2 of UN80, alongside Efficiency Improvements (WS1) and Structural and Programmatic Realignments (WS3: "Shifting Paradigms: United to Deliver", Sept 2025).
- Coordinated by Task Force led by **USG Guy Ryder**, principal-level Steering Committee chaired by the SG, six topical working groups.
- **SG's MIR Report (July/Sept 2025)** — quantitative anchors:
  - **>40,000 resolutions, decisions, PRSTs** issued by GA + SC + ECOSOC since 1946.
  - **>3,600 unique Secretariat mandates.**
  - In 2024: **~27,000 formal meetings**, **>1,100 mandated reports**, cost **>USD 360M (~10% of regular budget)**.
  - **~86% of active mandates lack sunset clauses or termination reviews.**
  - **>30% of GA topics from 1990** still on agenda in 2024.
  - **>50% of GA resolutions adopted annually with >80% text repeated** from prior years.
  - **SC resolutions ~3× longer** than 30 years ago.
  - **>15% of new GA mandates in 2024 had no new funding** ("zero-budget mandates" quadrupled since 2000).
  - **~85% of voluntary contributions earmarked**; pooled funding <10%.

- Process: **Informal Ad Hoc Working Group on Mandate Implementation Review** (GA Decision 79/571) co-chaired by **New Zealand and Jamaica** ambassadors. Member-state primacy reaffirmed by **A/RES/79/318**.

- **Landmark resolution adopted 31 March 2026 (168-4-0): "Mandate Creation, Implementation and Review for an Efficient and Effective United Nations"** — key provisions:
  - Establishes principles for the **mandate lifecycle** (creation → implementation → review).
  - When creating mandates, States are to include **implementation roadmaps, timelines, review clauses and, as appropriate, sunset clauses**.
  - Establishes a formal **Ad Hoc Working Group** open to all Member States.
  - Mandates a **registry** improving visibility of existing mandates.
  - Member States to develop objective criteria for **"renewal, adaptation, merger, replacement or retirement"** — **the canonical five-verb lifecycle taxonomy**.
  - WG modalities by August 2026; review of inactive/duplicative/fully-implemented mandates by end December 2026; final WG report by 30 April 2027.

- **Exclusions:** foundational mandates (universal human rights norms), structural mandates (HRC etc.), and mandates related to active international peace and security situations.

- **Link to PPB 2026/27:** Fifth Committee approved **USD 3.45B 2026 budget — 15.1% reduction in resources, 18.8% reduction in staffing** (11,594 posts, down 2,681), with "Revised estimates UN80" linking budget to mandate consolidation.

### 1.3 The mandate-budget disconnect

The most persistent operational problem from both 2006 and 2025 reviews: mandate-creating organs (GA plenary, SC, HRC, ECOSOC) are institutionally separate from the budget-deciding organ (Fifth Committee / ACABQ), and cycle lengths do not align. The UN moved from biennial to **annual budgeting in 2019**; many specialized agencies (UNFCCC etc.) retain biennium structures. Programme planning is governed by the **PPBME Regulations** (ST/SGB/2018/3), with the strategic-framework concept introduced by **A/RES/58/269 (2003)** and the **Committee for Programme and Coordination (CPC)** (ECOSOC res 920 (XXXIV), 1962) as the primary review organ.

---

## 2. Review Mechanisms in UN Mandate Practice (general)

### 2.1 Security Council peacekeeping mandate renewals

- Typical cycles: **6 or 12 months**. Penholders (usually P3) circulate drafts ~2 weeks before expiry.
- Examples: MONUSCO 12-month (S/RES/2808 (2025) → 20 Dec 2026); UNFICYP 6-month; UNDOF 6-month; UNIFIL ~12-month (S/RES/2790, final extension to 31 Dec 2026); MINURSO/UNMISS annual.
- **Independent strategic reviews** commissioned by the SG feed renewal cycles (MONUSCO 2019 / S/2019/842 — Mahmoud; UNFICYP — Weisbrod-Weber). The corpus shows 7 hits for "independent strategic review".
- **"Christmas tree" critique**: Council reform conversation increasingly emphasizes **prioritization and sequencing** of mandated tasks.

### 2.2 Sanctions regime reviews

- Sanctions committees and monitoring teams / panels of experts renewed on **12-month cycles**; panels typically renewed for ~13 months (1 month past sanctions expiry for final reporting).
- 1267/1989/2253 ISIL & Al-Qaida Monitoring Team — annual (S/RES/2816 (2026)).
- DPRK Panel of Experts terminated April 2024 (Russia veto) — illustrates how mandates can lapse via Council deadlock rather than affirmative termination.
- Standard language: *"decides to extend the mandate of the Panel of Experts until [date]"*; *"requests the Panel to provide a midterm update no later than [date] and a final report no later than 30 days prior to the expiration of its mandate."*

### 2.3 Quadrennial Comprehensive Policy Review (QCPR)

- GA's primary policy instrument for UN operational activities for development. Cycle: every **4 years**. Annual implementation via ECOSOC OAS Segment.
- 2024 QCPR: **A/RES/79/226** (19 Dec 2024), guides UNDS until 2028.
- **In the corpus:** "quadrennial comprehensive policy review" — 248 hits across 102 docs. Acronym "QCPR" — 1 hit. **Canonical anchor doc: A/RES/67/226.**

### 2.4 Strategic plan mid-term reviews (UN funds & programmes)

- Each fund/programme has a 4-year Strategic Plan with **MTR at the 2-year mark**.
- UNDP, UNICEF, UNFPA, UN Women, WFP. Alignment with QCPR cycle.
- Current generation: 2022-2025 plans being followed by 2026-2029 plans.

### 2.5 Universal Periodic Review (UPR)

- Created by **A/RES/60/251** (2006). **4.5-year cycle**. Three 2-week WG sessions/year, 14 countries each, average ~200 recommendations per State per cycle.

### 2.6 Treaty body periodic reviews

- Originally ~4-5 year periodicity; in practice slipped to ~8 years. **2019: CCPR adopted a predictable 8-year cycle**, first treaty body to do so. **2022: all treaty bodies agreed to a predictable schedule.**

### 2.7 HRC Special Procedures

- Thematic mandates: **3-year** initial term, renewable once → 6-year typical.
- Country mandates: **1-year**, renewable annually.
- In the corpus: **"for a period of"** (234 hits, 175 operative) is the standard sunset/extension formula — examples: extension of mandates of Special Rapporteurs (violence against women, right to development), independent fact-finding missions.

### 2.8 High-Level Political Forum (HLPF)

- Annual under ECOSOC; quadrennial under GA. Voluntary National Reviews (VNRs) — 37 in 2025.
- Established by **A/RES/67/290** (2013); architecture refined by **A/RES/70/299** and especially **A/RES/75/290 B** — the highest review-clause-density document in our corpus (65.3%, 32 of 49 operative paragraphs).
- In the corpus: **"in-depth review"** (22 hits) is tightly associated with HLPF thematic reviews.

### 2.9 Conference outcome reviews ("+5", "+10", "+20", "+30")

- Long-standing practice: Beijing+30 (CSW69, March 2025, E/CN.6/2025/3/Rev.1); ICPD+30 (UNFPA-led); Rio+20; Copenhagen+30 (2025 Doha Second World Summit for Social Development); NPT RevCon every 5 years per Article VIII.3.
- In the corpus: **"final review and appraisal"** appears in major decade-scale frameworks (e.g. A/RES/54/234, the New Agenda for the Development of Africa).

### 2.10 Peacebuilding Architecture Review (PBAR)

- **5-year cycle** since 2005 (twin GA/SC res 60/180 + 1645). 2025 PBAR called for by A/RES/75/201 + S/RES/2558 (2020); twin Nov 2025 outcome resolutions, 31 operative paragraphs.

### 2.11 Pact for the Future follow-up architecture

- **A/RES/79/1** (22 Sept 2024). Two annexes: Global Digital Compact + Declaration on Future Generations.
- Review schedule: GDC high-level review **2027**; Declaration on Future Generations — GA high-level plenary; **Comprehensive review of the Pact at start of GA 83 (2028)**.
- In the corpus: 58 hits for "Pact for the Future".

### 2.12 GA revitalization: biennialization, triennialization, clustering, sunset clauses

Standing GA practice. In the corpus:
- `biennialization` — 18 hits / 13 docs
- `triennialization` — 13 hits / 10 docs
- `clustering and elimination` — 5 hits / 3 docs
- `rationalization` — 656 hits (broader)
- `sunset` — 9 hits

Anchor documents: A/RES/48/162, A/RES/57/270 B, A/RES/59/95, A/RES/77/335, the GA Rules of Procedure Annex VIII (A/520/REV.20). Despite years of advocacy, only minor progress has been achieved on systematic application — a key target of the UN80 MIR.

---

## 3. Language patterns and frequencies in the corpus

### 3.1 Headline counts (operative paragraphs unless noted)

| Pattern | Total hits | Operative | Docs |
|---|---:|---:|---:|
| `review` (any) | 6,771 | 3,815 | 1,670 |
| `include in the provisional agenda` | 598 | (mostly op) | — |
| `without prejudice` | 428 | — | — |
| `requests the Secretary-General to report` | 431 | 392 | 291 |
| `remain (...) seized` | 367 | 347 | 364 |
| `as a matter of priority` | 325 | — | — |
| `submit a report` | 290 | 224 | 265 |
| `quadrennial comprehensive policy review` | 248 | 110 | 102 |
| `no later than` | 236 | 180 | 190 |
| `comprehensive review` | 235 | 117 | 169 |
| `for a period of` | 234 | 175 | 210 |
| `midterm review` | 219 | — | — |
| `review and appraisal` | 193 | — | — |
| `oral update` | 111 | — | — |
| `decides to consider` | 104 | 86 | 99 |
| `requests ... to review` | 128 | 110 | 98 |
| `continue to consider` | 95 | 87 | 86 |
| `keep under review` | 61 | — | — |
| `at its next session` | 59 | — | — |
| `decides to review` | 47 | 42 | 46 |
| `at its [n]th session` (regex) | 42 | — | — |
| `mutatis mutandis` | 40 | — | — |
| `revert to` | 35 | 35 | 25 |
| `mid-term review` (hyphenated) | 27 | 11 | 19 |
| `report back` | 27 | 21 | 23 |
| `strategic review` | 23 | 10 | 18 |
| `in-depth review` | 22 | 8 | 20 |
| `biennialization` | 18 | 11 | 13 |
| `shall be reviewed` | 17 | 5 | 16 |
| `triennialization` | 13 | 7 | 10 |
| `sunset` (any form) | 9 | — | — |
| `independent strategic review` | 7 | — | — |
| `shall remain in force` | 6 | 4 | 4 |
| `clustering and elimination` | 5 | 5 | 3 |
| `mandate review` (literal) | 3 | — | — |

**Combined coverage** (any operative paragraph matching review / remain-seized / report-request / for-a-period-of / no-later-than / [n]th-session / provisional-agenda / renew / extend): **2,143 of 2,829 docs (75.8%)**.

### 3.2 Positional analysis

Normalised position per document (`(position − min) / (max − min)` over operative paragraphs, 1.0 = last operative).

| Pattern | n | Avg rel. position |
|---|---:|---:|
| ALL operative paragraphs (baseline) | 79,160 | 0.497 |
| containing "review" | 3,815 | 0.519 |
| `remain (...) seized` | 347 | **0.974** |
| `decides to review` | 42 | **0.819** |
| `requests the Secretary-General to report` | 392 | **0.745** |

`remain seized` is a near-perfect closing marker. Review-clause extraction should weight the bottom ~25% of operative paragraphs heavily. The qualitative-sample finding that mechanisms are "distributed throughout operative sections" reflects that *reporting-back* obligations are spread throughout substantive operative content, while *closing-clause* review obligations cluster at the tail.

### 3.3 Top documents by review-clause density (≥5 operative paras)

`A/HRC/RES/51/30` (100%); `A/RES/66/293` (91.7%); `E/RES/2020/8` (84.2%); `E/RES/2022/5` (80%); `A/RES/74/298` (75%); **`A/RES/75/290 B`** (65.3%, 32/49 — HLPF architecture); `E/RES/2013/5` (63.9%); `A/HRC/RES/54/28` (63.2%); `E/RES/2023/12` (61.5%); `A/RES/77/334` (60%); `A/RES/73/226` (58.3%); `A/RES/78/309` (56.3%); **`A/RES/79/78`** (51.9%, BWC ISU mandate); `E/RES/...` cluster.

ECOSOC `E/RES/...` is heavily over-represented — these are thin follow-up instruments dominated by request-to-report operative paragraphs.

### 3.4 Standard review-language formulae

**Closing / continuing engagement**
- *Decides to remain seized of the matter* (and *actively seized*, *seized of this matter*).
- *Decides to consider the question further at its [n]th session* — GA analogue.
- *Decides to keep the situation under review.*

**Time-bound review / sunset triggers**
- *Decides to review the implementation of the present resolution at its [n]th session.*
- *Decides that the mandate shall be reviewed [no later than / by / before] [date].*
- *Decides that the [measures/sanctions] shall be reviewed every twelve months.*
- *Decides to extend the mandate of [mission/panel] until [date].*

**Reporting requests (bulk of review hooks)**
- *Requests the Secretary-General to report* to the [Council/Assembly] [at its … session / every six months / annually / by … date].
- *Requests the Secretary-General to submit a comprehensive report.*
- *Requests the Secretary-General to keep the [body] regularly informed.*
- *Requests an interim report and a final report* (Panels of Experts).
- *Requests an oral briefing / oral update every 90 days.*

**Comprehensive / strategic**
- *Calls for a comprehensive review of [the mandate/architecture].*
- *Requests the Secretary-General to commission an independent strategic review.*
- *Decides to convene a high-level review.*

**Lifecycle (post-March 2026)**
- The five-verb formula: ***renewal, adaptation, merger, replacement or retirement.***

**Periodic / cycle**
- *on a quadrennial basis*, *every four years* (QCPR); *every 4.5 years* (UPR); *every five years* (NPT, PBAR, +5 reviews); *annually* / *every twelve months* / *every six months* / *every 90 days*; *on a biennial / triennial basis*.

**Sunset / termination (rare in the corpus)**
- *unless the [Council/Assembly] decides otherwise.*
- *shall expire on [date] unless renewed.*
- *the mandate shall terminate upon [condition].*
- *shall remain in force until reviewed by the [Council/Assembly].*

**PPBME / programme planning**
- *strategic framework*, *programme plan*, *programme budget*, *proposed programme budget*; *monitoring of implementation*, *methods of evaluation*; *results-based budgeting / management*; *expected accomplishments*, *indicators of achievement*, *performance measures*.

### 3.5 Non-obvious review wording (no "review" word)

From the qualitative inspection and DB grep — these establish review mechanisms without containing the word "review":

| Phrase | Mechanism |
|---|---|
| *Decides to remain seized of the matter* | Implicit ongoing oversight (closing clause) |
| *For a period of [X] years* | Sunset — renewal required |
| *Requests the Secretary-General to report by [date]* | Scheduled checkpoint |
| *At its [n]th session* / *at its next session* | Implicit future consideration |
| *Decides to include in the provisional agenda of its [n]th session* | GA-canonical implicit review (598 hits) |
| *Stresses the need to keep [under active] consideration* | Ongoing monitoring |
| *Decides to revert to this issue at its [n]th session* | Fifth Committee deferral idiom |
| *Without prejudice to further consideration* | Reservation of review authority |
| *Mutatis mutandis* (re prior mandate) | Renewal piggy-backing on prior review decision |
| *As a matter of priority, at its future sessions* | HRC boilerplate (commonly pairs with `decides to review`) |
| *Subject to review every X years* | Explicit periodicity (older GA formula) |
| *Stocktaking* / *taking stock* | Informal review formulation |
| *Final review and appraisal* | Decade-scale plan review |
| *Subsequent review cycles* | Recurring review architecture (A/RES/72/305, A/RES/75/290 B) |

### 3.6 Variants worth catching downstream

From the systematic grep, beyond the starter list:
- `review the implementation of the present resolution` — 149 hits; the canonical self-referential review clause.
- `with a view to` — 2,063 operative hits; very common framing preceding a review obligation.
- `follow-up` — 1,599 operative hits; the catch-all review-adjacent term, especially in development-conference outcomes.
- `progress report` — 390 hits; `annual report` — 589 hits; `biennial report` — 25 hits.
- `lessons learned` — 721 hits; `effectiveness` — 1,352 hits — soft-review vocabulary, usually paired with `assess` / `evaluate`.
- `rationalization` / `working methods` — 528 hits in operative — the operational language at GA Main Committee level.
- `keep under review` / `keeping under review` — strong recurring formula in older GA resolutions (A/RES/1995(XIX), A/RES/2997(XXVII), A/RES/32/197, A/RES/47/191, A/RES/52/220) — equivalent to "remain seized" but with a substantive review obligation attached.

---

## 4. Cross-cutting observations for PPB 2026/27 work

1. **"Mandate review" is a meta-term not used inside individual mandates.** The 3,600+ mandates that UN80 is reviewing do not, almost without exception, describe themselves as subject to "mandate review". Any classifier or query that searches for that literal phrase will find ~nothing. The operative vocabulary inside mandates is reporting, remaining seized, extending, renewing, agenda-including.

2. **The 76% with review markers vs the UN80-cited "86% lack sunset clauses".** Not a contradiction. Our 76% counts *any* review-mechanism marker (including soft ones — reporting requests, agenda inclusion, "remain seized"). UN80's 86% counts only *hard* sunset/termination clauses. The gap (~62 percentage points) is exactly the population of mandates that have a soft review hook but no hard termination — the implementation-without-expiry mandates that are structurally hard to reduce in budget terms. **This is the relevant target population for PPB-driven mandate consolidation.**

3. **Two organs, two styles.**
   - **HRC** uses tight, templated review clauses: "Decides to review … as a matter of priority, at its future sessions." + "Decides to remain seized of the matter." HRC mandates carry explicit periodicities (3-year thematic, 1-year country) anchored in *founding* resolutions, not re-stated in each substantive resolution.
   - **GA** uses the **"requests SG to report + decides to include in the provisional agenda"** pair — a procedural review architecture rather than a substantive one. This pattern (598 hits for the provisional-agenda half alone) is the most common GA review template by volume.

4. **Reporting cost is the lever.** UN80 quantifies 1,100+ mandated reports/year at >USD 360M. Inside the corpus, ~392 operative paragraphs across 291 documents request the SG to report — and many request *repeating* reports. Reduction work on report frequency (annual → biennial / triennial / on-demand) is a high-yield budgetary lever that does not require terminating the underlying mandate.

5. **Heading-row hits are about-review, not contain-review.** 168 documents have "review" in heading text — these are themselves *review documents* (QCPR, strategic reviews, mid-term reviews). Worth tagging separately from documents that *contain* a review clause.

6. **The Annan-era reform residue is structurally legible.** A/51/950 (1997 Annan reform), 60/1 (2005 World Summit), 60/257 (2006 mandate review), 67/226 (QCPR), 75/290 B (HLPF), 79/1 (Pact for the Future), and the March 2026 MIR resolution form a citation backbone for review architecture.

---

## 5. Recommended next steps

1. **Extract review-clause paragraphs** with a regex / classifier built around §3.4 + §3.5 + §3.6, prioritising the bottom 25% of operative paragraphs per document.
2. **Tag mandate paragraphs by lifecycle disposition** using the March 2026 five-verb taxonomy (renewal / adaptation / merger / replacement / retirement).
3. **Build a "report-cadence" feature** per mandate (how many SG-reports does the mandate generate per year, on what cycle?) — the most actionable PPB lever.
4. **Identify the "soft-review-only, no-sunset" cohort** — documents with a review-mechanism marker but no `for a period of` / `until [date]` / `shall expire` / `shall remain in force` clause. This isolates the implementation-without-expiry mandates flagged by UN80.
5. **Map citation chains to the 6-document anchor set** (60/1, 60/257, 67/226, 75/290 B, 79/1, March 2026 MIR) using `mandates.paragraph_links`.

---

## Appendix: Anchor documents

| Symbol | Title / function |
|---|---|
| `A/RES/60/1` | 2005 World Summit Outcome (mandate review § 163-164) |
| `A/60/733` | SG, "Mandating and delivering" (2006) |
| `A/RES/60/257` | Ad Hoc WG on Mandate Review (2006) |
| `A/RES/58/269` | Strategic framework concept (2003) |
| `A/RES/67/226` | 2012 QCPR |
| `A/RES/79/226` | 2024 QCPR |
| `A/RES/67/290`, `A/RES/70/299`, `A/RES/75/290 B` | HLPF architecture |
| `A/RES/60/251` | HRC + UPR establishment |
| `A/RES/79/1` | Pact for the Future (Sept 2024) |
| `A/RES/79/318` | Reaffirms member-state primacy in MIR |
| GA Decision **79/571** | Establishes Informal Ad Hoc WG on MIR |
| **March 2026 MIR resolution** | "Mandate Creation, Implementation and Review …" — five-verb taxonomy |
