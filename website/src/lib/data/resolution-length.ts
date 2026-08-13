/**
 * "How long is a resolution?" — the one idea from the pre-monorepo exploration
 * branches (`origin/feature/all-docs`) that never got a successor. See
 * docs/UNFCK-PLAN.md §7.
 *
 * Source: `digitallibrary.document_paragraphs`, one row per parsed paragraph,
 * joined to `digitallibrary.documents` on `symbol_normalized` for the adopting
 * organ and the publication date — the same pair the language-of-command
 * queries use.
 *
 * TWO DELIBERATE CHOICES, both of which change what the chart says:
 *
 *  1. **The median, not the mean.** A handful of omnibus resolutions run to
 *     hundreds of paragraphs and drag a mean far above anything typical. The
 *     median answers the question a reader actually has — how long is a normal
 *     resolution — so the upper quartile is returned alongside it to show the
 *     spread that the median hides.
 *
 *  2. **Years under ten parsed documents are dropped.** A median over three
 *     documents swings wildly and would read as a real trend. The cut is
 *     applied in SQL, so a thin year is absent rather than misleading.
 *
 * CAVEAT the UI must carry: this measures the PARSED corpus, not every
 * resolution ever adopted. Coverage is better in recent decades, so a change in
 * the early years can be a change in what was parsed rather than in what was
 * written.
 */

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { queryMany } from '../db/query'

/** The three principal organs with parsed-corpus coverage. */
export type LengthBody =
  | 'General Assembly'
  | 'Security Council'
  | 'Economic and Social Council'

export interface ResolutionLengthPoint {
  body: LengthBody
  year: number
  /** Parsed documents behind this point — the denominator, never hidden. */
  documents: number
  /** Median paragraphs per document. */
  medianParagraphs: number
  /** 75th percentile, so the chart can show the spread the median hides. */
  p75Paragraphs: number
}

interface Row {
  body: LengthBody
  year: number
  documents: number
  median_paragraphs: string
  p75_paragraphs: string
}

/** Years with fewer parsed documents than this are dropped, not plotted. */
const MIN_DOCUMENTS_PER_YEAR = 10

async function _getResolutionLengthInner(): Promise<ResolutionLengthPoint[]> {
  const rows = await queryMany<Row>(
    `WITH per_doc AS (
       SELECT d.symbol_normalized,
              d.un_body                                  AS body,
              extract(year FROM d.date_publication)::int AS year,
              count(*)::int                              AS paragraphs
       FROM digitallibrary.document_paragraphs p
       JOIN digitallibrary.documents d USING (symbol_normalized)
       WHERE d.un_body IN ('General Assembly', 'Security Council',
                           'Economic and Social Council')
         AND d.date_publication IS NOT NULL
       GROUP BY 1, 2, 3
     )
     SELECT body,
            year,
            count(*)::int                                           AS documents,
            percentile_cont(0.5)  WITHIN GROUP (ORDER BY paragraphs) AS median_paragraphs,
            percentile_cont(0.75) WITHIN GROUP (ORDER BY paragraphs) AS p75_paragraphs
     FROM per_doc
     GROUP BY 1, 2
     HAVING count(*) >= ${MIN_DOCUMENTS_PER_YEAR}
     ORDER BY 1, 2`
  )

  return rows.map((r) => ({
    body: r.body,
    year: r.year,
    documents: r.documents,
    medianParagraphs: Number(r.median_paragraphs),
    p75Paragraphs: Number(r.p75_paragraphs),
  }))
}

/** Cached wrapper — version-independent, hourly like the other trend fetches. */
export const getResolutionLength = cache(
  (): Promise<ResolutionLengthPoint[]> =>
    unstable_cache(_getResolutionLengthInner, ['resolution-length-v1'], {
      revalidate: 3600,
    })()
)
