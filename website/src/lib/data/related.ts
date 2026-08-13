/**
 * Topically related mandate documents — the "Related mandate documents" block
 * on a mandate detail view.
 *
 * WHY NOT COUNT SHARED SUBJECTS
 * -----------------------------
 * Raw overlap is useless here. "International Cooperation" sits on ~6,000
 * documents and "Report Preparation" on thousands more, so a count-ranked list
 * makes every document related to every other and puts the same handful of
 * omnibus resolutions at the top of every page. Each shared subject is
 * therefore weighted by its rarity, IDF-style:
 *
 *     score(doc) = Σ over shared subjects s of  ln( N / df(s) )
 *
 * where df(s) is the number of documents carrying s and N the number of
 * documents carrying any subject. A subject on 30 documents is worth ~7 points;
 * one on 6,000 is worth ~1.9. The list is ordered by that sum, and the shared
 * subjects are returned rarest-first so the UI can show *why* a document is
 * related.
 *
 * PERFORMANCE
 * -----------
 * `unified_documents.subjects` has no GIN index, so the `&&` candidate lookup
 * is a sequential scan (~200 ms floor on 43.9k rows). Two things keep it
 * bounded:
 *   1. document frequencies for the whole corpus are one cached query (3,965
 *      distinct subjects, ~270 ms, revalidated hourly), so the per-document
 *      query never has to aggregate the corpus;
 *   2. only the RAREST `MAX_SUBJECTS` subjects of the document are matched.
 *      Without the cap a subject-rich document (the worst case carries 106
 *      headings) took 4.7 s; with it the same document takes ~470 ms and the
 *      top of its list is unchanged, because the dropped subjects are the
 *      low-weight generic ones.
 * Measured: ~250 ms typical, ~470 ms worst case, then cached per symbol for an
 * hour. Adding `CREATE INDEX ... USING GIN (subjects)` on the matview would
 * remove the sequential scan and take this well under 50 ms.
 */

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { queryMany, queryOne } from '../db/query'
import { titleCase } from 'title-case'

/** How many of the document's own subjects (rarest first) are matched on. */
const MAX_SUBJECTS = 40
/**
 * Candidates scored before the series filter is applied. Generous on purpose:
 * for a recurring resolution most high-scoring neighbours are older members of
 * *other* series and get filtered out — on A/HRC/RES/54/32, 154 of the top 200
 * are non-latest and 17 more are its own series — so a tight pool would starve
 * the list. Costs ~30 ms over a pool of 200.
 */
const CANDIDATE_POOL = 500
/** Rows handed to the UI. */
const RESULT_LIMIT = 15

export interface RelatedMandate {
  document_symbol: string
  title: string | null
  year: number | null
  /** Summed IDF of the shared subjects; comparable only within one list. */
  score: number
  /** Shared subjects, rarest first, title-cased for display (capped at 4). */
  shared_subjects: string[]
  /** How many subjects the two documents share in total. */
  shared_count: number
}

interface SubjectFrequency {
  subject: string
  df: number
}

interface SubjectFrequencies {
  /** Documents carrying at least one subject — the IDF denominator. */
  total: number
  rows: SubjectFrequency[]
}

/**
 * Document frequency of every subject heading in the corpus. One aggregate over
 * the whole matview, cached for an hour: 3,965 distinct headings, ~100 KB, so
 * it is cheap to hold and lets the per-document query skip corpus aggregation
 * entirely.
 */
const getSubjectFrequencies = unstable_cache(
  async (): Promise<SubjectFrequencies> => {
    const [rows, totalRow] = await Promise.all([
      queryMany<{ subject: string; df: string }>(
        `SELECT s AS subject, COUNT(*)::text AS df
         FROM public.unified_documents d
         CROSS JOIN LATERAL UNNEST(d.subjects) s
         GROUP BY s`,
        []
      ),
      queryOne<{ n: string }>(
        `SELECT COUNT(*)::text AS n
         FROM public.unified_documents
         WHERE subjects IS NOT NULL AND cardinality(subjects) > 0`,
        []
      ),
    ])
    return {
      total: Math.max(1, parseInt(totalRow?.n ?? '1', 10)),
      rows: rows.map((r) => ({ subject: r.subject, df: parseInt(r.df, 10) })),
    }
  },
  ['subject-document-frequencies-v1'],
  { revalidate: 3600 }
)

interface RelatedRow {
  document_symbol: string
  title: string | null
  year: number | null
  score: string
  shared: string[]
  shared_count: number
}

/**
 * Documents sharing subjects with `symbol`, best first.
 *
 * Excluded: the document itself; every other member of its own resolution
 * series (those are already listed under Version history); and any document
 * that is a non-latest member of some series, so the list points at the version
 * a reader should actually open.
 */
async function fetchRelatedMandates(
  symbol: string,
  frequencies: SubjectFrequencies
): Promise<RelatedMandate[]> {
  const mine = await queryOne<{ subjects: string[] | null }>(
    `SELECT subjects FROM public.unified_documents
     WHERE ppb_full_document_symbol = $1`,
    [symbol]
  )
  const own = mine?.subjects ?? []
  if (own.length === 0) return []

  // Weight every subject this document carries, then keep the rarest ones —
  // see the performance note at the top of this file.
  const df = new Map(frequencies.rows.map((r) => [r.subject, r.df]))
  const weighted = own
    .map((subject) => ({
      subject,
      weight: Math.log(frequencies.total / Math.max(1, df.get(subject) ?? 1)),
    }))
    .filter((s) => s.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_SUBJECTS)

  if (weighted.length === 0) return []

  const rows = await queryMany<RelatedRow>(
    `WITH me AS (
       SELECT $2::text[] AS subj, $3::float8[] AS w
     ),
     hits AS (
       SELECT d.ppb_full_document_symbol AS sym, u.subj, u.w
       FROM public.unified_documents d
       JOIN me ON d.subjects && me.subj
       CROSS JOIN LATERAL UNNEST(me.subj, me.w) AS u(subj, w)
       WHERE u.subj = ANY (d.subjects)
     ),
     scored AS (
       SELECT sym,
              SUM(w) AS score,
              (ARRAY_AGG(subj ORDER BY w DESC, subj))[1:4] AS shared,
              COUNT(*)::int AS shared_count
       FROM hits
       WHERE sym <> $1
       GROUP BY sym
       ORDER BY SUM(w) DESC
       LIMIT ${CANDIDATE_POOL}
     ),
     my_series AS (
       SELECT series_key, un_body, doc_type
       FROM digitallibrary.resolution_series
       WHERE document_symbol = $1
       LIMIT 1
     )
     SELECT s.sym AS document_symbol,
            COALESCE(d.display_title, d.ppb_description) AS title,
            d.ppb_year AS year,
            s.score::text AS score,
            s.shared,
            s.shared_count
     FROM scored s
     JOIN public.unified_documents d
       ON d.ppb_full_document_symbol = s.sym
     LEFT JOIN digitallibrary.resolution_series rs
       ON rs.document_symbol = s.sym
     WHERE (rs.document_symbol IS NULL OR rs.is_latest)
       AND NOT EXISTS (
         SELECT 1 FROM my_series ms
         WHERE rs.series_key = ms.series_key
           AND rs.un_body = ms.un_body
           AND rs.doc_type = ms.doc_type
       )
     ORDER BY s.score DESC, d.ppb_year DESC NULLS LAST, s.sym
     LIMIT ${RESULT_LIMIT}`,
    [symbol, weighted.map((s) => s.subject), weighted.map((s) => s.weight)]
  )

  return rows.map((r) => ({
    document_symbol: r.document_symbol,
    title: r.title,
    year: r.year ?? null,
    score: Number(r.score),
    shared_subjects: (r.shared ?? []).map((s) => titleCase(s.toLowerCase())),
    shared_count: r.shared_count,
  }))
}

/**
 * Cached per document symbol (an hour, like the other detail-page reads), and
 * deduped within a request so the modal and the page body pay for it once.
 */
export const getRelatedMandates = cache(
  async (symbol: string): Promise<RelatedMandate[]> => {
    const frequencies = await getSubjectFrequencies()
    return unstable_cache(
      () => fetchRelatedMandates(symbol, frequencies),
      ['related-mandates-v1', symbol],
      { revalidate: 3600 }
    )()
  }
)

/**
 * Domain code (UNBIS 01–18) for each subject heading on a document, so the
 * topic pills can carry the same colour dot the /subjects pill-map uses. Keyed
 * by the normalized (upper-case) heading; headings with no thesaurus match are
 * simply absent and render without a dot.
 */
export const getSubjectDomainCodes = cache(
  async (symbol: string): Promise<Record<string, string>> => {
    const rows = await queryMany<{ subject_norm: string; domain_code: string }>(
      `SELECT t.subject_norm, MIN(t.domain_code) AS domain_code
       FROM public.unified_documents d
       CROSS JOIN LATERAL UNNEST(d.subjects) s
       JOIN ppb2026.subject_thesaurus t ON t.subject_norm = s
       WHERE d.ppb_full_document_symbol = $1
       GROUP BY t.subject_norm`,
      [symbol]
    )
    const out: Record<string, string> = {}
    for (const row of rows) out[row.subject_norm] = row.domain_code
    return out
  }
)
