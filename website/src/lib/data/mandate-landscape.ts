import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { queryMany } from '@/lib/db/query'
import { mandateMembershipSql } from '@/lib/mandate-membership'
import {
  FOUNDATIONAL_PART_IN_DOCUMENT,
  LEGISLATIVE_PART_IN_DOCUMENT,
} from '@/lib/foundational'
import {
  LANDSCAPE_CITATIONS,
  type LandscapeGroup,
} from '@/lib/landscape-layout'
import { citationCategoryCtes } from './citation-category-sql'
import { recordedSeriesCtes } from './recorded-series-sql'

/** Use the shared full-history earlier-member rule, then aggregate joint
 * citation/body memberships. One fact per symbol prevents duplicate catalogue
 * rows or series memberships inflating flows.
 */
async function readLandscape(
  version: string | null
): Promise<LandscapeGroup[]> {
  const rows = await queryMany<{
    year: number | null
    earlier_version: boolean
    security_council: boolean
    citation: string
    documents: number
  }>(
    `WITH ${citationCategoryCtes}, ${recordedSeriesCtes}, facts AS (
       SELECT d.ppb_full_document_symbol,
              MAX(d.ppb_year) AS year,
              BOOL_OR(s.document_symbol IS NOT NULL) AS earlier_version,
              BOOL_OR(COALESCE(d.ppb_body = 'SC', FALSE)) AS security_council,
              COALESCE(c.primary_category, 'uncited') AS citation
       FROM public.unified_documents d
       LEFT JOIN classified_citations c USING (ppb_full_document_symbol)
       LEFT JOIN earlier_symbols s ON s.document_symbol = d.ppb_full_document_symbol
       WHERE ${mandateMembershipSql('d', '$1')}
       GROUP BY d.ppb_full_document_symbol, c.primary_category
     )
     SELECT year, earlier_version, security_council, citation, COUNT(*)::int AS documents
     FROM facts
     GROUP BY year, earlier_version, security_council, citation`,
    [version, FOUNDATIONAL_PART_IN_DOCUMENT, LEGISLATIVE_PART_IN_DOCUMENT]
  )
  return rows.map((row) => {
    const citation = LANDSCAPE_CITATIONS.find(
      (category) => category === row.citation
    )
    if (!citation)
      throw new Error('Unclassified citation source in mandate landscape')
    return {
      year: row.year === null ? null : Number(row.year),
      earlierVersion: row.earlier_version,
      securityCouncil: row.security_council,
      citation,
      count: Number(row.documents),
    }
  })
}

export const getMandateLandscape = cache((version?: string | null) =>
  unstable_cache(
    () => readLandscape(version ?? null),
    ['mandate-landscape-v3', version ?? 'default'],
    { revalidate: 3600 }
  )()
)
