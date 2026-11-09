import { getPublicPage } from '@/lib/data/public-documents'
import { budgetError, publicPageQuery } from '@/lib/public-api'
import { publicJson, publicError } from '@/lib/api-response'
import { apiClient } from '@/lib/api-client'
import { apiDailyBudget } from '@/lib/api-row-budget'
export async function GET(request: Request) {
  try {
    const { filters, page, limit } = publicPageQuery(
      new URL(request.url).searchParams
    )
    const reservation = apiDailyBudget().reserveRows(
      apiClient(request.headers.get('x-forwarded-for')).bucket,
      limit,
      Date.now()
    )
    if (!reservation.allowed)
      throw budgetError(reservation, { kind: 'search', rows: limit })
    try {
      const result = await getPublicPage(filters, page, limit)
      reservation.settle(result.items.length)
      return publicJson(result)
    } finally {
      reservation.settle(0)
    }
  } catch (error) {
    return publicError(error, request)
  }
}
