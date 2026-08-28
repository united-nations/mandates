// Runs on Node's built-in test runner (`pnpm test`), which strips TypeScript
// types natively — Node >= 22.18, declared in package.json engines. No test
// framework is installed, matching the data-processing tests' stdlib-only
// unittest setup.
//
// The `#lib/` specifier resolves via package.json `imports`. Node's ESM
// resolver requires a file extension on relative specifiers, but TypeScript
// forbids `.ts` there unless `allowImportingTsExtensions` is switched on for
// the whole project; the imports-field alias carries the extension in its
// mapping instead, so neither side needs a concession.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  annexPositionNote,
  classifyReportCadence,
  observedYearSpan,
  REPORTS_TILE_MIN_COUNT,
  SPAN_TILE_MIN_YEARS,
} from '#lib/sg-report-summary'

/** One mid-year ISO date per entry; null passes through as an undated row. */
function dates(...years: (number | null)[]): (string | null)[] {
  return years.map((y) => (y === null ? null : `${y}-06-15`))
}

describe('classifyReportCadence', () => {
  it('classifies one report in every year of the span as Annual', () => {
    assert.deepEqual(
      classifyReportCadence(dates(2015, 2016, 2017, 2018, 2019)),
      {
        value: 'Annual',
        sub: 'one report each year',
      }
    )
  })

  it('classifies a steady multiple per year as ≈k / year', () => {
    assert.deepEqual(
      classifyReportCadence(
        dates(2020, 2020, 2021, 2021, 2022, 2022, 2023, 2023, 2024, 2024)
      ),
      { value: '≈2 / year', sub: 'across 5 years' }
    )
  })

  it('classifies one report in every second year as Biennial', () => {
    assert.deepEqual(
      classifyReportCadence(dates(2010, 2012, 2014, 2016, 2018)),
      {
        value: 'Biennial',
        sub: 'one report every second year',
      }
    )
  })

  // The null outcome is the most common one in the corpus: the tile fires on
  // ~1.3% of visible pages. A series that fails the regularity test says
  // nothing rather than something hedged.
  it('returns null for an irregular series', () => {
    assert.equal(
      classifyReportCadence(dates(2005, 2006, 2010, 2011, 2019)),
      null
    )
  })

  it('returns null below five reports, even for a clean annual run', () => {
    assert.equal(classifyReportCadence(dates(2019, 2020, 2021, 2022)), null)
  })

  it('returns null for a span shorter than five periods', () => {
    // Five reports across four fully populated years: enough observations,
    // too few periods for a rhythm claim, and not a steady multiple.
    assert.equal(
      classifyReportCadence(dates(2020, 2021, 2022, 2023, 2023)),
      null
    )
  })

  it('fails a series with an interior dropped year', () => {
    // 2018 is missing from an otherwise annual 2015–2020 run. The exact
    // regularity test is the classifier's whole point: a gap breaks the
    // claim rather than being absorbed.
    assert.equal(
      classifyReportCadence(dates(2015, 2016, 2017, 2019, 2020)),
      null
    )
  })

  it('fails a biennial series with a doubled year', () => {
    assert.equal(
      classifyReportCadence(dates(2010, 2012, 2012, 2014, 2016, 2018)),
      null
    )
  })

  it('returns null when every year is populated but the rate is neither 1 nor ≥2', () => {
    assert.equal(
      classifyReportCadence(dates(2019, 2019, 2020, 2021, 2022, 2023)),
      null
    )
  })

  it('returns null when all dates are null', () => {
    assert.equal(classifyReportCadence(dates(null, null, null)), null)
  })

  it('ignores undated rows and classifies the dated ones', () => {
    assert.deepEqual(
      classifyReportCadence(dates(2016, null, 2017, 2018, 2019, 2020, null)),
      { value: 'Annual', sub: 'one report each year' }
    )
  })

  it('does not count undated rows toward the minimum-report gate', () => {
    // Four dated rows plus undated ones is still four observations.
    assert.equal(
      classifyReportCadence(dates(2019, 2020, 2021, 2022, null, null)),
      null
    )
  })
})

describe('observedYearSpan', () => {
  it('returns null when no row carries a date', () => {
    assert.equal(observedYearSpan(dates(null, null)), null)
    assert.equal(observedYearSpan([]), null)
  })

  it('labels a single year without a range', () => {
    assert.deepEqual(observedYearSpan(dates(2015)), { label: '2015', years: 1 })
  })

  it('labels a multi-year span with an inclusive year count', () => {
    assert.deepEqual(observedYearSpan(dates(2006, 2010, 2026)), {
      label: '2006–2026',
      years: 21,
    })
  })

  it('computes the span over dated rows only', () => {
    assert.deepEqual(observedYearSpan(dates(2010, null, 2014)), {
      label: '2010–2014',
      years: 5,
    })
  })
})

describe('tile visibility thresholds', () => {
  // Measured over the corpus, not chosen: 95.6% of visible pages carry ≤4
  // reports and 85.8% span a single year. Pinned so a casual edit cannot
  // silently move what counts as a finding.
  it('pins the Reports tile threshold', () => {
    assert.equal(REPORTS_TILE_MIN_COUNT, 5)
  })

  it('pins the Span tile threshold', () => {
    assert.equal(SPAN_TILE_MIN_YEARS, 5)
  })
})

describe('annexPositionNote', () => {
  // null, not '', so the caller renders no paragraph at all rather than an
  // empty one. The predecessor returned '.' here, which is truthy — a caller
  // testing the return value for emptiness would have printed a bare period.
  const table: [number, number, string | null][] = [
    [0, 5, null],
    [0, 1, null],
    [
      1,
      1,
      'This report was submitted as an annex rather than the report itself.',
    ],
    [
      3,
      3,
      'All of these reports were submitted via an annex rather than the report itself.',
    ],
    [
      2,
      7,
      '2 of these reports were submitted via an annex rather than the report itself.',
    ],
    [
      1,
      7,
      '1 of these reports were submitted via an annex rather than the report itself.',
    ],
  ]
  for (const [annexCount, reportCount, expected] of table) {
    it(`annexCount=${annexCount} of reportCount=${reportCount} reads ${JSON.stringify(expected)}`, () => {
      assert.equal(annexPositionNote(annexCount, reportCount), expected)
    })
  }

  // Every non-zero case has to stand on its own now that nothing precedes it.
  it('returns a complete sentence whenever it returns anything', () => {
    for (const [annexCount, reportCount] of [
      [1, 1],
      [3, 3],
      [2, 7],
    ]) {
      const note = annexPositionNote(annexCount, reportCount)
      assert.ok(note, 'expected a note')
      assert.match(note, /^[A-Z0-9]/, 'starts a sentence, not a fragment')
      assert.match(note, /\.$/, 'ends a sentence')
    }
  })
})
