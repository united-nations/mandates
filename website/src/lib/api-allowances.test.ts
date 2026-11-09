import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDailyBudget } from '#lib/api-row-budget'
import { createRateLimiter } from '#lib/api-rate-limit'
import { limitedRequestKind } from '#lib/limited-request'
import { budgetError, ApiLimitError } from '#lib/public-api'
import {
  DOCUMENT_PAGES_PER_DAY,
  DOCUMENT_PAGES_PER_HOUR,
  EXPORTS_PER_DAY,
  EXPORT_ROW_CAP,
  RATE_LIMIT_PER_DAY,
  RATE_LIMIT_PER_MINUTE,
  ROW_BUDGET_PER_DAY,
} from '#lib/api-limits'

const noon = Date.UTC(2026, 10, 9, 12, 0, 0)
const midnight = Date.UTC(2026, 10, 10)
const ROWS = ROW_BUDGET_PER_DAY
const budget = () =>
  createDailyBudget({ rows: ROW_BUDGET_PER_DAY, exports: EXPORTS_PER_DAY })

test('limits match the published figures', () => {
  assert.equal(RATE_LIMIT_PER_MINUTE, 20)
  assert.equal(RATE_LIMIT_PER_DAY, 200)
  assert.equal(ROW_BUDGET_PER_DAY, 5000)
  assert.equal(EXPORTS_PER_DAY, 30)
  assert.equal(DOCUMENT_PAGES_PER_HOUR, 1000)
  assert.equal(DOCUMENT_PAGES_PER_DAY, 5000)
})

test('rows are counted as delivered until the daily budget is used', () => {
  const rows = budget()
  // Full search pages of 25 use the whole budget.
  for (let i = 0; i < ROWS / 25; i++) {
    const page = rows.reserveRows('a', 25, noon)
    assert.ok(page.allowed)
    page.settle(25)
  }
  const refused = rows.reserveRows('a', 1, noon)
  assert.ok(!refused.allowed)
  assert.equal(refused.rule, 'row_budget')
  assert.equal(refused.remaining, 0)
  assert.equal(refused.retryAfterSeconds, (midnight - noon) / 1000)
  const error = budgetError(refused, { kind: 'search', rows: 1 })
  assert.ok(error instanceof ApiLimitError)
  assert.equal(error.status, 429)
  assert.equal(error.retryAfterSeconds, (midnight - noon) / 1000)
  assert.match(error.message, /Daily row limit reached/)
  assert.ok(!error.message.includes('5,000'))
  // Another client and the next UTC day are unaffected.
  assert.ok(rows.reserveRows('b', 25, noon).allowed)
  assert.ok(rows.reserveRows('a', 25, midnight).allowed)
})

test('a short page is charged what it delivered; a failure costs nothing', () => {
  const rows = budget()
  const page = rows.reserveRows('a', 25, noon)
  assert.ok(page.allowed)
  page.settle(3)
  page.settle(0)
  const failed = rows.reserveRows('a', 25, noon)
  assert.ok(failed.allowed)
  failed.settle(0)
  // 3 rows used, so one more than the rest is refused and the rest fits.
  const over = rows.reserveRows('a', ROWS - 2, noon)
  assert.ok(!over.allowed && over.remaining === ROWS - 3)
  assert.ok(rows.reserveRows('a', ROWS - 3, noon).allowed)
})

test('reserved rows count against the budget until settled', () => {
  const rows = budget()
  const first = rows.reserveRows('a', ROWS - 10, noon)
  assert.ok(first.allowed)
  const second = rows.reserveRows('a', 25, noon)
  assert.ok(!second.allowed && second.remaining === 10)
})

test('an export larger than the remaining budget is refused whole, stating what remains', () => {
  const rows = budget()
  const used = rows.reserveRows('a', ROWS - 500, noon)
  assert.ok(used.allowed)
  used.settle(ROWS - 500)
  const refused = rows.chargeExport('a', 800, noon)
  assert.ok(!refused.allowed)
  assert.equal(refused.rule, 'row_budget')
  assert.equal(refused.remaining, 500)
  const error = budgetError(refused, { kind: 'export', rows: 800 })
  assert.equal(error.status, 429)
  assert.match(error.message, /800 documents/)
  assert.match(error.message, /500 rows remain today/)
  assert.ok(!error.message.includes('5,000'))
  assert.deepEqual(error.values, { remaining: 500, requested: 800 })
  // Nothing was charged for the refused export.
  assert.ok(rows.chargeExport('a', 500, noon).allowed)
})

test('the 31st export in a UTC day is refused', () => {
  const rows = budget()
  for (let i = 0; i < EXPORTS_PER_DAY; i++)
    assert.ok(rows.chargeExport('a', 1, noon).allowed)
  assert.ok(rows.exportAllowed('a', noon).allowed === false)
  const refused = rows.chargeExport('a', 1, noon)
  assert.ok(!refused.allowed && refused.rule === 'export_allowance')
  const error = budgetError(refused, { kind: 'export', rows: 1 })
  assert.equal(error.status, 429)
  assert.match(error.message, /Daily download limit reached/)
  assert.ok(!error.message.includes('30'))
  assert.ok(rows.chargeExport('a', 1, midnight).allowed)
})

test('five full exports use the whole row budget', () => {
  const rows = budget()
  for (let i = 0; i < ROWS / EXPORT_ROW_CAP; i++)
    assert.ok(rows.chargeExport('a', EXPORT_ROW_CAP, noon).allowed)
  assert.equal(rows.chargeExport('a', 1, noon).allowed, false)
})

test('the budget forgets earlier days', () => {
  const rows = budget()
  for (let i = 0; i < 30; i++) rows.reserveRows(`client-${i}`, 1, noon)
  assert.equal(rows.size(), 30)
  rows.reserveRows('next', 1, midnight)
  assert.equal(rows.size(), 1)
})

test('the 1,001st document page in an hour is refused, and 5,001st in a day', () => {
  const pages = createRateLimiter({
    window: {
      ms: 3_600_000,
      limit: DOCUMENT_PAGES_PER_HOUR,
      rule: 'page_per_hour',
    },
    day: { limit: DOCUMENT_PAGES_PER_DAY, rule: 'page_per_day' },
  })
  for (let i = 0; i < 1000; i++) assert.ok(pages.check('a', noon + i).allowed)
  const hourly = pages.check('a', noon + 1000)
  assert.ok(!hourly.allowed && hourly.rule === 'page_per_hour')
  // The oldest admission (at noon) leaves the window an hour later.
  assert.equal(hourly.retryAfterSeconds, 3599)
  // Four more full hours reach the daily figure; the next page is refused
  // until midnight UTC.
  for (let hour = 1; hour <= 4; hour++)
    for (let i = 0; i < 1000; i++)
      assert.ok(pages.check('a', noon + hour * 3_600_000 + i).allowed)
  const daily = pages.check('a', noon + 5 * 3_600_000)
  assert.ok(!daily.allowed && daily.rule === 'page_per_day')
})

test('classifies API, document page and prefetch requests', () => {
  const headers = (entries: Record<string, string>) => ({
    get: (name: string) => entries[name] ?? null,
  })
  const page = '/mandate/A/RES/79/1'
  assert.equal(limitedRequestKind(page, headers({})), 'document_page')
  assert.equal(limitedRequestKind(page, headers({ rsc: '1' })), 'document_page')
  assert.equal(
    limitedRequestKind(
      page,
      headers({ rsc: '1', 'next-router-prefetch': '1' })
    ),
    'prefetch'
  )
  assert.equal(
    limitedRequestKind(page, headers({ 'next-router-prefetch': '1' })),
    'document_page'
  )
  assert.equal(
    limitedRequestKind(
      page,
      headers({ rsc: '1', 'next-router-prefetch': '2' })
    ),
    'document_page'
  )
  assert.equal(limitedRequestKind(`${page}.json`, headers({})), 'api')
  assert.equal(limitedRequestKind('/api/v1/documents', headers({})), 'api')
})
