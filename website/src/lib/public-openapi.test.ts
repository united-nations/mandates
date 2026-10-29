import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildPublicOpenApi, FILTER_DESCRIPTIONS } from '#lib/public-openapi'
import { FILTER_PARAMS } from '#lib/filter-constants'
import { agentGuide } from '#lib/agent-reference'

test('published OpenAPI matches its schema source', () => {
  const published = JSON.parse(
    readFileSync(new URL('../../public/openapi.json', import.meta.url), 'utf8')
  )
  assert.deepEqual(published, buildPublicOpenApi())
  for (const parameter of FILTER_PARAMS)
    assert.ok(FILTER_DESCRIPTIONS[parameter], parameter)
})
test('agent guide carries retrieval and interpretation requirements', () => {
  const guide = agentGuide()
  for (const concept of [
    'jsonUrl',
    'hasMore',
    'ppb_version',
    'not_included',
    'unavailable',
    'not frozen snapshots',
    'not legal status',
  ])
    assert.ok(guide.includes(concept), concept)
  assert.ok(!guide.includes('.txt?'))
  assert.ok(!guide.includes('llms-full.txt'))
  assert.ok(!guide.includes('superseded'))
})
