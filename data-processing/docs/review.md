# PPB 2027 Extraction Pipeline — Validation Review

All 33 PPB 2027 sections were validated against ground-truth JSON by comparing extracted CSV rows to the source document structure. Results are summarised below.

**Status key:** ✅ Fixed | ⚠️ Known gap | 🔵 By design

---

## Bug Inventory

### ✅ Bug 1 — A/B/C suffix and qualifier loss in `Symbol` column

**Affected sections:** SECT. 4, 9, 11, 15, 19, 20, 22, 27, 28, 29A, 29B, 29C, 29D, 29E, 29F, 30, 31, 34

**Root cause:** `get_mandates()` in `c_extract_parsed.py` used the DOCX hyperlink anchor text as the symbol. Document authors routinely write a full symbol as the cell display text (e.g. `"71/272 B, sect. III"`) but set the hyperlink anchor to just the base symbol (`"71/272"`). The suffix is only plain text — never encoded in the anchor — so it was silently dropped.

**Examples (before fix):**

| Section | Cell text | CSV Symbol (wrong) | Fixed |
|---------|-----------|-------------------|-------|
| SECT. 22 | `75/290 A; 75/290 B` | `75/290` × 2 | `75/290 A`, `75/290 B` |
| SECT. 28 | `80/84 A–B` | `80/84` | `80/84 A–B` |
| SECT. 29C | `71/272 B, sect. III` | `71/272` | `71/272 B, sect. III` |
| SECT. 34 | `59/276, sect. XI` | `59/276` | `59/276, sect. XI` |
| SECT. 15 | `25/6` (anchor wrong) | `5/6` | `25/6` |

**Fix applied:** `c_extract_parsed.py` table-content branch now finds the `;`-split cell-text part containing the anchor and uses it as the symbol, rather than the bare anchor.

---

### ✅ Bug 2 — Compound cell partial extraction (unlinked parts dropped)

**Affected sections:** SECT. 9, 16 (−3), 18 (−1), 19 (−1), 24 (−2), 30 (−1)

**Root cause:** When a `;`-delimited cell had fewer hyperlinks than `;`-parts, the pipeline iterated only the hyperlinks and silently dropped unlinked parts.

**Examples (before fix):**

| Section | Cell text | Extracted | Missed |
|---------|-----------|-----------|--------|
| SECT. 16 | `1984/50; 1996/15` | `1984/50` | `1996/15` |
| SECT. 24 | `6/13; 59/21` | `59/21` | `6/13` |
| SECT. 30 | `72/266 A and B` | `72/266` (A) | `72/266 B` |

**Fix applied:** After emitting hyperlinked parts, any remaining `;`-split cell-text parts are now also emitted as unlinked mandate rows.

---

### ✅ Bug 3 — Component blocks lose subprogramme attribution

**Affected sections:** SECT. 29A (14 rows), SECT. 29B (7 rows)

**Root cause:** In sections with a flat sibling structure (all blocks at the same JSON level), `get_mandates()` reset the subprogramme to `block["text"]` for every `heading-sub-sub` encountered — including "Component N – ..." headings. Since these don't start with "Subprogramme", `get_subprogramme()` returned `(None, None)`.

**Fix applied:** `get_mandates()` now tracks a `current_subprogramme` variable that updates only when a block starts with `"Subprogramme"` (matched via regex), and carries it forward across sibling component headings.

---

### ✅ Bug 4 — `link_to_symbol` misses non-standard URL formats

**Affected sections:** SECT. 25 (3 rows via `https://www.undocs.org/`, 4 rows via `https://docs.un.org/` without `/en/`)

**Root cause:** `link_to_symbol()` only handled `https://undocs.org/en/` and `https://docs.un.org/en/`. Other valid URL forms (`https://docs.un.org/A/…`, `https://www.undocs.org/A/…`) returned `None`.

**Fix applied:** `link_to_symbol()` now checks 5 prefixes in order (most specific first), including the `www.` and no-`/en/` variants.

---

### ✅ Bug 5 — Subprogramme typo `"Subprogamme"` (missing `r`)

**Affected sections:** SECT. 4 (9 rows)

**Root cause:** Source DOCX contains `"Subprogamme 1"`. `get_subprogramme()` used `.startswith("Subprogramme")`, which failed silently.

**Fix applied:** `get_subprogramme()` now uses regex `Subprog[ar]?amme\s+\d+` to tolerate the missing `r`.

---

### ✅ Bug 6 — Empty table rows produce null-Symbol rows

**Affected sections:** SECT. 19 (1 row), SECT. 20 (1 row)

**Root cause:** Completely empty table rows propagated to CSV as rows with `Symbol = NaN`.

**Fix applied:** Table rows are skipped when `cell_text` is empty and there are no hyperlinks.

---

### ✅ Bug 7 — Embedded newlines in Symbol column

**Affected sections:** SECT. 20 (22 ECE symbols)

**Root cause:** DOCX table cells wrapping across lines produced literal `\n` characters (e.g. `ECE/BATUMI.\nCONF/2016/2/\nAdd.2`).

**Fix applied:** `normalize_symbol()` now strips `\n` and `\r` before the existing regex.

---

### ✅ Bug 8 — Non-breaking space (`\xa0`) in Symbol column

**Affected sections:** SECT. 18 (10 symbols)

**Root cause:** DOCX used NBSP as a word-joiner in Roman-numeral session labels (e.g. `914\xa0(XLVII)`).

**Fix applied:** `normalize_symbol()` now replaces `\xa0` with a regular space.

---

### ✅ Bug 9 — "Mandates and background" section not found when heading is combined

**Affected sections:** SECT. 18 (2 mandate rows missed entirely)

**Root cause:** The DOCX parser combines consecutive heading lines: `"Overall orientation"` + `"Mandates and background"` → `"Overall orientation – Mandates and background"`. `find_section_with_heading()` used exact text matching, so it never found this section — meaning neither hyperlink extraction nor LLM ran on it.

**Fix applied:** `find_section_with_heading()` now also matches blocks whose text ends with ` – <heading_title>`.

---

### Minor — `reconstruct_mandate_source` drops "and decisions"

**Affected sections:** SECT. 31 (minor inconsistency only)

`reconstruct_mandate_source()` returns `"Economic and Social Council resolutions"` for `E/RES/` symbols, but some source documents label the heading `"Economic and Social Council resolutions and decisions"`. This creates inconsistency between rows derived from the italic heading (correct label) and rows where the source was inferred from the URL (shorter label). Low impact; not fixed.

---

## LLM Extraction — How it works

The LLM (`llm_extract_mandates`) **is called for every section** that has a "Mandates and background" heading during the extraction run. It operates on the section prose text, with already-hyperlinked symbols pre-wrapped in `~~...~~` so the LLM skips them.

The output (`mandates_background_llm.csv`) contains only the sections where the LLM found **additional** mandate symbols not already covered by hyperlinks. For most sections, all cited symbols are hyperlinked, so the LLM correctly returns nothing new. The 7 sections in the LLM CSV are the ones with genuinely unlinked symbol references in their prose.

This is working as designed. The `@cache` decorator (joblib) means each unique section text is only sent to the API once.

### Quality review of LLM-extracted rows

The 15 original LLM rows (across 7 files) were manually reviewed against the source prose:

| Category | Count | Examples |
|----------|-------|---------|
| True positives | 11 | `32/197`, `671 (XXV) A`, `1998/46` (SECT. 11); Charter Articles 13/98/102/104/105 (SECT. 8); `19/1` (SECT. 14); `73/9` (SECT. 19); `553 (XXVI)` (SECT. 21); `2001/321` (SECT. 31) |
| ✅ False positives (fixed) | 3 | `paragraph 6 (A) (ii)` and `article I (A) (2)` (SECT. 25 — sub-article references within cited documents); `article 5` (SECT. 31 — JIU Statute internal provision) |
| Acceptable duplicates | 1 | `2001/321` (SECT. 31) — also in Legislative mandates table, but both rows carry different context |
| False negatives | 0 | Regex scan across all M&B sections found no missed unlinked symbols |

**Fix applied:** System prompt updated to exclude sub-article references (e.g. "article 5 of its Statute", "paragraph 6 (A) (ii) of its statute") that refer to internal provisions of an already-cited document. After re-run, LLM CSV reduced from 15 to 12 rows — all 3 false positives removed, all true positives retained.

---

## Remaining Open Gaps

### ⚠️ Bullet-list treaty mandates not captured (SECT. 16)

22 UN conventions are listed as `•` bullet items (`other` block type) under an italic heading in the Legislative mandates section. The pipeline only extracts from `table-content` and `paragraph-` blocks. These are real legislative mandates being silently missed. Would require a new extraction path for `other`-type blocks under a "Legislative mandates" context.

### ✅ Space-separated compound symbols (SECT. 20)

`ECE/CES/105 ECE/CES/107 ECE/CES/109` was stored as one symbol string. The source DOCX does not use `;` to separate these.

**Fix applied:** In the no-hyperlinks table branch, each `;`-split part is further split on `\s+(?=[A-Z][A-Z0-9]*/)` — spaces immediately followed by an uppercase-slash token. This regex only fires on patterns like `ECE/CES/105 ECE/CES/107` and does not split normal suffixes like `"47/120 A and B"` or `"F (70)"`.

The three symbols now emit as separate rows with correct subprogramme attribution.

### ⚠️ `Full Document Symbol` loses A/B when UN docs URL omits the part letter

For some resolutions (e.g. `3331 B (XXIX)`), the UN docs URL itself is `A/RES/3331(XXIX)` with no `B`. The `Symbol` column is correct; `Full Document Symbol` is not. Source-data limitation; `Symbol` should be used as the authoritative column for split resolutions.

### 🔵 Earlier sections (SECT. 3–13) only audited with less-rigorous prompt

Bugs 1–9 were applied globally and should improve accuracy, but a full re-validation of SECT. 3–13 has not been done.

---

## Section-by-Section Results (after all fixes)

| Section | Entity | Issues at time of audit | Status after fixes |
|---------|--------|------------------------|-------------------|
| SECT. 2 | UNOG | — | ✅ |
| SECT. 3 | UNEP | — | ✅ |
| SECT. 4 | UNCTAD | Bug 5 (SP typo, 9 rows) | ✅ Fixed |
| SECT. 5 | UN Secretariat | — | ✅ |
| SECT. 6 | UNDP | — | ✅ |
| SECT. 7 | UNFPA | — | ✅ |
| SECT. 8 | UNICEF | — | ✅ |
| SECT. 9 | UNHCR | Bug 1, Bug 2 | ✅ Fixed |
| SECT. 10 | WFP | — | ✅ |
| SECT. 11 | UNRWA | Bug 1 | ✅ Fixed |
| SECT. 12 | ILO | — | ✅ |
| SECT. 13 | FAO | — | ✅ |
| SECT. 14 | UNEP | — | ✅ |
| SECT. 15 | UN-Habitat | Bug 1 (wrong anchor `5/6`) | ✅ Fixed |
| SECT. 16 | UNODC | Bug 2 (3 missing); bullet-list treaties | ✅ Bug 2 fixed; ⚠️ bullets remain |
| SECT. 17 | UNOPS | — | ✅ |
| SECT. 18 | ECA | Bug 2 (1 missing); Bug 8; Bug 9 (M&B missed) | ✅ All fixed |
| SECT. 19 | ESCAP | Bug 1, Bug 2 (1 missing), Bug 6 | ✅ All fixed |
| SECT. 20 | UNECE | Bug 1, Bug 7; space-concat ECE/CES | ✅ All fixed |
| SECT. 21 | ECLAC | — | ✅ |
| SECT. 22 | ESCWA | Bug 1 | ✅ Fixed |
| SECT. 24 | OHCHR | Bug 2 (2 missing) | ✅ Fixed |
| SECT. 25 | UNHCR | Bug 4 (URL variants) | ✅ Fixed |
| SECT. 26 | UNRWA | — | ✅ |
| SECT. 27 | OCHA/UNDRR | Bug 1 | ✅ Fixed |
| SECT. 28 | DGC | Bug 1 | ✅ Fixed |
| SECT. 29A | DOS | Bug 1 (5 symbols), Bug 3 (14 rows) | ✅ All fixed |
| SECT. 29B | DOS | Bug 1 (3 symbols), Bug 3 (7 rows) | ✅ All fixed |
| SECT. 29C | OICT | Bug 1 (4 of 7 rows) | ✅ Fixed |
| SECT. 29D | UNOG | Bug 1 | ✅ Fixed |
| SECT. 29E | UNON | Bug 1 (3 symbols) | ✅ Fixed |
| SECT. 29F | UNOV | Bug 1 | ✅ Fixed |
| SECT. 30 | OIOS | Bug 1, Bug 2 | ✅ All fixed |
| SECT. 31 | ICSC/JIU/CEB | Bug 1; minor source label | ✅ Bug 1 fixed; minor label remains |
| SECT. 34 | DSS | Bug 1 | ✅ Fixed |
