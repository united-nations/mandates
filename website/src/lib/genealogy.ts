/**
 * Boilerplate Genealogy dataset access.
 *
 * The data is precomputed offline by `scripts/genealogy/build_genealogy.py`
 * (committed) into `src/data/genealogy.json`. It traces how resolution text
 * mutates across renewal chains: which paragraphs are copy-pasted verbatim for
 * decades, which mutate, which appear and disappear. See
 * `docs/lens-genealogy/ANALYSIS.md` for the alignment method, thresholds and
 * hand-check precision.
 */
import raw from '@/data/genealogy.json'

export interface GenealogyMeta {
  nChainsAnalyzed: number
  nChainsFeatured: number
  nDocs: number
  nParas: number
  thresholds: { verbatim: number; match: number; lenBucket: number }
  cap: number
}

export interface HeadlineByAge {
  age: number
  nChains: number
  verbatimPct: number
  mutatedPct: number
  newPct: number
}

export interface HeadlineByDecade {
  decade: number
  nRenewals: number
  verbatimPct: number
  mutatedPct: number
  newPct: number
}

export interface ChainSummary {
  id: string
  title: string
  body: string
  docType: string
  firstYear: number
  lastYear: number
  nDocs: number
  avgVerbatimPct: number | null
}

export interface OldestSentence {
  text: string
  bornYear: number
  lastYear: number
  spanYears: number
  nDocs: number
  verbatimRun: number
  chainId: string
  chainTitle: string
  body: string
}

/** One DNA column = one paragraph lineage tracked through the chain. */
export interface ChainColumn {
  born: number
  last: number
  nDocs: number
  snippet: string
}

/** Per-document row: map of columnIndex -> status code ("v"|"m"|"n", + "e"
 *  suffix when this is the lineage's last appearance). */
export interface ChainDoc {
  symbol: string
  year: number
  row: Record<string, string>
  singles: number
  n: number
}

export interface ChainDocPct {
  year: number
  v: number
  m: number
  new: number
  n: number
  vpct: number
  mpct: number
  newpct: number
  carriedpct: number
}

export interface ChainDetail {
  title: string
  body: string
  docType: string
  columns: ChainColumn[]
  docs: ChainDoc[]
  perDoc: (ChainDocPct | null)[]
  minPresent: number
}

interface GenealogyData {
  meta: GenealogyMeta
  headlineByAge: HeadlineByAge[]
  headlineByDecade: HeadlineByDecade[]
  chains: ChainSummary[]
  featured: string[]
  oldestSentences: OldestSentence[]
  detail: Record<string, ChainDetail>
}

const data = raw as unknown as GenealogyData

export const genealogyMeta = data.meta
export const headlineByAge = data.headlineByAge
export const headlineByDecade = data.headlineByDecade
export const oldestSentences = data.oldestSentences

/** Featured chains, in the order the picker should list them. */
export function getFeaturedChains(): ChainSummary[] {
  const byId = new Map(data.chains.map((c) => [c.id, c]))
  const out: ChainSummary[] = []
  for (const id of data.featured) {
    const c = byId.get(id)
    if (c) out.push(c)
  }
  return out
}

export function getChainDetail(id: string): ChainDetail | null {
  return data.detail[id] ?? null
}

/** The default chain the DNA view opens on (UNIFIL renewal if present). */
export function defaultChainId(): string {
  return data.featured[0] ?? data.chains[0]?.id ?? ''
}
