/**
 * Country-level voting data ("consensus lens", part 2) — server-only.
 *
 * Unlike lib/data/votes.ts this does not touch the database: the data ships
 * with the repo as JSON produced by data-processing/voting/process_voting.py
 * from the UN Digital Library "Voting Data" collection (2015-present; GA
 * plenary, Security Council, and a few other bodies) plus the Bailey/
 * Strezhnev/Voeten ideal point estimates (1946-2025, Harvard Dataverse
 * doi:10.7910/DVN/LEJUQZ). See docs/lens-consensus/ANALYSIS.md.
 */

import voteDetailsJson from '@/data/voting/vote-details.json'
import votingAnalysisJson from '@/data/voting/voting-analysis.json'

// ---------------------------------------------------------------------------
// Per-resolution minority lists (mandate detail strip)
// ---------------------------------------------------------------------------

interface VoteDetailRow {
  /** Vote date (YYYY-MM-DD). */
  d: string
  /** Body: GA | SC | HRC | ECOSOC | … */
  t: string
  /** In-favour count. */
  y: number
  /** Absent / non-voting count. */
  x: number
  /** ISO3 codes voting No. */
  n: string[]
  /** ISO3 codes abstaining. */
  a: string[]
}

interface VoteDetailsFile {
  countries: Record<string, string>
  votes: Record<string, VoteDetailRow>
}

const voteDetails = voteDetailsJson as unknown as VoteDetailsFile

export interface CountryRef {
  code: string
  name: string
}

export interface CountryVoteBreakdown {
  date: string
  body: string
  inFavour: number
  absent: number
  against: CountryRef[]
  abstaining: CountryRef[]
}

const toRefs = (codes: string[]): CountryRef[] =>
  codes.map((code) => ({
    code,
    name: voteDetails.countries[code] ?? code,
  }))

/**
 * Who voted against / abstained on a document, when the Digital Library
 * Voting Data collection covers it (recorded votes 2015-present). Null
 * otherwise — the strip then shows only the totals from vote_summary.
 */
export function getCountryVotes(
  documentSymbol: string
): CountryVoteBreakdown | null {
  const key = documentSymbol.replace(/\s+/g, '').toUpperCase()
  const row = voteDetails.votes[key]
  if (!row) return null
  return {
    date: row.d,
    body: row.t,
    inFavour: row.y,
    absent: row.x,
    against: toRefs(row.n),
    abstaining: toRefs(row.a),
  }
}

// ---------------------------------------------------------------------------
// Aggregated analysis (geopolitics expander)
// ---------------------------------------------------------------------------

export interface VotingAnalysis {
  /** ISO3 -> display name for every country that cast a vote. */
  countries: Record<string, string>
  /** GA plenary recorded votes the similarity data is computed on. */
  gaCoverage: { from: string; to: string; votes: number }
  /** ISO3 codes ordered by latest Voeten ideal point (US-aligned first). */
  order: string[]
  /** Percent agreement (0-100) between order[i] and order[j]; null when the
   * pair shares fewer than 50 common votes. */
  matrix: (number | null)[][]
  /** Countries most often on a 1-2 country "No" side of a GA vote. */
  loneliest: {
    iso: string
    lonely: number
    totalNo: number
    votes: number
  }[]
  /** Voeten ideal point history: yearly distribution + labeled countries. */
  idealPoints: {
    years: number[]
    percentiles: Record<'p10' | 'p25' | 'p50' | 'p75' | 'p90', number[]>
    series: Record<string, (number | null)[]>
  }
}

const votingAnalysis = votingAnalysisJson as unknown as VotingAnalysis

/** The pre-computed country-voting aggregates shipped with the repo. */
export function getVotingAnalysis(): VotingAnalysis {
  return votingAnalysis
}
