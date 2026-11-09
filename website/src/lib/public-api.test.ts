import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  publicQuery,
  publicPageQuery,
  publicExportQuery,
  publicAgendaQuery,
  publicProgrammeQuery,
  assertExportWithinCap,
  ApiInputError,
  ApiLimitError,
} from '#lib/public-api'

test('browse endpoints default cleanly and reject ambiguous selectors', () => {
  assert.deepEqual(publicAgendaQuery(new URLSearchParams()), {
    body: 'GA',
    session: undefined,
  })
  assert.deepEqual(
    publicAgendaQuery(new URLSearchParams('body=SC&session=2025')),
    {
      body: 'SC',
      session: '2025',
    }
  )
  for (const query of [
    'body=other',
    'body=GA&body=SC',
    'session=80&session=81',
    'session=80.5',
    'session=abcdef',
    'session=12345',
  ])
    assert.throws(
      () => publicAgendaQuery(new URLSearchParams(query)),
      ApiInputError
    )
  assert.doesNotThrow(() => publicProgrammeQuery(new URLSearchParams()))
  for (const query of [
    'ppb_version=ppb2026',
    'ppb_version=ppb2027',
    'ppb_version=a&ppb_version=b',
  ])
    assert.throws(
      () => publicProgrammeQuery(new URLSearchParams(query)),
      ApiInputError
    )
})

const limitError =
  (rule: string, values: Record<string, unknown>) => (error: unknown) =>
    error instanceof ApiLimitError &&
    error.rule === rule &&
    Object.entries(values).every(([key, value]) => error.values[key] === value)

test('API pagination stops at 25 per page and 4 pages, with no clamping', () => {
  const query = publicPageQuery(
    new URLSearchParams('page=4&limit=25&entity=DESA')
  )
  assert.equal(query.page, 4)
  assert.equal(query.limit, 25)
  assert.equal(query.filters.entity, 'DESA')
  assert.equal(publicPageQuery(new URLSearchParams()).limit, 15)
  assert.throws(
    () => publicPageQuery(new URLSearchParams('limit=26')),
    limitError('page_size', { limit: 26 })
  )
  assert.throws(
    () => publicPageQuery(new URLSearchParams('limit=1000')),
    limitError('page_size', { limit: 1000 })
  )
  assert.throws(
    () => publicPageQuery(new URLSearchParams('page=5')),
    limitError('page_depth', { page: 5 })
  )
  assert.throws(
    () => publicPageQuery(new URLSearchParams('page=2000&limit=100')),
    ApiLimitError
  )
})
test('document search refuses include', () => {
  for (const query of ['include=details', 'include=anything'])
    assert.throws(
      () => publicPageQuery(new URLSearchParams(query)),
      (error: unknown) =>
        error instanceof ApiInputError &&
        !(error instanceof ApiLimitError) &&
        error.message.includes('include')
    )
  assert.doesNotThrow(() => publicPageQuery(new URLSearchParams('keyword=x')))
})

test('exports refuse include and selections over 1,000 documents', () => {
  assert.equal(publicExportQuery(new URLSearchParams()).format, 'csv')
  assert.throws(
    () => publicExportQuery(new URLSearchParams('format=json&include=details')),
    limitError('export_details', { include: 'details' })
  )
  assert.throws(
    () => publicExportQuery(new URLSearchParams('format=pdf')),
    (error) =>
      error instanceof ApiInputError && !(error instanceof ApiLimitError)
  )
  assert.doesNotThrow(() => assertExportWithinCap(1000))
  assert.throws(
    () => assertExportWithinCap(1001),
    (error: unknown) =>
      limitError('export_cap', { total: 1001, cap: 1000 })(error) &&
      (error as Error).message.includes('1001')
  )
})
test('filter values the parser would ignore are refused, not dropped', () => {
  assert.throws(
    () => publicQuery(new URLSearchParams({ entity: 'x'.repeat(257) })),
    ApiInputError
  )
  assert.equal(
    publicQuery(new URLSearchParams({ entity: 'x'.repeat(256) })).filters
      .entity,
    'x'.repeat(256)
  )
})
test('ambiguous and malformed paging is rejected', () => {
  for (const input of [
    'page=0',
    'page=-1',
    'page=1.5',
    'page=9007199254740992',
    'limit=no',
    'start_year=10000',
    'min_citations=1000001',
    'entity=A&entity=B',
  ]) {
    assert.throws(() => publicQuery(new URLSearchParams(input)), ApiInputError)
  }
})
test('structured budget-location filters retain shared parser semantics', () => {
  const query = publicQuery(
    new URLSearchParams('mode=active_mandates&ppb_version=ppb2026')
  )
  assert.equal(query.filters.cited, '1')
  assert.equal(query.filters.ppb_version, 'ppb2026')
})
