import {
  getPublicReference,
  resolvePublicVersion,
} from '@/lib/data/public-documents'
import { API_VERSION, publicQuery } from '@/lib/public-api'
import { publicJson, publicError } from '@/lib/api-response'
export async function GET(request: Request) {
  try {
    const { filters } = publicQuery(new URL(request.url).searchParams)
    const version = await resolvePublicVersion(filters)
    return publicJson({
      apiVersion: API_VERSION,
      budgetVersion: version,
      ...(await getPublicReference(version.slug)),
    })
  } catch (error) {
    return publicError(error)
  }
}
