import { documentExport } from '@/lib/data/document-export'
import { budgetError, publicExportQuery } from '@/lib/public-api'
import { publicError, refusalResponse } from '@/lib/api-response'
import { createExportSlots } from '@/lib/export-slots'
import { apiClient } from '@/lib/api-client'
import { apiDailyBudget } from '@/lib/api-row-budget'
import {
  EXPORT_BUSY_RETRY_SECONDS,
  EXPORT_CONCURRENCY_MAX,
} from '@/lib/api-limits'
export const runtime = 'nodejs'

const slots = createExportSlots(EXPORT_CONCURRENCY_MAX)

// Refusals of browser navigations are returned as a page.
const NAVIGATION = { html: 'when-navigating' } as const

export async function GET(request: Request) {
  try {
    const { filters, format } = publicExportQuery(
      new URL(request.url).searchParams
    )
    const client = apiClient(request.headers.get('x-forwarded-for')).bucket
    const budget = apiDailyBudget()
    const allowance = budget.exportAllowed(client, Date.now())
    if (!allowance.allowed)
      throw budgetError(allowance, { kind: 'export', rows: 0 })
    const release = slots.tryAcquire()
    if (!release)
      return refusalResponse(
        request,
        {
          status: 429,
          rule: 'export_concurrency',
          message: 'Other downloads are in progress. Please try again shortly.',
          values: { active: slots.active(), max: EXPORT_CONCURRENCY_MAX },
          retryAfterSeconds: EXPORT_BUSY_RETRY_SECONDS,
        },
        NAVIGATION
      )
    return await documentExport(filters, format, request.signal, release, {
      charge(total) {
        const charged = budget.chargeExport(client, total, Date.now())
        if (!charged.allowed)
          throw budgetError(charged, { kind: 'export', rows: total })
      },
    })
  } catch (error) {
    return publicError(error, request, NAVIGATION)
  }
}
