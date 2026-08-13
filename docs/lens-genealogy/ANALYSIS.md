# Boilerplate Genealogy — analysis

A lens that traces how UN resolution text mutates across renewal chains: which
paragraphs are copy-pasted verbatim for decades (boilerplate), which mutate,
which appear and disappear.

- Precompute: `scripts/genealogy/build_genealogy.py` (stdlib only; reads the DB
  read-only via `psql`). Output: `website/src/data/genealogy.json` (~1.3 MB).
- UI: `/genealogy` (`website/src/app/genealogy/page.tsx`) with `GenealogyHeadline`
  (headline chart) and `ChainDNA` (the grid); linked from `/secretariat`.

## Data source & chains

Chains come from the committed `digitallibrary.resolution_series` matview
(migrations 021 + 030): recurring resolutions / decisions / HRC presidential
statements grouped by a normalized title (`normalize_series_title`, a SQL port
of `normalize_radically`, audited at 35/35 named-successor precision).

Each `(series_key, un_body, doc_type)` group is treated as one renewal chain,
documents ordered by `(year, symbol)`.

**Deviation from the matview's default gates — deliberate.** We select on
`is_recurring AND is_informative` but NOT `NOT is_collection`. The
`is_collection` flag (any year >= 3 docs, or > 1.5 docs/year on average) exists
to suppress FALSE named successors; but Security Council renewal chains renew
twice a year, so > 1.5 docs/year marks every one of them (UNIFIL, UNFICYP,
UNOMIG) as a "collection". For TEXT genealogy dense renewals are the whole
point, so we keep them and instead drop only hard catalog bursts — any single
year with >= 4 qualifying documents (petition / agenda-umbrella records). An
incoherent group that slips through aligns as mostly-new (low verbatim), which
drags the boilerplate estimate DOWN, never up.

Paragraphs used: `paragraph_type IN ('preambular','operative')` and
`char_length >= 25`. This drops procedural meeting notes, footnotes and vote
records (parsed as `type = NULL`), per-document noise that would never match
across resolutions anyway.

Scope of the shipped dataset: the 200 longest chains by number of parsed
resolutions (5,252 documents, 179,296 paragraphs). The DNA view ships full
per-cell detail for a curated 30-chain subset (the 3 hand-checked defaults + a
General-Assembly / Security-Council mix).

## Alignment method

For each pair of CONSECUTIVE documents in a chain we align paragraphs, so
runtime is O(pairs * n^2) with an n^2 only within one adjacent pair. Two
similarity measures, both `difflib.SequenceMatcher.ratio()` on token lists:

- Match ratio (norm): tokens lower-cased, every digit-run collapsed to `#`,
  punctuation stripped. So a clause whose only change is its dates / meeting
  numbers / report symbols still tracks across renewals.
- Verbatim ratio (raw): tokens lower-cased only. Distinguishes a literal
  copy-paste from a date-only edit.

Matching is greedy 1:1 between consecutive documents: candidate pairs pass a
length-bucket prefilter (token-length ratio >= 0.4) and `real_quick_ratio` /
`quick_ratio` cheap bounds, then survivors with norm ratio >= 0.55 are sorted
descending and assigned uniquely.

Status of each paragraph in the newer document:

| status | rule |
|---|---|
| verbatim | matched, raw ratio >= 0.97 |
| mutated  | matched, norm ratio >= 0.55 but raw < 0.97 |
| new      | no match in the previous document |

Lineage tracking. A matched paragraph inherits its predecessor's lineage id; an
unmatched one starts a new lineage. To avoid duplicate lineages when a paragraph
is dropped for a single renewal and re-adopted, a gap-bridge (<= 2 renewals)
reconnects an unmatched paragraph to a recently-ended lineage if it still
matches (norm >= 0.55; labelled mutated). Genuinely new text matches no
recently-ended lineage, so real regime breaks still surface — e.g. UNIFIL's
overhaul after the July 2006 war (resolution 1701) is clearly visible as a
lineage break in the DNA grid.

### Thresholds — why these values

- 0.97 verbatim: on inspection this cleanly separates true copy-paste (ratio
  1.00, or 0.98-0.99 for a one-word typo/OCR difference) from date-edited
  clauses (0.80-0.95). Lowering it to 0.9 starts absorbing genuine rewrites.
- 0.55 match: the point below which two "Calls upon States to..." clauses are
  different actions rather than an edit of the same one. Fuzziest boundary.
- 0.4 length-bucket / gap <= 2: performance + noise guards; loosening them
  changes results < 1 pp.

## Hand-check (3 chains)

Consecutive pairs were pulled straight from `document_paragraphs` and the
computed labels compared to the actual texts.

1. UNIFIL — Security Council renewal, S/RES/1310(2000) -> S/RES/1337(2001)
   (21 paragraphs in the newer resolution).
   - Every verbatim label is a genuinely identical clause (raw ratio 1.00):
     "Reiterates its strong support for the territorial integrity...", "Requests
     the Secretary-General to continue consultations...", "Looks forward to the
     early fulfilment of the mandate...", "Stresses the importance of... a
     comprehensive, just and lasting peace in the Middle East...".
   - mutated correctly caught date/wording edits ("Decides to extend the present
     mandate of UNIFIL ... until 31 July 2001" vs "...31 January 2001"), and a
     cross-position match (the annual SG report recital moved position but was
     tracked).
   - new correctly flagged the operative additions ("Decides to return the
     military personnel of UNIFIL...", "Condemns all acts of violence...").
   - Verdict: ~18/21 unambiguously correct; the 2-3 judgement calls are all at
     the 0.55-0.63 mutated-vs-new boundary (a reworded "Recalling also..."
     recital), which is inherently ambiguous.

2. Oceans and the law of the sea — GA annual, A/RES/55/7 -> A/RES/56/12
   (84 paragraphs). 23 verbatim, 28 mutated, 33 new. All 23 verbatim labels are
   genuine recurring framework boilerplate ("Reaffirming that the Convention
   sets out the legal framework...", "Calls upon States to harmonize... their
   national legislation...", "Reaffirms the unified character of the
   Convention;"). Spot-check of verbatim labels: correct.

3. Situation of human rights in Belarus — GA/HRC, A/HRC/RES/23/15 ->
   A/HRC/RES/26/25 (14 paragraphs). 5 verbatim, 8 mutated, 1 new. Verbatim
   labels are genuine ("The Human Rights Council,", "Guided by the purposes and
   principles of the Charter...", "Recalling also Human Rights Council
   resolutions 5/1 and 5/2...", "Urges the Government of Belarus to cooperate
   fully with the Special Rapporteur..."). Correct.

Precision summary. The verbatim label is essentially exact (>= 0.97 raw is
near-identical by construction; 0 misclassifications found in the samples). The
residual error (~10% of paragraphs on the busy UNIFIL pair) lives entirely at
the mutated<->new boundary, where a heavily reworded recital and a new recital
are genuinely hard to separate. Because that boundary sits INSIDE the "carried
over" vs "new" split, it moves the headline percentages by only a few points and
does not affect the verbatim (copy-paste) numbers at all.

## Headline findings (real numbers)

Averaged across all 200 chains:

- Verbatim carry-over rises monotonically with chain age. First re-adoption:
  26.4% of paragraphs are word-for-word copies of the previous resolution; by
  the 3rd renewal 34%, by the 10th 45%, and in the deep tail (20+ renewals)
  55-60%. Counting verbatim + mutated ("carried over"): 55% at the first
  renewal, 68% by the third, ~80% by the twentieth.
- Resolutions have become far more copy-paste over time. Verbatim carry-over
  from a body's previous resolution, by decade adopted: 2-3% in the 1950s-60s
  -> 12% in the 1980s -> 33% in the 1990s -> 49% in the 2000s -> 56% in the
  2010s -> 67% in the 2020s. (Part of the low early-decade figure is scan-OCR
  fragmentation — see limitations — but the trend is far too large to be an
  artifact.)
- Oldest surviving verbatim sentences (re-adopted essentially unchanged the
  longest): "Having considered the question of the Tokelau Islands," (48 years,
  32 resolutions); "Expressing grave concern that... millions of people have
  been and are being uprooted from their homes as refugees and displaced
  persons..." (41 years, 37 resolutions); disarmament and outer-space recitals
  at 34-38 years.

## Limitations

1. SC chain fragmentation. The title-based series key splits one real renewal
   history across wording variants ("extension of the mandate...", "renewal of
   the mandate...", "...in Lebanon" vs "...in Lebanon (UNIFIL)"), so Security
   Council chains are shorter than the true renewal sequence. Only 5 SC chains
   clear the 200-chain length cut; the analyzed set is 195 GA + 5 SC + a few
   ECOSOC. The headline is therefore General-Assembly-weighted.
2. OCR noise in pre-1994 scans. Split paragraphs and footnote fragments in
   digitized older resolutions register as spurious "new" text, so the verbatim
   share is, if anything, underestimated for early decades — the secular trend
   is conservative.
3. Greedy 1:1 matching can mis-assign among several near-identical clauses in
   one resolution (repeated "Calls upon..." operatives). This churns lineage ids
   without changing the per-document verbatim/mutated/new counts; the gap-bridge
   mitigates it but does not eliminate it.
4. Consecutive-only alignment. Text is compared to the immediately previous
   resolution, not a chain-wide consensus. A clause that skips two renewals and
   returns is treated as new (beyond the <= 2 gap-bridge).
5. Venue changes inside a chain. Some series mix instruments (Belarus: GA
   2007-08 then HRC from 2011), which shows as a burst of "new" at the handover
   even though the topic is continuous.

## Reproduce

    export DATABASE_URL=...        # read-only is sufficient
    python3 scripts/genealogy/build_genealogy.py   # ~2.5 min, writes the JSON

Tunables (chain cap, thresholds, featured set, gap-bridge) are constants at the
top of the script.
