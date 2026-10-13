// Runs on Node's built-in test runner (`pnpm test`); see
// sg-report-summary.test.ts for why imports go through `#lib/`.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { MandatedSgReport } from '#lib/data/sg-report-links'
import type {
  PageOneSgReport,
  PageOneSgReports,
} from '#lib/data/sg-report-page-one-links'
import { unionSgReports } from '#lib/sg-report-union'

const pageOneRow = (
  recid: number,
  symbols: string[],
  date: string | null,
  title: string | null = `Report ${recid}`
): PageOneSgReport => ({
  report_recid: recid,
  report_symbols: symbols,
  title,
  date_published: date,
})

const catalogueRow = (
  recid: number,
  symbol: string,
  date: string | null,
  annex = false,
  title: string | null = `Report ${recid}`
): MandatedSgReport => ({
  report_recid: recid,
  report_symbol: symbol,
  title,
  date_published: date,
  annex_position_only: annex,
})

const accepted = (reports: PageOneSgReport[]): PageOneSgReports => ({
  acceptedRunId: '1',
  reports,
})

describe('unionSgReports', () => {
  it('gives one row per recid, with provenance from the sources that have it', () => {
    const result = unionSgReports(
      accepted([
        pageOneRow(1, ['A/80/1'], '2025-03-01'),
        pageOneRow(2, ['A/79/2'], '2024-03-01'),
      ]),
      [
        catalogueRow(2, 'A/79/2', '2024-03-01'),
        catalogueRow(3, 'A/78/3', '2023-03-01'),
      ]
    )
    assert.equal(result.pageOneAccepted, true)
    assert.deepEqual(
      result.reports.map((r) => [r.report_recid, r.provenance]),
      [
        [1, 'page_one'],
        [2, 'both'],
        [3, 'catalogue_notes'],
      ]
    )
  })

  it("uses page one's symbols where page one has the report, else the catalogue's one", () => {
    const result = unionSgReports(
      accepted([pageOneRow(1, ['A/75/75', 'E/2020/48'], '2020-04-01')]),
      [
        catalogueRow(1, 'A/75/75', '2020-04-01'),
        catalogueRow(2, 'A/74/70', '2019-04-01'),
      ]
    )
    assert.deepEqual(
      result.reports.map((r) => r.symbols),
      [['A/75/75', 'E/2020/48'], ['A/74/70']]
    )
  })

  it("keeps the catalogue's annex flag on catalogue and both rows, null on page-one rows", () => {
    const result = unionSgReports(
      accepted([
        pageOneRow(1, ['A/80/1'], '2025-03-01'),
        pageOneRow(2, ['A/79/2'], '2024-03-01'),
      ]),
      [
        catalogueRow(2, 'A/79/2', '2024-03-01', true),
        catalogueRow(3, 'A/78/3', '2023-03-01', true),
      ]
    )
    assert.deepEqual(
      result.reports.map((r) => r.catalogueAnnexOnly),
      [null, true, true]
    )
  })

  it('orders newest first, undated last, then by symbols, then by recid', () => {
    const result = unionSgReports(
      accepted([
        pageOneRow(5, ['S/2024/9'], '2024-06-01'),
        pageOneRow(6, ['A/79/1', 'S/2024/1'], '2024-06-01'),
        pageOneRow(7, ['A/79/1'], '2024-06-01'),
      ]),
      [
        catalogueRow(8, 'A/70/1', null),
        catalogueRow(9, 'A/81/1', '2026-01-01'),
        catalogueRow(4, 'A/79/1', '2024-06-01'),
      ]
    )
    assert.deepEqual(
      result.reports.map((r) => r.report_recid),
      [9, 4, 7, 6, 5, 8]
    )
  })

  it('throws, naming the report, when the two sources disagree on title or date', () => {
    assert.throws(
      () =>
        unionSgReports(accepted([pageOneRow(42, ['A/80/42'], '2025-01-01')]), [
          catalogueRow(42, 'A/80/42', '2025-01-02'),
        ]),
      /SG report 42:/
    )
    assert.throws(
      () =>
        unionSgReports(
          accepted([pageOneRow(43, ['A/80/43'], '2025-01-01', 'One title')]),
          [catalogueRow(43, 'A/80/43', '2025-01-01', false, 'Another title')]
        ),
      /SG report 43:/
    )
  })

  it('throws when one read returns the same report twice, rather than calling it both', () => {
    assert.throws(
      () =>
        unionSgReports(accepted([]), [
          catalogueRow(7, 'A/80/7', '2025-01-01'),
          catalogueRow(7, 'A/80/7 COLOR', '2025-01-01'),
        ]),
      /SG report 7: the catalogue-notes read returned it twice/
    )
    assert.throws(
      () =>
        unionSgReports(
          accepted([
            pageOneRow(8, ['A/80/8'], '2025-01-01'),
            pageOneRow(8, ['A/80/8'], '2025-01-01'),
          ]),
          []
        ),
      /SG report 8: the page-one read returned it twice/
    )
  })

  it('with no accepted page-one run, gives the catalogue rows, labelled, and says so', () => {
    const result = unionSgReports({ acceptedRunId: null }, [
      catalogueRow(3, 'A/78/3', '2023-03-01', true),
      catalogueRow(2, 'A/79/2', '2024-03-01'),
    ])
    assert.equal(result.pageOneAccepted, false)
    assert.deepEqual(
      result.reports.map((r) => [r.report_recid, r.provenance, r.symbols]),
      [
        [2, 'catalogue_notes', ['A/79/2']],
        [3, 'catalogue_notes', ['A/78/3']],
      ]
    )
  })

  it('is empty when neither source has a report for the page', () => {
    assert.deepEqual(unionSgReports(accepted([]), []), {
      pageOneAccepted: true,
      reports: [],
    })
  })
})
