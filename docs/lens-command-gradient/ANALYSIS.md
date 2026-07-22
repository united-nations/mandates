# The Command Gradient — who the UN orders, and who it merely encourages

Analysis notes for the "The language of command" expander on `/secretariat`
(organs section, below the organ×entity heatmap). Feature branch:
`worktree-agent-a712e16ac6db68deb` (off `dev`).

## Method

Source: `digitallibrary.document_paragraphs` — the parsed English texts of
~21,900 GA / SC / ECOSOC resolutions and decisions (896k paragraphs, 22,144
parsed documents), joined to `digitallibrary.documents` on
`symbol_normalized` for `un_body` and `date_publication`.

Each paragraph carries a classification of the verb it opens with:

| Column | Meaning |
| --- | --- |
| `action_verb_normalized` | lemma of the lead verb (`decide`, `call upon`, …) |
| `action_force` | 0–5 strength score, constant per verb (*encourage* = 1, *request* = 3, *urge* = 4, *decide/demand* = 5) |
| `action_bindingness` | `binding` (directive: *decides*, *authorizes*, *approves*…), `hortatory` (requesting: *requests*, *urges*, *encourages*…), `contextual` (stocktaking: *recalls*, *welcomes*, *notes*…) |
| `assignee`, `assignee_class` | the actor the paragraph addresses |
| `action_inherited` | verb inherited from a chapeau ("Authorizes the SG to carry out … including the provision of: (a) …") |

Scope used throughout the lens: **operative paragraphs**
(`paragraph_type = 'operative' OR inferred_operative`) whose lead verb is
classified `binding` or `hortatory`. Contextual verbs take no action and are
excluded; `binding`/`hortatory` is a *pure function of the verb* (verified:
no verb maps to more than one bindingness value; only *support* has two
force values).

**Framing.** The UI deliberately says "directive" vs "requesting" language and
repeats, twice, that this describes the **strength of the wording, not legal
force** — a GA resolution is a recommendation however it is phrased. The DB
label `binding` never surfaces as user-facing copy.

## Spot-check of classification precision

### Verb / tone / force (33 paragraphs)

Sampled 3 random operative paragraphs for each of 11 verbs (decide,
authorize, endorse, request, urge, encourage, call upon, demand, invite,
recall, welcome), stable order via `md5(id)`, and read the text of each.

- **33 / 33** have the right lead verb, and the verb→tone (binding /
  hortatory / contextual) and verb→force mappings read correctly against the
  text ("Authorizes Member States to take all necessary measures…" → binding 5;
  "Calls upon all States to stop adopting…" → hortatory 3; "Welcomes the
  cooperation…" → contextual 0).
- 3 of the 33 were sub-paragraphs with `action_inherited = true`. All three
  were traced to their chapeau: two clearly correct (items under "Authorizes
  the Secretary-General to carry out… the provision of:" in A/RES/60/19;
  an item under "Encourages States to…" in A/RES/78/16), one defensible
  (A/RES/73/242 ¶62–63: purposes of a conference inherited from a "Recalls…"
  chapeau — contextual/0 is arguably right, since the paragraph restates
  already-adopted text rather than issuing a new command).

**Verb-level precision: 32–33 / 33 (~97–100 %).**

### Assignee class (16 paragraphs, 2 per class)

- Correct: member_states (2/2), secretary-general (2/2), un_body (2/2 — incl.
  President of the GA), un_system (2/2), secretariat_entity (UNODC ✓; the
  other is a genuinely multi-addressee paragraph "Member States, the
  Secretariat and relevant organs…" — any single class is a simplification).
- Misses/borderline: one `ngo_other` whose `assignee` captured a whole clause
  ("that States ensure through all necessary measures…" — should be
  member_states); one `unclear` that is plainly "States"; OHCHR classed as
  `special_procedure` (defensible only because the request benefits an
  Independent Expert).

**Assignee-class precision: ~13 / 16 (~81 %).** Good enough for a 7-class
aggregate over 6k–34k paragraphs per class, not for per-paragraph display.
The `unclear` class (33k paragraphs) is excluded from the dot plot.

## Findings (as shipped in the section)

1. **Decade trend** — share of directive language among classified operative
   paragraphs:
   - GA: 34.6 % (1940s) → 15.7 % (2020s), with a mid-1990s bump (25.3 %).
     The Assembly increasingly asks rather than orders.
   - SC: ~24 % until the 1980s, jumps to 45.0 % in the 1990s (end of the Cold
     War; sanctions committees, tribunals, PKO mandates are *decided*) and
     stays >43 %.
   - ECOSOC: parsed coverage before the 2010s is negligible, so decades with
     < 100 classified paragraphs are suppressed (constant
     `MIN_CLASSIFIED_PER_DECADE` in `lib/data/language-strength.ts`); the two
     plotted decades sit lowest (~12–14 %).
2. **Command gradient** (avg verb force, 0–5): secretary-general 2.93 >
   un_body 2.63 > special_procedure 2.56 ≈ member_states 2.56 > un_system
   2.50 > secretariat_entity 2.49 > ngo_other 2.43. The hierarchy of control:
   bodies the UN commands get *told* (and only they get directive verbs at
   all — un_body 3.3 %, SG 2.7 % directive vs member_states 0.5 %, un_system
   0.0 %), everyone else gets *asked*.
3. **Verb league**: *requests* 44,863 > *decides* 31,847 > *calls upon*
   24,931 > *encourages* 21,033 > *urges* 19,822. Directive verbs
   (*decides/endorses/authorizes/approves*) are concentrated in
   self-regarding matters (agenda, budget, own subsidiary bodies).
4. **SC "Demands"** callout: 6 paragraphs in the 1960s → 227 in the 1990s →
   253 in the 2010s; 101 so far in the 2020s.

## Implementation

- Data: `website/src/lib/data/language-strength.ts` — four SELECT-only
  queries (indexes on `action_verb_normalized` / `assignee_class` keep each
  <1 s), `unstable_cache` 1 h + React `cache`, fetched in the /secretariat
  page's existing `Promise.all`.
- UI: `LanguageStrengthTrend` (client; organ toggle + hover readout; selected
  organ in un-blue, others as grey context lines with direct end labels — the
  site's established grey+blue overlay language, avoiding a 3-hue categorical
  palette that the muted brand colors cannot support),
  `LanguageStrengthGradient` (server; dot plot, dot area ∝ paragraph count,
  truncated 2.2–3.1 axis explicitly labeled), `LanguageStrengthVerbs` +
  `LanguageStrengthDemands` (server; league table with count bar, 5-dot force
  meter, tone chip; decade mini-bars). Card opens via
  `/secretariat#language-of-command`.

## Limitations

- **Language strength ≠ legal force.** Repeated in the chart description and
  the source note. SC *demand* is classified hortatory (force 5): a demand
  addressed to a warring party is not a decision of the Council itself.
- Coverage: only parsed English texts; ECOSOC essentially 2010s+; SC coverage
  starts in the 1960s; ~15 k operative paragraphs have an unrecognized lead
  verb (NULL bindingness) and are excluded.
- `assignee_class` is ~81 % clean at paragraph level (multi-addressee
  paragraphs get one class; occasional clause-capture glitches); used only in
  7-class aggregate.
- Decade shares are computed over binding+hortatory only; adding contextual
  paragraphs would change levels but not the trends.
- Per-mandate language strength in the mandate detail sheet was considered
  and skipped: the detail views render from the `mandates` schema (different
  paragraph table), and a separate sidebar redesign is in flight — a
  language-profile line there would have widened this diff for little gain.

## Screenshots

| File | What |
| --- | --- |
| `screenshot-1440.png` | Full section at 1440 px, GA selected |
| `screenshot-sc-toggle.png` | Security Council toggle active + 1990s hover readout |
| `screenshot-390.png` | Full section at 390 px (trend chart scrolls horizontally; value labels flip inside the track) |
