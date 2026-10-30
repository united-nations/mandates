import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  publicQuery,
  publicAgendaQuery,
  publicProgrammeQuery,
  ApiInputError,
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

test('API pagination reaches past the UI offset boundary', () => {
  const query = publicQuery(
    new URLSearchParams('page=2000&limit=100&entity=DESA')
  )
  assert.equal(query.page, 2000)
  assert.equal(query.filters.entity, 'DESA')
  assert.equal(query.limit, 100)
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
