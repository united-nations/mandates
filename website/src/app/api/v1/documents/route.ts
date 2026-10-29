import { getPublicPage } from '@/lib/data/public-documents'
import { ApiInputError, publicQuery } from '@/lib/public-api'
import { publicJson, publicError } from '@/lib/api-response'
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const { filters, page, limit } = publicQuery(params)
    const include = params.get('include')
    if (include && include !== 'details')
      throw new ApiInputError('Unknown include value')
    return publicJson(
      await getPublicPage(filters, page, limit, include === 'details')
    )
  } catch (error) {
    return publicError(error)
  }
}
