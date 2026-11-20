/* eslint-disable no-console -- Capture the diagnostic stdout sink without logging test data. */
import assert from 'node:assert/strict'
import test from 'node:test'
import { setTimeout } from 'node:timers/promises'
import { startRuntimeDiagnostics } from '#lib/runtime/diagnostics'

test('diagnostics use one timer, numeric summaries, and stop without retaining the pool', async () => {
  const messages: string[] = []
  const original = console.info
  console.info = (value: string) => {
    messages.push(value)
  }
  const stop = startRuntimeDiagnostics(100)
  try {
    assert.equal(startRuntimeDiagnostics(100), stop)
    await setTimeout(250)
    assert.ok(messages.length >= 1)
    for (const text of messages) {
      const row = JSON.parse(text)
      assert.equal(row.event, 'runtime-health')
      assert.ok(row.memory.heapUsed > 0)
      assert.ok(row.memory.heapLimit > row.memory.heapUsed)
      assert.ok(row.eventLoop.p99Ms >= 0)
      assert.deepEqual(row.pool, { total: 0, idle: 0, waiting: 0 })
      assert.ok(row.elapsedMs > 0)
    }
    stop()
    const count = messages.length
    await setTimeout(150)
    assert.equal(messages.length, count)
  } finally {
    stop()
    console.info = original
  }
})

test('invalid diagnostic intervals cannot create a busy timer', () => {
  for (const value of [0, -1, 99, NaN, Infinity])
    assert.throws(() => startRuntimeDiagnostics(value), /Invalid/)
})

test('an old stop handle cannot remove a newer diagnostic registration', () => {
  const oldStop = startRuntimeDiagnostics()
  oldStop()
  const newStop = startRuntimeDiagnostics()
  try {
    oldStop()
    assert.equal(startRuntimeDiagnostics(), newStop)
  } finally {
    newStop()
  }
})

test('interval overflow cannot turn diagnostics into a one-millisecond timer', () => {
  assert.throws(() => startRuntimeDiagnostics(2_147_483_648), /Invalid/)
})
