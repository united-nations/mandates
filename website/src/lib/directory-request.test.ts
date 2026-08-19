import assert from 'node:assert/strict'
import test from 'node:test'

import { directoryRequestUrl } from '#lib/directory-request'

test('preserves active filters while targeting the directory endpoint', () => {
  assert.equal(
    directoryRequestUrl('?organ=GA&page=2'),
    '/api/secretariat/directories?organ=GA&page=2'
  )
  assert.equal(directoryRequestUrl(''), '/api/secretariat/directories')
})
