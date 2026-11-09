import {
  getPublicDocument,
  resolvePublicVersion,
} from '@/lib/data/public-documents'
import {
  API_VERSION,
  COVERAGE_NOTES,
  budgetError,
  publicQuery,
} from '@/lib/public-api'
import { publicJson, publicError } from '@/lib/api-response'
import { apiClient } from '@/lib/api-client'
import { apiDailyBudget } from '@/lib/api-row-budget'
export async function GET(
  request: Request,
  { params }: { params: Promise<{ segments: string[] }> }
) {
  try {
    const { segments } = await params
    const { filters } = publicQuery(new URL(request.url).searchParams)
    const reservation = apiDailyBudget().reserveRows(
      apiClient(request.headers.get('x-forwarded-for')).bucket,
      1,
      Date.now()
    )
    if (!reservation.allowed)
      throw budgetError(reservation, { kind: 'document', rows: 1 })
    try {
      const version = await resolvePublicVersion(filters)
      const symbol = segments.join('/').replace(/\.json$/, '')
      const document = await getPublicDocument(symbol, version.slug)
      if (!document) return publicJson({ error: 'Document not found' }, 404)
      reservation.settle(1)
      return publicJson({
        apiVersion: API_VERSION,
        budgetVersion: version,
        coverage: COVERAGE_NOTES,
        document,
      })
    } finally {
      reservation.settle(0)
    }
  } catch (error) {
    return publicError(error, request)
  }
}
