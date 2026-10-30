/**
 * The data for the "reports submitted under this mandate" block, from the
 * source MANDATED_SG_REPORTS_SOURCE names. The only reader of that flag:
 * pages call this and render MandatedSgReportsBlock, which follows the
 * `source` tag on the result rather than reading the flag again.
 */

import { unstable_cache } from 'next/cache'
import { MANDATED_SG_REPORTS_SOURCE } from '../feature-flags'
import { queryMany } from '../db/query'
import { unionSgReports, type UnionSgReports } from '../sg-report-union'
import {
  getCatalogueReportsMany,
  getCatalogueLinkedReportIds,
  type MandatedSgReport,
} from './sg-report-links'
import {
  getPageOneReportsMany,
  getPageOneLinkedReportIds,
  type PageOneSgReports,
} from './sg-report-page-one-links'

/**
 * Unique SG reports linked directly to registry mandate pages, using the same
 * source selection and display rules as the detail blocks. One report counts
 * once across citations, document symbols and the two evidence sources.
 * This is the linked inventory, not a count of all SG reports in the catalogue.
 */
export const getMandatedSgReportCount = unstable_cache(
  async (): Promise<number> => {
    const source = MANDATED_SG_REPORTS_SOURCE
    const [catalogue, pageOne] = await Promise.all([
      source === 'page_one' ? [] : getCatalogueLinkedReportIds(),
      source === 'catalogue_notes' ? [] : getPageOneLinkedReportIds(),
    ])
    return new Set([...catalogue, ...pageOne]).size
  },
  ['sg-reports.registry-linked-count-v1', MANDATED_SG_REPORTS_SOURCE],
  { revalidate: 3600 }
)

export async function getScopedMandatedSgReportCount(symbols: string[]) {
  const source = MANDATED_SG_REPORTS_SOURCE
  const [catalogue, pageOne] = await Promise.all([
    source === 'page_one' ? [] : getCatalogueLinkedReportIds(symbols),
    source === 'catalogue_notes' ? [] : getPageOneLinkedReportIds(symbols),
  ])
  return new Set([...catalogue, ...pageOne]).size
}

export type MandatedSgReports =
  | { source: 'catalogue_notes'; reports: MandatedSgReport[] }
  | { source: 'page_one'; data: PageOneSgReports }
  | { source: 'union'; data: UnionSgReports }

export async function getMandatedSgReportsMany(symbols: string[]): Promise<Map<string, MandatedSgReports>> {
  const family = await queryMany<{ page_symbol: string; symbol: string; canonical: string | null }>(
    `WITH requested AS MATERIALIZED (
       SELECT page_symbol, upper(regexp_replace(page_symbol, '[[:space:]]', '', 'g')) AS canonical
       FROM unnest($1::text[]) input(page_symbol)
     ), matched_series AS (
       -- Keep raw-symbol and catalogue-identity lookup as separate equijoins.
       -- An OR with a correlated recid subquery scans the catalogue repeatedly
       -- for each series row and makes a 100-document export hit the DB timeout.
       SELECT requested.page_symbol, rs.series_key, rs.un_body, rs.doc_type, rs.is_collection
       FROM requested
       JOIN digitallibrary.resolution_series rs ON rs.document_symbol = requested.page_symbol
       JOIN digitallibrary.documents d ON d.recid = rs.recid
       UNION
       SELECT requested.page_symbol, rs.series_key, rs.un_body, rs.doc_type, rs.is_collection
       FROM requested
       JOIN digitallibrary.documents d ON d.symbol_normalized = requested.canonical
       JOIN digitallibrary.resolution_series rs ON rs.recid = d.recid
     ), me AS (
       SELECT DISTINCT page_symbol, series_key, un_body, doc_type, is_collection
       FROM matched_series
     ), unique_me AS (
       SELECT * FROM me WHERE page_symbol IN (SELECT page_symbol FROM me GROUP BY page_symbol HAVING count(*) = 1)
     )
     SELECT DISTINCT ON (me.page_symbol, COALESCE(d.symbol_normalized, rs.document_symbol))
       me.page_symbol,
       CASE WHEN d.symbol_normalized = upper(regexp_replace(me.page_symbol, '[[:space:]]', '', 'g'))
         THEN me.page_symbol ELSE rs.document_symbol END AS symbol,
       d.symbol_normalized AS canonical
     FROM unique_me me
     JOIN digitallibrary.resolution_series rs ON rs.series_key = me.series_key
       AND rs.un_body = me.un_body AND rs.doc_type = me.doc_type
     JOIN digitallibrary.documents d ON d.recid = rs.recid
     WHERE NOT me.is_collection OR d.symbol_normalized = upper(regexp_replace(me.page_symbol, '[[:space:]]', '', 'g'))
     ORDER BY me.page_symbol, COALESCE(d.symbol_normalized, rs.document_symbol), rs.document_symbol`, [symbols])
  const targets = [...family, ...symbols.filter(symbol => !family.some(target => target.page_symbol === symbol && target.symbol === symbol))
    .map(symbol => ({ page_symbol: symbol, symbol, canonical: null }))]
  const catalogue = MANDATED_SG_REPORTS_SOURCE !== 'page_one' ? await getCatalogueReportsMany(targets) : new Map<string, MandatedSgReport[]>()
  const pageOne = MANDATED_SG_REPORTS_SOURCE !== 'catalogue_notes' ? await getPageOneReportsMany(targets) : new Map<string, PageOneSgReports>()
  return new Map<string, MandatedSgReports>(symbols.map((symbol): [string, MandatedSgReports] => {
    const reports = catalogue.get(symbol) ?? []
    const data = pageOne.get(symbol) ?? { acceptedRunId: null }
    switch (MANDATED_SG_REPORTS_SOURCE) {
      case 'catalogue_notes': return [symbol, { source: 'catalogue_notes', reports }]
      case 'page_one': return [symbol, { source: 'page_one', data }]
      case 'union': return [symbol, { source: 'union', data: unionSgReports(data, reports) }]
    }
  }))
}
export async function getMandatedSgReports(symbol: string): Promise<MandatedSgReports> {
  return (await getMandatedSgReportsMany([symbol])).get(symbol)!
}
