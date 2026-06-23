import 'server-only'

import { unstable_cache } from 'next/cache'
import { diff } from 'undifferent/core'
import type { DiffResult } from 'undifferent/core'
import {
  fetchDocumentMetadata,
  fetchUNDocument,
} from 'undifferent/un-fetcher'
import type { UNDocumentMetadata } from 'undifferent/un-fetcher'

const cachedFetchDocument = unstable_cache(
  (symbol: string) => fetchUNDocument(symbol),
  ['un-doc'],
  { revalidate: false }
)

const cachedFetchMetadata = unstable_cache(
  (symbol: string) => fetchDocumentMetadata(symbol),
  ['un-meta'],
  { revalidate: 86400 }
)

export interface DiffResponse extends DiffResult {
  formats: { left: 'doc' | 'pdf'; right: 'doc' | 'pdf' }
  metadata: { left: UNDocumentMetadata; right: UNDocumentMetadata }
}

export async function diffUNDocuments(
  symbolA: string,
  symbolB: string
): Promise<DiffResponse> {
  const [docA, docB, metaA, metaB] = await Promise.all([
    cachedFetchDocument(symbolA),
    cachedFetchDocument(symbolB),
    cachedFetchMetadata(symbolA),
    cachedFetchMetadata(symbolB),
  ])
  const result = diff(docA.lines, docB.lines)
  return {
    score: result.score,
    items: result.items,
    formats: { left: docA.format, right: docB.format },
    metadata: { left: metaA, right: metaB },
  }
}
