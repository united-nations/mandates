import assert from 'node:assert/strict'
import test from 'node:test'

import {
  directoryRequestUrl,
  directoryResource,
  parseDirectoryPanel,
} from '#lib/directory-request'

test('preserves active filters while targeting the directory endpoint', () => {
  assert.equal(
    directoryRequestUrl('?organ=GA&page=2', 'organs'),
    '/api/secretariat/directories?organ=GA&page=2&panel=organs'
  )
  assert.equal(
    directoryRequestUrl('', 'catalogue'),
    '/api/secretariat/directories?panel=catalogue'
  )
})

test('validates panels and shares the budget resource', () => {
  assert.equal(parseDirectoryPanel('organs'), 'organs')
  assert.equal(parseDirectoryPanel('invalid'), null)
  assert.equal(directoryResource('cited'), 'budget')
  assert.equal(directoryResource('entities'), 'budget')
})
