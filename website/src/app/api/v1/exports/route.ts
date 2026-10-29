import { documentExport } from '@/lib/data/document-export'
import { publicQuery, ApiInputError } from '@/lib/public-api'
import { publicError } from '@/lib/api-response'
export const runtime = 'nodejs'
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const { filters } = publicQuery(params)
    const format = params.get('format') ?? 'csv'
    const include = params.get('include')
    if (!['csv', 'xlsx', 'json'].includes(format))
      throw new ApiInputError('Unknown export format')
    if (include && (include !== 'details' || format !== 'json'))
      throw new ApiInputError('Details are available in JSON exports')
    return await documentExport(
      filters,
      format as 'csv' | 'xlsx' | 'json',
      include === 'details',
      request.signal
    )
  } catch (error) {
    return publicError(error)
  }
}
