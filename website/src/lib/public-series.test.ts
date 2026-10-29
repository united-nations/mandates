import { test } from 'node:test'
import assert from 'node:assert/strict'
import { publicSeries } from '#lib/public-series'

test('public series identify latest versions without leaking replacement terminology', () => {
  const old = publicSeries(
    { superseded_by: 'A/RES/80/1', is_latest: false, is_collection: false },
    'A/RES/79/1'
  )
  assert.equal(old?.latest_version, 'A/RES/80/1')
  assert.ok(!JSON.stringify(old).includes('superseded'))
  assert.equal(
    publicSeries(
      { superseded_by: null, is_latest: true, is_collection: false },
      'A/RES/80/1'
    )?.latest_version,
    'A/RES/80/1'
  )
})
test('collections and ambiguous series have no invented latest version', () => {
  assert.equal(
    publicSeries(
      { superseded_by: 'A/1', is_latest: true, is_collection: true },
      'A/2'
    )?.latest_version,
    null
  )
  assert.equal(
    publicSeries(
      { superseded_by: null, is_latest: false, is_collection: false },
      'A/2'
    )?.latest_version,
    null
  )
  assert.equal(publicSeries(null, 'A/2'), null)
})
