import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compileSearchMarker, parseSearchQuery } from '#lib/paragraph-search'
import { highlightSearchTerms, safeHighlightSearchTerms } from '#lib/utils'
import { parseSearchParams } from '#lib/filter-constants'
import { normalizePagination, MAX_PAGE_OFFSET } from '#lib/pagination'
import { verifiedDatabaseUrl } from '#lib/db/connection-options'

test('highlight markup escapes source HTML before, within and after matches', () => {
  for (const query of ['Example', 'img', 'alert', '"<img"']) {
    const html = highlightSearchTerms(
      'Example <img src=x onerror="alert(1)"> & \'quoted\'',
      compileSearchMarker(parseSearchQuery(query))
    )
    assert.ok(!html.includes('<img'))
    assert.ok(!html.includes('onerror="'))
    assert.ok(html.includes('&amp;'))
    assert.ok(html.includes('&#39;'))
    assert.ok(html.includes('<mark '))
  }
  const marker = compileSearchMarker(parseSearchQuery('missing'))
  assert.equal(safeHighlightSearchTerms('<b>Example</b>', marker), undefined)
})

test('URL controls bound pagination, query size, term count and numeric filters', () => {
  assert.deepEqual(normalizePagination('-1', '1000000'), {
    page: 1,
    limit: 100,
  })
  assert.deepEqual(normalizePagination('NaN', '0'), { page: 1, limit: 15 })
  assert.deepEqual(normalizePagination('1.5', '10junk'), { page: 1, limit: 15 })
  const page = normalizePagination('99999999', '100')
  assert.ok((page.page - 1) * page.limit <= MAX_PAGE_OFFSET)
  const filters = parseSearchParams({
    keyword: 'a '.repeat(33),
    start_year: 'NaN',
    min_citations: '-1',
    agenda_scope: 'x'.repeat(16_385),
    entity: 'x'.repeat(257),
  })
  assert.equal(filters.keyword, undefined)
  assert.equal(filters.start_year, undefined)
  assert.equal(filters.min_citations, undefined)
  assert.equal(filters.agenda_scope, undefined)
  assert.equal(filters.entity, undefined)
  assert.equal(
    parseSearchParams({ keyword: 'x'.repeat(513) }).keyword,
    undefined
  )
})

test('database URL validation fails closed without leaking credential values', () => {
  const base = 'postgresql://reader:private-password@database.invalid/db'
  for (const query of [
    '',
    '?sslmode=disable',
    '?sslmode=prefer',
    '?sslmode=require',
    '?sslmode=verify-full&sslmode=disable',
    '?sslmode=verify-full&ssl=false',
    '?sslmode=verify-full&uselibpqcompat=true',
  ]) {
    assert.throws(
      () => verifiedDatabaseUrl(base + query),
      (error) =>
        error instanceof Error && !error.message.includes('private-password')
    )
  }
  assert.equal(
    verifiedDatabaseUrl(base + '?sslmode=verify-full'),
    base + '?sslmode=verify-full'
  )
})
