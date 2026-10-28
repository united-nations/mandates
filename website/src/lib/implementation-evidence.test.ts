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
  splitEvidenceQuotes,
  evidenceNavigationParts,
  selectReportEvidence,
  evidenceBadgeItems,
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
  const target = doha.paragraphs.find(
    (p) => p.locator.section === 'annex' && p.locator.prefix === '52.'
  )!
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

  it('disambiguates repeated annex letters and unnumbered targets by source position', () => {
    const child = {
      ...target,
      locator: { ...target.locator, prefix: '', position: 75 },
    }
    const review = { ...doha, paragraphs: [child] }
    const source = { ...paragraph, prefix: null, position: 75 }
    assert.equal(matchParagraphEvidence(review, source), child)
    assert.equal(
      matchParagraphEvidence(review, { ...source, position: 76 }),
      undefined
    )
    assert.notEqual(
      evidenceAnchor(child),
      evidenceAnchor({ ...child, locator: { ...child.locator, position: 76 } })
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
  const doha = cases
    .find((item) => item.symbol === 'A/RES/76/258')!
    .paragraphs.find(
      (p) => p.locator.section === 'annex' && p.locator.prefix === '52.'
    )!

  it('retains the original Doha clause mappings when the complete review adds evidence', () => {
    const groups = groupParagraphEvidence(doha)
    assert.ok(groups.length >= 7)
    const retained = new Set(
      groups.flatMap((group) => group.passages.map((p) => p.number))
    )
    for (const number of [
      1,
      2,
      3,
      ...Array.from({ length: 20 }, (_, i) => 41 + i),
      73,
      74,
    ])
      assert.ok(
        retained.has(number),
        `Missing original Doha report paragraph ${number}`
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

  it('highlights all Doha clauses together, merging overlapping matches without duplicating words', () => {
    const quotes = (doha.components ?? []).map((component) => component.quote)
    const parts = splitEvidenceQuotes(doha.requestedText, quotes)
    assert.equal(parts.map((part) => part.text).join(''), doha.requestedText)
    for (const quote of quotes) {
      assert.ok(
        parts.some((part) => part.highlighted && part.text.includes(quote)),
        quote
      )
    }
    assert.equal(parts.filter((part) => part.highlighted).length, 6)
    assert.deepEqual(splitEvidenceQuotes('abcdefg', ['bcd', 'def']), [
      { text: 'a', highlighted: false },
      { text: 'bcdef', highlighted: true },
      { text: 'g', highlighted: false },
    ])
  })

  it('keeps overlapping highlight targets navigable without repeating source text', () => {
    const groups = groupParagraphEvidence(doha)
    const parts = evidenceNavigationParts(doha.requestedText, groups)
    assert.equal(parts.map((part) => part.text).join(''), doha.requestedText)
    assert.ok(parts.some((part) => part.keys.length >= 2))
    assert.equal(
      new Set(parts.flatMap((part) => part.keys)).size,
      groups.length
    )
    assert.deepEqual(
      evidenceNavigationParts('whole provision', [{ key: 'whole' }]),
      [{ text: 'whole provision', keys: [] }]
    )
    assert.deepEqual(
      evidenceNavigationParts('whole provision', [
        { key: 'whole', quote: 'whole provision' },
      ]),
      [{ text: 'whole provision', keys: [] }]
    )
    assert.ok(
      evidenceNavigationParts('same same', [
        { key: 'ambiguous', quote: 'same' },
      ]).every((part) => part.keys.length === 0)
    )
  })
})

describe('seven-case evidence corpus', () => {
  it('keeps every report excerpt exact and uniquely located, with valid excerpt-level badges', () => {
    for (const item of cases)
      for (const paragraph of item.paragraphs)
        for (const passage of paragraph.passages) {
          for (const mapping of passage.mappings) {
            assert.ok(mapping.excerpts?.length)
            for (const excerpt of mapping.excerpts ?? []) {
              assert.equal(passage.text.split(excerpt.text).length, 2)
              assert.ok(excerpt.kind in EVIDENCE_KINDS)
              assert.equal(
                excerpt.kind === 'results',
                excerpt.resultLevel !== null
              )
            }
            const selected = selectReportEvidence(passage, [mapping.component])
            assert.ok(selected.text.length <= passage.text.length + 12)
            assert.equal(selected.isExcerpt, selected.text !== passage.text)
          }
        }
  })

  it('retains reporting limits and varies excerpts with the selected request', () => {
    const sendai = cases
      .find((c) => c.symbol === 'A/RES/80/137')!
      .paragraphs.find((p) => p.label === 'OP 20')!
    const coverage = sendai.passages.find((p) => p.number === 10)!
    const monitoring = selectReportEvidence(coverage, [
      coverage.mappings[0].component,
    ])
    const data = selectReportEvidence(coverage, [
      coverage.mappings[1].component,
    ])
    assert.match(monitoring.text, /19 countries have yet to report/)
    assert.match(monitoring.text, /176 countries/)
    assert.doesNotMatch(data.text, /176 countries/)
    assert.match(data.text, /sex-disaggregated/)
    assert.ok(evidenceBadgeItems([coverage]).some((p) => p.kind === 'context'))
    const trade = cases
      .find((c) => c.symbol === 'A/RES/60/184')!
      .paragraphs.find((p) => p.label === 'OP 10')!
      .passages.find((p) => p.number === 55)!
    assert.match(
      selectReportEvidence(
        trade,
        trade.mappings.map((m) => m.component)
      ).text,
      /no use has been made of the waiver/
    )
  })

  it('unions overlapping excerpts in source order and falls back to full context for invalid excerpts', () => {
    const original = cases[0].paragraphs.flatMap((p) => p.passages)[0]
    const passage = {
      ...original,
      text: 'Alpha. Beta. Gamma. Delta.',
      mappings: [
        {
          component: 'a',
          basis: '',
          interpretation: '',
          excerpts: [
            { text: 'Gamma.', kind: 'activity' as const, resultLevel: null },
            { text: 'Alpha.', kind: 'activity' as const, resultLevel: null },
            {
              text: 'Alpha. Beta.',
              kind: 'activity' as const,
              resultLevel: null,
            },
          ],
        },
      ],
    }
    assert.equal(
      selectReportEvidence(passage, ['a']).text,
      'Alpha. Beta. Gamma. …'
    )
    assert.equal(selectReportEvidence(passage, ['unknown']).text, passage.text)
    const invalid = {
      ...passage,
      mappings: [
        {
          ...passage.mappings[0],
          excerpts: [
            { text: 'invented', kind: 'activity' as const, resultLevel: null },
          ],
        },
      ],
    }
    assert.equal(selectReportEvidence(invalid, ['a']).isExcerpt, false)
    assert.equal(selectReportEvidence(invalid, ['a']).text, passage.text)
  })

  it('uses exact unique clauses across all cases, with no lost report evidence', () => {
    for (const item of cases) {
      assert.ok(item.paragraphs.some((p) => p.components?.length))
      for (const paragraph of item.paragraphs) {
        for (const component of paragraph.components ?? []) {
          assert.notEqual(component.quote, paragraph.requestedText)
          assert.equal(paragraph.requestedText.split(component.quote).length, 2)
        }
        const groups = groupParagraphEvidence(paragraph)
        const parts = evidenceNavigationParts(paragraph.requestedText, groups)
        assert.equal(
          parts.map((part) => part.text).join(''),
          paragraph.requestedText
        )
        assert.deepEqual(
          new Set(parts.flatMap((part) => part.keys)),
          new Set(
            groups.filter((group) => group.quote).map((group) => group.key)
          )
        )
      }
    }
  })

  it('separates financial-integrity and ratings evidence and leaves research requests unhighlighted', () => {
    const meetings = cases
      .find((c) => c.symbol === 'A/RES/80/129')!
      .paragraphs.find((p) => p.label === 'OP 9')!
    const groups = groupParagraphEvidence(meetings)
    assert.deepEqual(
      groups
        .find((g) => g.quote?.includes('financial integrity'))!
        .passages.map((p) => p.number),
      [13]
    )
    assert.deepEqual(
      groups
        .find((g) => g.quote?.includes('credit rating agencies'))!
        .passages.map((p) => p.number),
      [41]
    )
    const support = cases
      .find((c) => c.symbol === 'S/RES/2349(2017)')!
      .paragraphs.find((p) => p.label === 'OP 8')!
    const parts = evidenceNavigationParts(
      support.requestedText,
      groupParagraphEvidence(support)
    )
    assert.ok(
      parts.some(
        (part) =>
          !part.keys.length && part.text.includes('gender-sensitive research')
      )
    )
  })

  it('retains unambiguous scopes, valid evidence categories, source hashes and PDF locators', () => {
    assert.equal(cases.length, 7)
    assert.equal(
      new Set(cases.map((item) => normalizeEvidenceSymbol(item.symbol))).size,
      7
    )
    assert.equal(
      cases.reduce((sum, c) => sum + c.paragraphs.length, 0),
      783
    )
    for (const item of cases) {
      assert.match(item.report.sha256, /^[a-f0-9]{64}$/)
      const anchors = item.paragraphs.map(evidenceAnchor)
      assert.equal(new Set(anchors).size, anchors.length)
      for (const paragraph of item.paragraphs) {
        assert.ok(paragraph.requestedText.length > 0)
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
