import assert from 'node:assert/strict'
import test from 'node:test'

import { panelView } from '#lib/directory-panel-view'
import type { PanelProgress } from '#lib/directory-panel-view'

const progress = (over: Partial<PanelProgress> = {}): PanelProgress => ({
  empty: false,
  error: null,
  pending: false,
  ...over,
})

test('a first open has nothing to stand in for, so it shows a skeleton', () => {
  assert.deepEqual(panelView(progress({ empty: true, pending: true })), {
    show: 'skeleton',
  })
})

test('switching budget version never takes the content off screen', () => {
  // The frames one click renders: settled, navigation in flight, URL committed
  // with the hierarchy still on its way, and the new hierarchy in. The dialog
  // is sized by its content and held by the viewport, so any frame showing
  // something other than the content resizes the dialog around the reader.
  const frames = [
    progress(),
    progress({ pending: true }),
    progress({ pending: true }),
    progress(),
  ]
  assert.deepEqual(frames.map(panelView), [
    { show: 'content', stale: false },
    { show: 'content', stale: true },
    { show: 'content', stale: true },
    { show: 'content', stale: false },
  ])
})

test('a failed load is reported instead of the content it did not get', () => {
  assert.deepEqual(
    panelView(progress({ error: 'Directory request failed: 500' })),
    { show: 'error' }
  )
  assert.deepEqual(
    panelView(progress({ empty: true, error: 'boom', pending: true })),
    { show: 'error' }
  )
})
