import {
  getPublicDocument,
  resolvePublicVersion,
} from '@/lib/data/public-documents'
import { API_VERSION, COVERAGE_NOTES, publicQuery } from '@/lib/public-api'
import { publicJson, publicError } from '@/lib/api-response'
export async function GET(
  request: Request,
  { params }: { params: Promise<{ segments: string[] }> }
) {
  try {
    const { segments } = await params
    const { filters } = publicQuery(new URL(request.url).searchParams)
    const version = await resolvePublicVersion(filters)
    const symbol = segments.join('/').replace(/\.json$/, '')
    const document = await getPublicDocument(symbol, version.slug)
    return document
      ? publicJson({
          apiVersion: API_VERSION,
          budgetVersion: version,
          coverage: COVERAGE_NOTES,
          document,
        })
      : publicJson({ error: 'Document not found' }, 404)
  } catch (error) {
    return publicError(error)
  }
}
