import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isContentElement,
  resolveVisibilityTier,
  parseBracketPart,
  isolateBracketPart,
  isMainPreambular,
  shouldCollapsePreamble,
} from '#lib/paragraph-presentation'

describe('fulltext visibility', () => {
  it('recovers a NULL-subtype body without promoting a masthead', () => {
    const rows = [
      { type: 'frontmatter', subtype: 'masthead', text: 'United Nations' },
      {
        type: 'frontmatter',
        subtype: null,
        text: 'Decides to continue its work.',
      },
    ]
    const tier = resolveVisibilityTier(rows)
    assert.equal(tier, 'frontmatter')
    assert.deepEqual(
      rows.filter((p) => isContentElement(p, tier)),
      [rows[1]]
    )
  })
  it('promotes a title-only body, ignores empty rows and headings as proof of body', () => {
    const rows = [
      { type: 'heading', text: 'Decision' },
      { type: 'paragraph', text: ' ' },
      { type: 'title', text: 'Decides to defer consideration.' },
    ]
    assert.equal(resolveVisibilityTier(rows), 'title')
    assert.equal(isContentElement(rows[2], 'title'), true)
    assert.equal(isContentElement(rows[1], 'title'), false)
  })
  it('does not promote boilerplate when a substantive body exists', () => {
    const rows = [
      { type: 'frontmatter', text: 'Distr.: General' },
      { type: 'paragraph', text: 'Requests a report.' },
    ]
    assert.equal(resolveVisibilityTier(rows), 'strict')
    assert.equal(isContentElement(rows[0]), false)
  })
  it('preserves substantive annex titles, tables and footnotes', () => {
    for (const type of ['paragraph', 'table', 'footnote']) {
      assert.equal(
        isContentElement({ type, text: 'Substantive text', section: 'annex' }),
        true
      )
    }
    assert.equal(
      isContentElement({
        type: 'title',
        text: 'Annex title',
        section: 'annex',
      }),
      true
    )
    assert.equal(
      isContentElement({ type: 'title', text: 'Document title' }),
      false
    )
  })
})

describe('bracketed resolution parts', () => {
  const rows = [
    { type: 'heading', subtype: 'subres', text: 'B', text_index: 1 },
    { type: 'paragraph', text: 'B content', text_index: 1 },
    { type: 'heading', subtype: 'subres', text: 'A', text_index: 7 },
    { type: 'paragraph', text: 'A content', text_index: 7 },
    { type: 'paragraph', text: 'Global preamble', text_index: null },
  ]
  it('normalizes resolution symbols and rejects compound/roman expressions', () => {
    assert.deepEqual(parseBracketPart(' a/res/50/204 [a] '), {
      parentSymbol: 'A/RES/50/204',
      letter: 'A',
    })
    for (const symbol of [
      'A/RES/50/204[B-IV]',
      'A/RES/50/204[XIV]',
      'A/RES/50/204[A-C]',
      'A/DEC/50/1[A]',
    ]) {
      assert.equal(parseBracketPart(symbol), null)
    }
  })
  it('isolates by printed letter, never ordinal, conserving exactly its block', () => {
    assert.deepEqual(isolateBracketPart(rows, 'A'), rows.slice(2, 4))
    assert.deepEqual(isolateBracketPart(rows, 'B'), rows.slice(0, 2))
    assert.deepEqual(isolateBracketPart(rows, 'C'), [])
  })
  it('rejects duplicate headings, missing indices and reused indices', () => {
    assert.deepEqual(isolateBracketPart([...rows, rows[2]], 'A'), [])
    assert.deepEqual(
      isolateBracketPart([{ ...rows[2], text_index: null }], 'A'),
      []
    )
    assert.deepEqual(
      isolateBracketPart([...rows, { ...rows[0], text_index: 7 }], 'A'),
      []
    )
  })
})

// The same partition is used by the component before its main-flow empty state.
describe('preamble presentation partition', () => {
  const preamble = {
    type: 'paragraph',
    text: 'Recalling its previous decision,',
    paragraph_type: 'preambular',
  }
  const title = { type: 'title', text: 'Decision' }
  it('keeps preamble-only and title plus preamble documents in the main flow', () => {
    for (const rows of [[preamble], [title, preamble]]) {
      const tier = resolveVisibilityTier(rows)
      const collapse = shouldCollapsePreamble(rows)
      const main = rows.filter(
        (p) => isContentElement(p, tier) && !(collapse && isMainPreambular(p))
      )
      assert.deepEqual(main, [preamble])
    }
  })
  it('partitions mixed text without losing any visible element and searches preambles inline', () => {
    const operative = {
      type: 'paragraph',
      text: 'Decides to continue.',
      paragraph_type: 'operative',
    }
    const rows = [title, preamble, operative]
    const tier = resolveVisibilityTier(rows)
    for (const searching of [false, true]) {
      const collapse = shouldCollapsePreamble(rows, searching)
      assert.equal(collapse, !searching)
      const main = rows.filter(
        (p) => isContentElement(p, tier) && !(collapse && isMainPreambular(p))
      )
      const folded = rows.filter(
        (p) => isContentElement(p, tier) && collapse && isMainPreambular(p)
      )
      assert.equal(new Set([...main, ...folded]).size, 2)
      if (searching) assert.ok(main.includes(preamble))
    }
  })
})
