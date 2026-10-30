import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splitSubprogrammeLabel } from '#lib/budget-labels'

test('subprogramme exports separate explicit numbers and retain source titles', () => {
  assert.deepEqual(splitSubprogrammeLabel('Subprogramme 10. Statistics', 10), {
    number: 10,
    title: 'Statistics',
  })
  assert.deepEqual(
    splitSubprogrammeLabel('Subprogramme 2: Economic analysis', 2),
    { number: 2, title: 'Economic analysis' }
  )
  assert.deepEqual(splitSubprogrammeLabel('All Subprogrammes', null), {
    number: null,
    title: 'All Subprogrammes',
  })
  assert.deepEqual(splitSubprogrammeLabel('Policy support', null), {
    number: null,
    title: 'Policy support',
  })
  assert.deepEqual(splitSubprogrammeLabel(null, null), {
    number: null,
    title: null,
  })
})
