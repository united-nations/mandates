import assert from 'node:assert/strict'
import test from 'node:test'
import { applyRetainedMetric } from '#lib/retained-text-metrics'
import type { DocumentTextMetrics } from '#lib/text-analytics'

const current: DocumentTextMetrics = {
  word_count: null,
  similarity_to_previous: null,
  previous_document_symbol: 'previous',
  can_compare: false,
  comparison_unavailable_reason: 'ordered',
}
const cache = {
  current: {
    source_fingerprint: 'state-current',
    content_sha256: 'hash-current',
    word_count: 150,
    previous_document_symbol: 'previous',
    previous_content_sha256: 'hash-previous',
    similarity_to_previous: 0.8,
  },
  previous: {
    source_fingerprint: 'state-previous',
    content_sha256: 'hash-previous',
    word_count: 100,
    previous_document_symbol: null,
    previous_content_sha256: null,
    similarity_to_previous: null,
  },
}
const fingerprints = new Map([
  ['current', 'state-current'],
  ['previous', 'state-previous'],
])

test('verified retained snapshot provides explicitly provisional counts and paired score', () => {
  assert.deepEqual(
    applyRetainedMetric('current', current, cache, fingerprints),
    {
      ...current,
      word_count: 150,
      similarity_to_previous: 0.8,
      can_compare: true,
      provisional: true,
    }
  )
})
test('changes to either raw/semantic snapshot invalidate the affected metric', () => {
  assert.deepEqual(
    applyRetainedMetric(
      'current',
      current,
      cache,
      new Map([['current', 'changed']])
    ),
    current
  )
  const changedPrevious = applyRetainedMetric(
    'current',
    current,
    cache,
    new Map([
      ['current', 'state-current'],
      ['previous', 'changed'],
    ])
  )
  assert.equal(changedPrevious.word_count, 150)
  assert.equal(changedPrevious.similarity_to_previous, null)
  assert.equal(changedPrevious.can_compare, false)
})
test('wrong predecessor, input hash and ambiguous order cannot reuse a cached score', () => {
  for (const changed of [
    { ...current, previous_document_symbol: 'another' },
    { ...current, comparison_unavailable_reason: 'ambiguous_order' as const },
    { ...current, comparison_unavailable_reason: 'first' as const },
  ])
    assert.equal(
      applyRetainedMetric('current', changed, cache, fingerprints)
        .similarity_to_previous,
      null
    )
  assert.equal(
    applyRetainedMetric(
      'current',
      current,
      {
        ...cache,
        current: { ...cache.current, previous_content_sha256: 'wrong' },
      },
      fingerprints
    ).similarity_to_previous,
    null
  )
})
