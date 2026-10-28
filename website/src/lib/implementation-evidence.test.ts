import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  EVIDENCE_KINDS,
  evidenceAnchor,
  matchParagraphEvidence,
  normalizeEvidenceSymbol,
  reportEvidencePdfUrl,
  summarizeEvidence,
  groupParagraphEvidence,
  splitEvidenceQuote,
  type ImplementationEvidenceCase,
} from '#lib/implementation-evidence'

const cases: ImplementationEvidenceCase[] = JSON.parse(
  readFileSync(
    new URL('../data/implementation-evidence-pilot.json', import.meta.url),
    'utf8'
  )
)

describe('implementation evidence source matching', () => {
  const doha = cases.find((item) => item.symbol === 'A/RES/76/258')!
  const target = doha.paragraphs[0]
  const paragraph = {
    section: 'annex',
    annex_index: 1,
    prefix: '52.',
    text: target.requestedText,
  }

  it('distinguishes annex provisions from identically numbered main OPs and other annexes', () => {
    assert.equal(
      matchParagraphEvidence(doha, {
        ...paragraph,
        section: 'main',
        annex_index: null,
      }),
      undefined
    )
    assert.equal(
      matchParagraphEvidence(doha, { ...paragraph, annex_index: 2 }),
      undefined
    )
    assert.equal(matchParagraphEvidence(doha, paragraph), target)
  })

  it('withholds reviewed mappings after substantive edits, tolerating whitespace only', () => {
    assert.equal(
      matchParagraphEvidence(doha, {
        ...paragraph,
        text: paragraph.text + ' Amended.',
      }),
      undefined
    )
    assert.equal(
      matchParagraphEvidence(doha, {
        ...paragraph,
        text: paragraph.text.replaceAll(' ', '\n '),
      }),
      target
    )
    assert.equal(matchParagraphEvidence(null, paragraph), undefined)
  })

  it('normalizes SC spacing without conflating different resolution versions', () => {
    assert.equal(
      normalizeEvidenceSymbol('S/RES/2220 (2015)'),
      'S/RES/2220(2015)'
    )
    assert.notEqual(
      normalizeEvidenceSymbol('A/RES/80/129'),
      normalizeEvidenceSymbol('A/RES/79/199')
    )
  })

  it('counts shared evidence once and does not equate analysis with results', () => {
    const passage = target.passages[0]
    assert.equal(summarizeEvidence([passage, passage]).total, 1)
    const summary = summarizeEvidence(target.passages)
    assert.equal(
      summary.counts.results,
      0,
      'feasibility analysis does not establish an operational university'
    )
    assert.equal(
      Object.values(summary.counts).reduce((a, b) => a + b, 0),
      summary.total
    )
  })
})

describe('action-level evidence groups', () => {
  const doha = cases.find((item) => item.symbol === 'A/RES/76/258')!
    .paragraphs[0]

  it('splits Doha into seven reviewed components without losing any of its 25 passages', () => {
    const groups = groupParagraphEvidence(doha)
    assert.equal(groups.length, 7)
    assert.equal(
      new Set(groups.flatMap((group) => group.passages.map((p) => p.id))).size,
      25
    )
    const resources = groups.find(
      (group) => group.quote === 'resource requirements'
    )!
    assert.deepEqual(
      resources.passages.map((p) => p.number),
      [53, 54]
    )
    assert.equal(summarizeEvidence(resources.passages).counts.results, 0)
  })

  it('highlights an exact clause while preserving the complete source text', () => {
    for (const component of doha.components ?? []) {
      const parts = splitEvidenceQuote(doha.requestedText, component.quote)
      assert.equal(parts.map((part) => part.text).join(''), doha.requestedText)
      assert.deepEqual(
        parts.filter((part) => part.highlighted).map((part) => part.text),
        [component.quote]
      )
    }
    assert.ok(
      splitEvidenceQuote('Other text', 'not present').every(
        (part) => !part.highlighted
      )
    )
    assert.ok(
      splitEvidenceQuote('same same', 'same').every((part) => !part.highlighted)
    )
  })

  it('groups every other case using its existing reviewed mappings', () => {
    for (const item of cases)
      for (const paragraph of item.paragraphs) {
        const groups = groupParagraphEvidence(paragraph)
        assert.deepEqual(
          new Set(groups.flatMap((group) => group.passages.map((p) => p.id))),
          new Set(paragraph.passages.map((p) => p.id))
        )
        for (const group of groups) {
          assert.equal(
            new Set(group.passages.map((p) => p.id)).size,
            group.passages.length
          )
        }
      }
  })
})

describe('seven-case evidence corpus', () => {
  it('retains unambiguous scopes, valid evidence categories, source hashes and PDF locators', () => {
    assert.equal(cases.length, 7)
    assert.equal(
      new Set(cases.map((item) => normalizeEvidenceSymbol(item.symbol))).size,
      7
    )
    assert.equal(
      cases.reduce((sum, c) => sum + c.paragraphs.length, 0),
      31
    )
    for (const item of cases) {
      assert.match(item.report.sha256, /^[a-f0-9]{64}$/)
      const anchors = item.paragraphs.map(evidenceAnchor)
      assert.equal(new Set(anchors).size, anchors.length)
      for (const paragraph of item.paragraphs) {
        assert.ok(paragraph.requestedText.length > 30)
        assert.equal(
          new Set(paragraph.passages.map((p) => p.id)).size,
          paragraph.passages.length
        )
        for (const passage of paragraph.passages) {
          assert.ok(passage.kind in EVIDENCE_KINDS)
          assert.ok(passage.text.length > 60)
          assert.ok(passage.mappings.length > 0)
          assert.equal(passage.kind === 'results', passage.resultLevel !== null)
          const url = new URL(
            reportEvidencePdfUrl(item.report.symbol, passage.pdfPage)
          )
          assert.equal(url.searchParams.get('s'), item.report.symbol)
          assert.equal(url.hash, `#page=${passage.pdfPage}`)
        }
      }
    }
    assert.throws(() => reportEvidencePdfUrl('A/81/336', 0))
    assert.throws(() => reportEvidencePdfUrl('A/81/336', 1.5))
  })

  it('keeps the corrected issue date and the network output on PDF page 15', () => {
    assert.equal(
      cases.find((c) => c.report.symbol === 'E/2025/8')?.report.issuedDate,
      '2025-01-03'
    )
    const network = cases
      .find((c) => c.symbol === 'A/RES/80/129')!
      .paragraphs.find((p) => p.label === 'OP 11')!
    assert.equal(network.passages[0].number, 57)
    assert.equal(network.passages[0].pdfPage, 15)
    assert.equal(network.passages[0].resultLevel, 'output')
    assert.match(network.passages[0].text, /87 Member States/)
  })
})
