import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  countActionHierarchy,
  matchesActionFilter,
} from '#lib/paragraph-action-filters'

test('category selection matches every child and leaves remain category-specific', () => {
  const request = {
    action_verb: 'Requests',
    action_verb_normalized: 'request',
    action_verb_type: 'directive',
  }
  assert.equal(matchesActionFilter(request, 'directive'), true)
  assert.equal(matchesActionFilter(request, 'directive:request'), true)
  assert.equal(matchesActionFilter(request, 'request'), true)
  assert.equal(matchesActionFilter(request, 'deciding:request'), false)
  assert.equal(matchesActionFilter(request, 'deciding'), false)
  assert.equal(
    matchesActionFilter({ action_verb_type: 'directive' }, 'directive'),
    false
  )
})

test('deduplicates category counts and normalized lemmas within each paragraph', () => {
  const paragraph = {
    mandates: [
      {
        action_verb: 'Requests',
        action_verb_normalized: 'request',
        action_verb_type: 'directive',
      },
      {
        action_verb: 'Also requests',
        action_verb_normalized: 'request',
        action_verb_type: 'directive',
      },
      {
        action_verb: 'Invites',
        action_verb_normalized: 'invite',
        action_verb_type: 'directive',
      },
      {
        action_verb: 'Decides',
        action_verb_normalized: 'decide',
        action_verb_type: 'deciding',
      },
    ],
  }
  const counts = countActionHierarchy([paragraph])
  assert.deepEqual(counts.categories, { directive: 1, deciding: 1 })
  assert.deepEqual(counts.verbs, {
    directive: { request: 1, invite: 1 },
    deciding: { decide: 1 },
  })
})

test('keeps zero-count options when other filters exclude a paragraph', () => {
  const counts = countActionHierarchy(
    [
      {
        mandates: [{ action_verb: 'Requests', action_verb_type: 'directive' }],
      },
    ],
    () => false
  )
  assert.deepEqual(counts.categories, { directive: 0 })
  assert.deepEqual(counts.verbs, { directive: { requests: 0 } })
})

test('does not discard unknown categories or inherited normalized actions', () => {
  const counts = countActionHierarchy([
    {
      mandates: [
        { action_verb_normalized: 'decide' },
        { action_verb: 'Affirms', action_verb_type: 'custom' },
      ],
    },
  ])
  assert.deepEqual(counts.categories, { unclear: 1, custom: 1 })
  assert.equal(
    matchesActionFilter({ action_verb_normalized: 'decide' }, 'unclear:decide'),
    true
  )
})
