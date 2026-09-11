// Runs on Node's built-in test runner (`pnpm test`); see
// sg-report-summary.test.ts for why the `#lib/` specifier is used.
//
// The grammar itself is tested in paragraph-search.test.ts. What is tested
// here is the translation of a parsed query into a WHERE fragment: that the
// three conventions come out as AND, a single pattern, and NOT; that a term
// is bound as literal text with LIKE's metacharacters escaped; and that a
// query with nothing in it is no search.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseSearchQuery } from '#lib/search-query'
import {
  buildSearchPredicate,
  caseFoldSql,
  likePattern,
  likePrefixPattern,
  searchFoldSql,
  type SearchField,
} from '#lib/data/search-query-sql'

const fields: SearchField[] = [
  { expr: 'd.title', fold: 'text' },
  { expr: 'd.subjects', fold: 'case', array: true },
]

function predicate(query: string, firstParamIndex = 1) {
  return buildSearchPredicate(parseSearchQuery(query), fields, firstParamIndex)
}

/** The top-level groups of a clause: one per term, joined by AND. */
function groups(clause: string): string[] {
  // The clause is `(g1 AND g2 ...)`; a group is `(...)` or `NOT (...)`, and
  // nothing inside a group contains ") AND (" or ") AND NOT (".
  return clause
    .slice(1, -1)
    .split(/(?<=\)) AND (?=\(|NOT \()/)
}

describe('buildSearchPredicate', () => {
  it('ANDs whitespace-separated terms, each bound as its own pattern', () => {
    const { clause, params } = predicate('convention accession')
    assert.deepEqual(params, ['%convention%', '%accession%'])
    assert.ok(clause)
    const parts = groups(clause)
    assert.equal(parts.length, 2)
    assert.match(parts[0], /\$1/)
    assert.doesNotMatch(parts[0], /\$2/)
    assert.match(parts[1], /\$2/)
    assert.doesNotMatch(parts[1], /\$1/)
  })

  it('a quoted phrase is one pattern, spaces included', () => {
    const { clause, params } = predicate('"report to the General Assembly"')
    assert.deepEqual(params, ['%report to the general assembly%'])
    assert.ok(clause)
    assert.equal(groups(clause).length, 1)
  })

  it('a leading minus wraps that term in NOT and leaves the others alone', () => {
    const { clause, params } = predicate('convention -accession')
    assert.deepEqual(params, ['%convention%', '%accession%'])
    assert.ok(clause)
    const parts = groups(clause)
    assert.equal(parts.length, 2)
    assert.doesNotMatch(parts[0], /^NOT/)
    assert.match(parts[1], /^NOT \(/)
  })

  it('a query of only exclusions is a valid search', () => {
    const { clause, params } = predicate('-accession')
    assert.deepEqual(params, ['%accession%'])
    assert.ok(clause)
    const parts = groups(clause)
    assert.equal(parts.length, 1)
    assert.match(parts[0], /^NOT \(/)
  })

  it('a query with no terms is no search', () => {
    assert.deepEqual(predicate('   '), { clause: null, params: [] })
    assert.deepEqual(predicate('-'), { clause: null, params: [] })
    assert.deepEqual(predicate('""'), { clause: null, params: [] })
  })

  it('a positive term matches any field, the array field through UNNEST', () => {
    const { clause } = predicate('report')
    assert.ok(clause)
    const [group] = groups(clause)
    assert.match(group, / OR /)
    assert.match(group, /UNNEST\(COALESCE\(d\.subjects, '\{\}'::text\[\]\)\)/)
    assert.match(group, /LOWER\(COALESCE\(d\.title, ''\)\)/)
  })

  it('folds each field the way its declaration says', () => {
    const { clause } = predicate('report')
    assert.ok(clause)
    const [group] = groups(clause)
    // The text field goes through every stage; the case field is LOWER alone.
    assert.match(group, /btrim\(regexp_replace\(translate\(replace\(replace\(LOWER\(COALESCE\(d\.title, ''\)\)/)
    assert.match(group, /WHERE LOWER\(element\.value\) LIKE/)
    assert.doesNotMatch(group, /translate\(replace\(replace\(LOWER\(element\.value\)/)
  })

  it('numbers parameters from the index the caller gives', () => {
    const { clause, params } = predicate('a b', 7)
    assert.equal(params.length, 2)
    assert.ok(clause)
    assert.match(clause, /\$7/)
    assert.match(clause, /\$8/)
    assert.doesNotMatch(clause, /\$1\b/)
  })
})

describe('likePattern', () => {
  it('wraps the term for a substring match', () => {
    assert.equal(likePattern('convention'), '%convention%')
  })

  // A term is text, not a pattern: "50%" means the two characters and the
  // sign, "a_b" the underscore, and a backslash itself.
  it('escapes LIKE metacharacters so they match literally', () => {
    assert.equal(likePattern('50%'), '%50\\%%')
    assert.equal(likePattern('a_b'), '%a\\_b%')
    assert.equal(likePattern('a\\b'), '%a\\\\b%')
  })

  it('the prefix form escapes the same and anchors only the start', () => {
    assert.equal(likePrefixPattern('a/res/79'), 'a/res/79%')
    assert.equal(likePrefixPattern('50%'), '50\\%%')
  })
})

describe('caseFoldSql', () => {
  it('is LOWER and nothing else', () => {
    assert.equal(caseFoldSql('d.title'), 'LOWER(d.title)')
  })
})

describe('searchFoldSql', () => {
  it('spells every stage of the JavaScript fold', () => {
    const sql = searchFoldSql('d.title')
    assert.match(sql, /LOWER\(d\.title\)/)
    assert.match(sql, /E'\\u00AD'/)
    assert.match(sql, /E'\\u200B'/)
    assert.match(
      sql,
      /translate\(.*E'\\u2018\\u2019\\u201C\\u201D\\u2010\\u2011\\u2013\\u2014\\u00A0\\u202F', E'\\'\\'""----  '\)/
    )
    assert.match(sql, /regexp_replace\(.*'\\s\+', ' ', 'g'\)/)
    assert.match(sql, /^btrim\(/)
  })

  it('maps ten characters to ten, so translate cannot drop any', () => {
    const from = '\u2018\u2019\u201C\u201D\u2010\u2011\u2013\u2014\u00A0\u202F'
    const to = "''\"\"----  "
    assert.equal(from.length, to.length)
  })
})
