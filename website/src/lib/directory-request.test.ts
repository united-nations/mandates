import assert from 'node:assert/strict'
import test from 'node:test'

import {
  directoryRequestUrl,
  directoryResource,
  directoryScopeKey,
  parseDirectoryPanel,
} from '#lib/directory-request'

test('carries the filters a panel depends on and drops the rest', () => {
  assert.equal(
    directoryRequestUrl('?organ=GA&page=2', 'organs'),
    '/api/secretariat/directories?organ=GA&panel=organs'
  )
  assert.equal(
    directoryRequestUrl('', 'catalogue'),
    '/api/secretariat/directories?panel=catalogue'
  )
})

test('orders the scope key so equivalent filters are one key', () => {
  assert.equal(
    directoryScopeKey('organ=GA&entity=DPPA', 'organs'),
    directoryScopeKey('entity=DPPA&organ=GA', 'organs')
  )
  assert.equal(
    directoryScopeKey(
      'organ=GA&page=3&limit=50&group=year&sort_by=date',
      'organs'
    ),
    'organ=GA'
  )
})

test('the budget hierarchy does not depend on the cited scope', () => {
  // Its rows come from the selected version's citations, so "cited by the
  // selected version" is true of every document it counts. Same key, so
  // switching scope costs no request and moves nothing on screen.
  assert.equal(
    directoryScopeKey('ppb_version=ppb2027&cited=1', 'budget'),
    directoryScopeKey('ppb_version=ppb2027', 'budget')
  )
  // The other two panels do count documents, so for them it is a real filter.
  assert.notEqual(
    directoryScopeKey('cited=1', 'organs'),
    directoryScopeKey('', 'organs')
  )
  assert.notEqual(
    directoryScopeKey('cited=1', 'catalogue'),
    directoryScopeKey('', 'catalogue')
  )
})

test('the budget version is part of every key', () => {
  assert.notEqual(
    directoryScopeKey('ppb_version=ppb2027', 'budget'),
    directoryScopeKey('ppb_version=ppb2026', 'budget')
  )
})

test('validates panels and shares the budget resource', () => {
  assert.equal(parseDirectoryPanel('organs'), 'organs')
  assert.equal(parseDirectoryPanel('invalid'), null)
  assert.equal(directoryResource('cited'), 'budget')
  assert.equal(directoryResource('entities'), 'budget')
})
