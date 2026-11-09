import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRateLimiter } from '#lib/api-rate-limit'
import { createExportSlots } from '#lib/export-slots'
import { apiClient, UNKNOWN_CLIENT } from '#lib/api-client'
import { refusalLine, REFUSAL_EVENT } from '#lib/api-refusal-log'
import {
  RATE_LIMIT_PER_DAY,
  RATE_LIMIT_PER_MINUTE,
  EXPORT_CONCURRENCY_MAX,
} from '#lib/api-limits'

const limiter = () =>
  createRateLimiter({
    window: {
      ms: 60_000,
      limit: RATE_LIMIT_PER_MINUTE,
      rule: 'rate_per_minute',
    },
    day: { limit: RATE_LIMIT_PER_DAY, rule: 'rate_per_day' },
  })
const noon = Date.UTC(2026, 10, 9, 12, 0, 0)

test('the 21st request in a minute is refused until the window moves', () => {
  const rate = limiter()
  for (let i = 0; i < 20; i++)
    assert.deepEqual(rate.check('a', noon + i * 1000), { allowed: true })
  const refused = rate.check('a', noon + 20_000)
  assert.equal(refused.allowed, false)
  assert.ok(!refused.allowed && refused.rule === 'rate_per_minute')
  assert.ok(!refused.allowed && refused.retryAfterSeconds === 40)
  // A refused request is not counted: the first admission leaves the window
  // at noon + 60 s and one slot opens.
  assert.deepEqual(rate.check('a', noon + 60_000), { allowed: true })
  assert.equal(rate.check('a', noon + 60_500).allowed, false)
  // Other clients are counted separately.
  assert.deepEqual(rate.check('b', noon + 20_000), { allowed: true })
})

test('the 201st request in a UTC day is refused until midnight UTC', () => {
  const rate = limiter()
  for (let i = 0; i < RATE_LIMIT_PER_DAY; i++)
    assert.deepEqual(rate.check('a', noon + i * 61_000), { allowed: true })
  const late = noon + RATE_LIMIT_PER_DAY * 61_000
  const refused = rate.check('a', late)
  assert.ok(!refused.allowed && refused.rule === 'rate_per_day')
  const midnight = Date.UTC(2026, 10, 10)
  assert.ok(
    !refused.allowed &&
      refused.retryAfterSeconds === Math.ceil((midnight - late) / 1000)
  )
  assert.deepEqual(rate.check('a', midnight), { allowed: true })
})

test('drops counts from earlier UTC days', () => {
  const rate = limiter()
  for (let i = 0; i < 50; i++) rate.check(`client-${i}`, noon)
  assert.equal(rate.size(), 50)
  rate.check('next-day', Date.UTC(2026, 10, 10, 0, 5))
  assert.equal(rate.size(), 1)
})

test('a third concurrent export is refused; release frees a slot once', () => {
  const slots = createExportSlots(EXPORT_CONCURRENCY_MAX)
  const first = slots.tryAcquire()
  const second = slots.tryAcquire()
  assert.ok(first && second)
  assert.equal(slots.tryAcquire(), null)
  first()
  first()
  assert.equal(slots.active(), 1)
  const third = slots.tryAcquire()
  assert.ok(third)
  assert.equal(slots.tryAcquire(), null)
})

test('identifies the client from X-Forwarded-For', () => {
  assert.deepEqual(apiClient('198.51.100.7, 203.0.113.5:51234'), {
    kind: 'ipv4',
    bucket: '203.0.113.5',
    truncated: '203.0.113.0/24',
  })
  assert.deepEqual(apiClient('[2001:db8:abcd:12:1:2:3:4]:443'), {
    kind: 'ipv6',
    bucket: '2001:db8:abcd:12::/64',
    truncated: '2001:db8:abcd::/48',
  })
  assert.equal(
    apiClient('2001:db8:abcd:12::99').bucket,
    apiClient('2001:0DB8:abcd:0012:ffff::1').bucket
  )
  assert.equal(apiClient('::1').bucket, '0:0:0:0::/64')
  for (const header of [null, '', ' ', 'proxy, not-an-address'])
    assert.equal(apiClient(header).bucket, UNKNOWN_CLIENT)
})

test('writes each refusal as one JSON line with a truncated address', () => {
  const line = refusalLine(
    {
      route: '/api/v1/documents',
      rule: 'page_depth',
      status: 400,
      client: apiClient('203.0.113.5:51234'),
      values: { page: 5 },
    },
    new Date(noon)
  )
  assert.ok(!line.includes('\n'))
  assert.deepEqual(JSON.parse(line), {
    event: REFUSAL_EVENT,
    timestamp: '2026-11-09T12:00:00.000Z',
    status: 400,
    route: '/api/v1/documents',
    rule: 'page_depth',
    client: '203.0.113.0/24',
    values: { page: 5 },
  })
  assert.ok(!line.includes('203.0.113.5'))
})
