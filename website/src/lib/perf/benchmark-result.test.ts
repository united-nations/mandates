import assert from 'node:assert/strict'
import test from 'node:test'

import { digestArtifact } from '#lib/perf/benchmark-result'

test('digestArtifact is deterministic and includes serialized bytes', () => {
  const first = digestArtifact({ cards: [1, 2], count: 43_912 })
  const second = digestArtifact({ cards: [1, 2], count: 43_912 })

  assert.deepEqual(first, second)
  assert.equal(first.bytes, 29)
  assert.match(first.digest, /^[a-f0-9]{64}$/)
})

test('digestArtifact changes when output changes', () => {
  const first = digestArtifact({ count: 1 })
  const second = digestArtifact({ count: 2 })

  assert.notEqual(first.digest, second.digest)
})
