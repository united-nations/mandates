import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  evidenceAnchor,
  type ImplementationEvidenceCase,
} from '#lib/implementation-evidence'

const cases: ImplementationEvidenceCase[] = JSON.parse(
  readFileSync(
    new URL('../data/implementation-evidence-pilot.json', import.meta.url),
    'utf8'
  )
)
const manifest: {
  symbol: string
  reportSymbol: string
  reportPdfSha256: string
  reportPages: number
  provisions: {
    section: string
    annexIndex: number | null
    prefix: string
    position?: number
    textSha256: string
  }[]
}[] = JSON.parse(
  readFileSync(
    new URL(
      '../../../data/references/implementation-evidence/review-manifest.json',
      import.meta.url
    ),
    'utf8'
  )
)
const corpus: Record<
  string,
  {
    pdfSha256: string
    sourceText: string
    paragraphs: {
      number: number
      text: string
      pdfPage: number
      pageSpans: { start: number; end: number; pdfPage: number }[]
    }[]
  }
> = JSON.parse(
  readFileSync(
    new URL(
      '../../../data/references/implementation-evidence/report-corpus.json',
      import.meta.url
    ),
    'utf8'
  )
)

describe('complete sample implementation review', () => {
  it('accounts for every operative, annex and subordinate provision in the independent registry snapshot', () => {
    assert.equal(
      manifest.reduce((sum, item) => sum + item.provisions.length, 0),
      783
    )
    assert.equal(cases.length, manifest.length)
    for (const expected of manifest) {
      const actual = cases.find((item) => item.symbol === expected.symbol)!
      assert.ok(actual)
      assert.equal(actual.report.symbol, expected.reportSymbol)
      assert.equal(actual.report.sha256, expected.reportPdfSha256)
      assert.equal(
        actual.paragraphs.length,
        expected.provisions.length,
        actual.symbol
      )
      const byAnchor = new Map(
        actual.paragraphs.map((p) => [evidenceAnchor(p), p])
      )
      assert.equal(byAnchor.size, expected.provisions.length)
      for (const source of expected.provisions) {
        const target = actual.paragraphs.find(
          (p) =>
            p.locator.section === source.section &&
            p.locator.annexIndex === source.annexIndex &&
            p.locator.prefix === source.prefix &&
            p.locator.position === source.position
        )
        assert.ok(target, `${actual.symbol} ${JSON.stringify(source)}`)
        assert.equal(
          createHash('sha256').update(target.requestedText).digest('hex'),
          source.textSha256
        )
        assert.ok(target.review)
        assert.ok(
          target.review.note.trim(),
          `${actual.symbol} ${target.label}: missing review decision`
        )
        assert.equal(
          target.review.status,
          target.passages.length > 0 ? 'matched' : 'no-match'
        )
      }
    }
  })

  it('ties every quoted report paragraph and PDF page to the complete archived report', () => {
    for (const item of cases) {
      const report = corpus[item.report.symbol]
      const expected = manifest.find((entry) => entry.symbol === item.symbol)!
      assert.equal(report.pdfSha256, item.report.sha256)
      assert.equal(
        (report.sourceText.match(/=== PDF PAGE /g) ?? []).length,
        expected.reportPages
      )
      const source = new Map(report.paragraphs.map((p) => [p.number, p]))
      for (const provision of item.paragraphs)
        for (const passage of provision.passages) {
          const original = source.get(passage.number)
          assert.ok(
            original,
            `${item.report.symbol} paragraph ${passage.number}`
          )
          assert.equal(passage.id, `${item.report.symbol}:${passage.number}`)
          assert.equal(passage.text, original.text, passage.id)
          assert.equal(passage.pdfPage, original.pdfPage, passage.id)
          assert.ok(
            passage.pdfPage >= 1 && passage.pdfPage <= expected.reportPages
          )
          for (const mapping of passage.mappings)
            for (const excerpt of mapping.excerpts ?? []) {
              const start = original.text.indexOf(excerpt.text)
              const end = start + excerpt.text.length - 1
              const firstPage: number | undefined = original.pageSpans.find(
                (span) => span.start <= start && start < span.end
              )?.pdfPage
              const lastPage: number | undefined = original.pageSpans.find(
                (span) => span.start <= end && end < span.end
              )?.pdfPage
              assert.equal(
                excerpt.pdfPage,
                firstPage,
                `${passage.id}: excerpt start page`
              )
              assert.equal(
                excerpt.pdfPageEnd ?? excerpt.pdfPage,
                lastPage,
                `${passage.id}: excerpt end page`
              )
            }
        }
    }
  })
})
