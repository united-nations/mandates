# External sources for mandate implementation & impact

Research notes for a new analytical lens: *what external data can show whether and how
mandates are actually implemented, and what they cost/achieve in the real world?*

Surveyed 2026-07-22. Scores are 0–3 per criterion.

## Scored comparison

| Source | Access (API/bulk) | Joinability to our identifiers | Implementation story | Freshness | Total | Verdict |
|---|---|---|---|---|---|---|
| **UN Peace & Security Data Hub (psdata.un.org, mirrored on HDX)** — ~75 datasets: mission mandate components, approved vs actual personnel, deployments, fatalities, budgets, RBB performance indicators | 3 — clean CSVs via HDX CKAN API, updated days ago | 3 — mission acronyms + `S/RES/…` + `A/…` budget document symbols, exactly our ID space | 3 — mandated strength vs actual deployment, budget execution, targets met, fatalities | 3 — several files updated 2026-07-20 | **12** | **CHOSEN** |
| **Our own DL mirror: SC resolution `title_other`** (DL field 245) — "…[on extension of the mandate of the UN Mission in South Sudan (UNMISS) until 30 Apr. 2025]" | 3 — already in `digitallibrary.documents` | 3 — regexp on title yields mission acronym + renewal semantics; 1,306 renewal resolutions, ~840 with acronym | 2 — renewal cadence = the "mandate" half of the ledger | 3 | **11** | **CHOSEN** (join partner) |
| UN programme performance report (A/79/73 etc.) — self-reported delivery rate of mandated outputs per entity | 1 — PDF only, tables need scraping | 2 — entity names match `ppb2026` sections | 3 — literally "% of mandated outputs delivered" | 2 — annual | 8 | Strong future candidate; PDF extraction is a project of its own |
| SDG indicator database (unstats.un.org/sdgapi) | 3 — good API | 0–1 — our mandates carry no SDG tags; join would be invented, not real | 2 | 3 | 8 | Weak join; would require new mandate→SDG classification first |
| JIU recommendation tracking (unjiu.org) — acceptance/implementation rates per organization | 1 — web dashboard, no bulk export | 2 — entity names | 3 — literal "implementation rate of recommendations" | 2 | 8 | Good future candidate if bulk data obtainable |
| Security Council Report (securitycouncilreport.org) mandate tables | 1 — HTML, no API, copyright unclear | 3 — mission acronyms, resolution numbers | 2 — renewal calendar (we can already derive this ourselves from DL titles) | 2 | 8 | Redundant with what our own DB + PSData already give |
| OIOS evaluation reports | 1 — PDFs | 2 — entity names | 2 — qualitative | 2 | 7 | Not machine-joinable at scale |
| UNHCR/OCHA/ReliefWeb humanitarian data | 3 — APIs | 1 — country-level, not mandate-level | 1 — outcome proxy at best | 3 | 8 | Country join too loose to claim mandate impact |
| UNTC treaty ratification status | 1 — no official API | 1 — treaty names rarely = mandate text | 2 | 3 | 7 | Different object (treaties, not mandates) |
| GDELT / news coverage | 3 — bulk | 1 — fuzzy text match | 1 — attention ≠ impact | 3 | 8 | Proxy too weak to present as "implementation" |

## Chosen combination

**UN Peace & Security Data Hub (DPPA-DPO official data, via HDX mirrors) × our Digital
Library mirror.** The join key is the mission acronym (UNMISS, MONUSCO, …), which appears
natively on both sides, plus UN document symbols (`S/RES/…` for mandates,
`A/…` budget reports) which PSData carries verbatim.

Datasets used (all CSV, cached on /Volumes/SSDAStorage/un-mandates-impact, fetched by
`data-processing/scripts/build_mission_implementation.py`):

| HDX dataset | Content | Rows | Range |
|---|---|---|---|
| `dppa-fieldmissions-missions` | Mission register: name, lead entity, initial/latest mandate resolution, expiry, Chapter VII, open/closed | 29 missions | current |
| `dppa-fieldmissions` | Mandate components: paragraph-level mandated tasks per mission per resolution | ~4,300 | 1948– |
| `dpo-postsapproved` / `dpo-postsactual` | Approved (mandated) vs actual average personnel per mission, category, budget year | ~1,200 | 2010/11–2025/26 |
| `peacekeeping-uniformed-contributions-by-gender` (`dpo-uchistorical`) | Monthly uniformed deployment per mission per contributor | ~500k | 2010-01–2026-04 |
| `peacekeeping-fatalities` (`dppadposs-fatalities`) | 4,507 individual fatalities with mission, date, incident type | 4,507 | 1948–2026 |
| `dpo-pkbudget` / `dpo-pkexp` | Appropriation vs expenditure per mission per budget year and class | ~7,600 | 2010/11–2024/25 |
| `dos-indicators` | Results-based-budgeting performance indicators with target-met flag per mission | 1,423 | 2014/15–2023/24 |

From our own DB: SC resolutions whose DL title marks them as mandate extension/renewal,
`(ACRONYM)` extracted by regexp — the mandate-renewal timeline per mission.

## Join coverage measured

- Mission register: 29 real missions (1 note row dropped); 25 of them appear in the
  monthly deployment data (the rest are SPMs with no uniformed personnel reporting).
- Approved-vs-actual personnel: all 10 currently budgeted PKOs present on both sides
  (MINURSO, MINUSCA, MINUSMA, MONUSCO, UNDOF, UNFICYP, UNIFIL, UNISFA, UNMIK, UNMISS).
- Fatalities: 22/29 register missions have fatality records (81 missions total, 1948–).
- DB renewal resolutions: 1,306 S/RES marked extension/renewal; acronym extractable for
  ~840; all 10 active PKOs and the major SPMs (UNAMA 26, UNSMIL 23, …) covered; DL
  title coverage of this form starts ~1997.
- RBB indicators: 16 missions, 1,423 indicator-period rows, 689 target-met / 734 missed.
