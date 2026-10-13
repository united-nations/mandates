// Runs on Node's built-in test runner (`pnpm test`); see
// sg-report-summary.test.ts for why the `#lib/` specifier is used.
//
// Every behaviour here was chosen rather than fallen into: the folds each
// answer a counted occurrence in the paragraph corpus, and the parse rules
// are the three conventions every search box teaches (terms ANDed, quoted
// phrases, leading-minus exclusion) plus deliberate decisions about the
// edges those conventions generate between them.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  compileSearchMarker,
  findMarkRanges,
  matchesSearchTerms,
  parseSearchQuery,
  searchFold,
} from '#lib/paragraph-search'

function matches(text: string, query: string): boolean {
  return matchesSearchTerms(text, parseSearchQuery(query))
}

describe('searchFold', () => {
  it('folds a non-breaking hyphen (U+2011) to an ASCII hyphen', () => {
    assert.equal(searchFold('System\u2011wide'), 'system-wide')
  })

  it('folds an en dash to an ASCII hyphen', () => {
    assert.equal(searchFold('en \u2013 dash'), 'en - dash')
  })

  it('folds a non-breaking space to a plain space', () => {
    assert.equal(searchFold('Rule\u00A032'), 'rule 32')
  })

  it('folds curly apostrophes to straight', () => {
    assert.equal(searchFold('women\u2019s'), "women's")
  })

  it('folds curly double quotes to straight', () => {
    assert.equal(searchFold('\u201COceans and seas\u201D'), '"oceans and seas"')
  })

  // Soft hyphens render as nothing, so the reader types the word without
  // them: deletion, never substitution.
  it('deletes soft hyphens', () => {
    assert.equal(searchFold('devel\u00ADopment'), 'development')
  })

  it('deletes zero-width spaces', () => {
    assert.equal(searchFold('a\u200Bb'), 'ab')
  })

  it('collapses doubled spaces and trims', () => {
    assert.equal(searchFold('  doubled  spaces  '), 'doubled spaces')
  })
})

describe('parseSearchQuery', () => {
  it('splits whitespace-separated terms, all required', () => {
    assert.deepEqual(parseSearchQuery('report Assembly'), [
      { term: 'report', exclude: false },
      { term: 'assembly', exclude: false },
    ])
  })

  it('treats a double-quoted span as one phrase', () => {
    assert.deepEqual(parseSearchQuery('"report to the General Assembly"'), [
      { term: 'report to the general assembly', exclude: false },
    ])
  })

  // A live filter parses on every keystroke, so a phrase being typed is
  // unclosed most of its life. Running it to the end of the query keeps it
  // narrowing sensibly instead of matching nothing until the close quote.
  it('runs an unclosed quote to the end of the query', () => {
    assert.deepEqual(parseSearchQuery('"report to the'), [
      { term: 'report to the', exclude: false },
    ])
  })

  it('smart quotes still make a phrase', () => {
    assert.deepEqual(parseSearchQuery('\u201Cgeneral assembly\u201D'), [
      { term: 'general assembly', exclude: false },
    ])
  })

  // The dash asymmetry, direction one: a typed leading minus is the
  // exclusion operator.
  it('a typed leading minus excludes its term', () => {
    assert.deepEqual(parseSearchQuery('-recalls'), [
      { term: 'recalls', exclude: true },
    ])
  })

  // Direction two: dashes fold only after the tokenizer has consumed the
  // operator, so a pasted en or em dash is text to find, never an
  // exclusion the reader did not type.
  it('a pasted leading en dash does not exclude', () => {
    assert.deepEqual(parseSearchQuery('\u2013recalls'), [
      { term: '-recalls', exclude: false },
    ])
  })

  it('a pasted leading em dash does not exclude either', () => {
    assert.deepEqual(parseSearchQuery('\u2014recalls'), [
      { term: '-recalls', exclude: false },
    ])
  })

  it('a minus attached to a quoted phrase excludes the phrase', () => {
    assert.deepEqual(parseSearchQuery('-"takes note"'), [
      { term: 'takes note', exclude: true },
    ])
  })

  it('a minus inside a word is literal', () => {
    assert.deepEqual(parseSearchQuery('follow-up'), [
      { term: 'follow-up', exclude: false },
    ])
  })

  it('a bare minus is not yet a term', () => {
    assert.deepEqual(parseSearchQuery('-'), [])
  })

  it('a detached minus contributes nothing, its neighbour survives', () => {
    assert.deepEqual(parseSearchQuery('- report'), [
      { term: 'report', exclude: false },
    ])
  })

  // A dash standing between words in pasted prose is separator
  // punctuation, dropped by the same rule as the bare minus above.
  it('a standalone pasted dash contributes nothing', () => {
    assert.deepEqual(parseSearchQuery('development \u2013 including'), [
      { term: 'development', exclude: false },
      { term: 'including', exclude: false },
    ])
  })

  it('an empty quote pair is not a term', () => {
    assert.deepEqual(parseSearchQuery('""'), [])
  })

  it('doubled spaces yield no empty tokens', () => {
    assert.deepEqual(parseSearchQuery('a  b'), [
      { term: 'a', exclude: false },
      { term: 'b', exclude: false },
    ])
  })

  it('phrase edge spaces are trimmed', () => {
    assert.deepEqual(parseSearchQuery('" report "'), [
      { term: 'report', exclude: false },
    ])
  })

  it('a pasted non-breaking space splits terms like a typed one', () => {
    assert.deepEqual(parseSearchQuery('Rule\u00A032'), [
      { term: 'rule', exclude: false },
      { term: '32', exclude: false },
    ])
  })

  it('a whitespace-only or empty query is no search', () => {
    assert.deepEqual(parseSearchQuery('  '), [])
    assert.deepEqual(parseSearchQuery(''), [])
  })
})

describe('matchesSearchTerms', () => {
  const clause =
    'Requests the Secretary-General to submit a report to the General Assembly'

  it('requires every term, anywhere in the paragraph', () => {
    assert.equal(matches(clause, 'report Assembly'), true)
    assert.equal(matches(clause, 'report Council'), false)
  })

  it('requires adjacency for a phrase', () => {
    assert.equal(matches(clause, '"report to the General Assembly"'), true)
    assert.equal(matches(clause, '"report Assembly"'), false)
  })

  it('an exclusion rejects on presence and passes on absence', () => {
    assert.equal(matches(clause, 'report -Council'), true)
    assert.equal(matches(clause, 'report -Assembly'), false)
  })

  it('a query of only exclusions is valid', () => {
    assert.equal(matches(clause, '-Council'), true)
    assert.equal(matches(clause, '-Assembly'), false)
  })

  // The dash asymmetry at match level, both directions: same word, same
  // paragraph, opposite results depending on what the reader actually
  // typed.
  it('typed minus excludes; pasted dash searches', () => {
    assert.equal(matches('Requests a report', '-recalls'), true)
    assert.equal(matches('Requests a report', '\u2013recalls'), false)
  })

  // AND-over-substring already reaches inside words, which is why
  // wildcards and stemming were refused: "develop" reaches "development",
  // but nothing invents matches that are not substrings.
  it('matches substrings within words, and nothing looser', () => {
    assert.equal(matches('sustainable development goals', 'develop'), true)
    assert.equal(matches(clause, 'develop'), false)
  })

  it('a keyboard hyphen finds a non-breaking hyphen in the source', () => {
    assert.equal(matches('System\u2011wide coherence', 'system-wide'), true)
  })

  it('folds apply inside quoted phrases', () => {
    assert.equal(
      matches('System\u2011wide coherence', '"system-wide coherence"'),
      true
    )
    assert.equal(matches('under Rule\u00A032 of the rules', '"rule 32"'), true)
  })

  it('a straight apostrophe finds the curly spelling', () => {
    assert.equal(matches('the women\u2019s programme', "women's"), true)
  })

  it('a soft hyphen in the source is invisible to the match', () => {
    assert.equal(matches('devel\u00ADopment goals', 'development'), true)
  })

  it('an empty term list matches everything', () => {
    assert.equal(matches('some text', ''), true)
  })
})

/**
 * Marking runs a pattern over the raw text rather than translating an offset
 * out of the folded string, so every case here asserts two things at once: the
 * filter still matches, and the mark lands on the characters the reader sees.
 * A case where the filter matches and the mark does not is a real outcome, not
 * a failure - the paragraph renders unmarked. `marked` makes both visible.
 */
function ranges(text: string, query: string) {
  return findMarkRanges(text, compileSearchMarker(parseSearchQuery(query)))
}

/** The text with every marked range wrapped, so a case reads as its result. */
function marked(text: string, query: string): string {
  let out = ''
  let at = 0
  for (const { start, end } of ranges(text, query)) {
    out += text.slice(at, start) + '[' + text.slice(start, end) + ']'
    at = end
  }
  return out + text.slice(at)
}

describe('findMarkRanges', () => {
  it('marks a plain single-term match', () => {
    assert.equal(
      marked('Requests the Secretary-General to report', 'report'),
      'Requests the Secretary-General to [report]'
    )
  })

  it('marks every occurrence of a term, not just the first', () => {
    assert.equal(
      marked('report on the report', 'report'),
      '[report] on the [report]'
    )
  })

  it('is case-insensitive without lowercasing, so offsets stay raw', () => {
    assert.equal(
      marked('Decides to REQUEST a report', 'request'),
      'Decides to [REQUEST] a report'
    )
  })

  it('marks a term straddling a soft hyphen', () => {
    const text = 'the devel' + '\u00AD' + 'opment agenda'
    assert.equal(
      marked(text, 'development'),
      'the [devel' + '\u00AD' + 'opment] agenda'
    )
  })

  it('marks across a zero-width space', () => {
    const text = 'peace' + '\u200B' + 'keeping mandate'
    assert.equal(
      marked(text, 'peacekeeping'),
      '[peace' + '\u200B' + 'keeping] mandate'
    )
  })

  it('a straight apostrophe marks the curly spelling', () => {
    const text = 'the Council' + '\u2019' + 's decision'
    assert.equal(
      marked(text, "council's"),
      'the [Council' + '\u2019' + 's] decision'
    )
  })

  it('a keyboard hyphen marks an en dash source', () => {
    const text = 'the Secretary' + '\u2013' + 'General reported'
    assert.equal(
      marked(text, 'secretary-general'),
      'the [Secretary' + '\u2013' + 'General] reported'
    )
  })

  it('a keyboard hyphen marks a non-breaking hyphen source', () => {
    const text = 'System' + '\u2011' + 'wide coherence'
    assert.equal(
      marked(text, 'system-wide'),
      '[System' + '\u2011' + 'wide] coherence'
    )
  })

  it('marks a multi-word phrase across a doubled space', () => {
    assert.equal(
      marked('on oceans  and seas today', '"oceans and seas"'),
      'on [oceans  and seas] today'
    )
  })

  it('marks a phrase across a line break', () => {
    const text = 'on oceans and' + '\n' + 'seas today'
    assert.equal(
      marked(text, '"oceans and seas"'),
      'on [oceans and' + '\n' + 'seas] today'
    )
  })

  it('marks two ANDed terms separately', () => {
    assert.equal(
      marked('the report of the Council', 'report council'),
      'the [report] of the [Council]'
    )
  })

  it('an excluded term marks nowhere', () => {
    assert.equal(
      marked('a report on funding', 'report -funding'),
      'a [report] on funding'
    )
  })

  it('a query of only exclusions marks nothing', () => {
    assert.deepEqual(ranges('a report on funding', '-funding'), [])
  })

  it('an empty query marks nothing', () => {
    assert.deepEqual(ranges('a report on funding', '   '), [])
  })

  it('returns no ranges rather than throwing when the term is not there', () => {
    assert.deepEqual(ranges('Requests the Secretary-General', 'budget'), [])
  })

  it('merges overlapping ranges so no character is emitted twice', () => {
    assert.equal(
      marked('the reporting cycle', 'report reporting'),
      'the [reporting] cycle'
    )
  })

  it('merges ranges that overlap only partly', () => {
    assert.equal(marked('coordination', 'coord dination'), '[coordination]')
  })

  it('treats regex metacharacters in a term as literal text', () => {
    assert.equal(
      marked('costs (net) of the plan', '"(net)"'),
      'costs [(net)] of the plan'
    )
  })

  it('marks the phrase, not its component words', () => {
    assert.equal(
      marked('oceans and seas; seas and oceans', '"oceans and seas"'),
      '[oceans and seas]; seas and oceans'
    )
  })

  it('a marker compiled once is safe to run against segment after segment', () => {
    const marker = compileSearchMarker(parseSearchQuery('report'))
    assert.deepEqual(findMarkRanges('report', marker), [{ start: 0, end: 6 }])
    assert.deepEqual(findMarkRanges('report', marker), [{ start: 0, end: 6 }])
    assert.deepEqual(findMarkRanges('a report', marker), [{ start: 2, end: 8 }])
  })

  it('every case the filter matches on is either marked or deliberately not', () => {
    const text = 'Requests the Secretary' + '\u2013' + 'General to report'
    const query = 'secretary-general report'
    assert.equal(matchesSearchTerms(text, parseSearchQuery(query)), true)
    assert.equal(ranges(text, query).length, 2)
  })
})
