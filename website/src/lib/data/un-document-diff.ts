import 'server-only'

import { diff } from 'undifferent/core'
import type { DiffResult } from 'undifferent/core'
import {
  fetchDocumentMetadata,
  fetchUNDocument,
} from 'undifferent/un-fetcher'
import type {
  UNDocument,
  UNDocumentMetadata,
} from 'undifferent/un-fetcher'

const DOC_TTL_MS = 60 * 60 * 1000
const MAX_ENTRIES = 200

type CacheEntry<T> = { value: T; expiresAt: number }

function createLRU<T>(maxEntries: number, ttlMs: number) {
  const store = new Map<string, CacheEntry<T>>()
  return {
    get(key: string): T | undefined {
      const hit = store.get(key)
      if (!hit) return undefined
      if (hit.expiresAt < performance.now()) {
        store.delete(key)
        return undefined
      }
      store.delete(key)
      store.set(key, hit)
      return hit.value
    },
    set(key: string, value: T) {
      if (store.size >= maxEntries) {
        const oldest = store.keys().next().value
        if (oldest !== undefined) store.delete(oldest)
      }
      store.set(key, { value, expiresAt: performance.now() + ttlMs })
    },
  }
}

const docCache = createLRU<UNDocument>(MAX_ENTRIES, DOC_TTL_MS)
const metaCache = createLRU<UNDocumentMetadata>(MAX_ENTRIES, DOC_TTL_MS)

async function getDocument(symbol: string): Promise<UNDocument> {
  const cached = docCache.get(symbol)
  if (cached) return cached
  const doc = await fetchUNDocument(symbol)
  docCache.set(symbol, doc)
  return doc
}

async function getMetadata(symbol: string): Promise<UNDocumentMetadata> {
  const cached = metaCache.get(symbol)
  if (cached) return cached
  const meta = await fetchDocumentMetadata(symbol)
  metaCache.set(symbol, meta)
  return meta
}

export interface DiffResponse extends DiffResult {
  formats: { left: 'doc' | 'pdf'; right: 'doc' | 'pdf' }
  metadata: { left: UNDocumentMetadata; right: UNDocumentMetadata }
}

export async function diffUNDocuments(
  symbolA: string,
  symbolB: string
): Promise<DiffResponse> {
  const [docA, docB, metaA, metaB] = await Promise.all([
    getDocument(symbolA),
    getDocument(symbolB),
    getMetadata(symbolA),
    getMetadata(symbolB),
  ])
  const result = diff(docA.lines, docB.lines)
  return {
    score: result.score,
    items: result.items,
    formats: { left: docA.format, right: docB.format },
    metadata: { left: metaA, right: metaB },
  }
}
