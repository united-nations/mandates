/**
 * Voting / consensus queries ("consensus lens") — server-only.
 *
 * All data derives from `digitallibrary.documents.vote_summary`, a free-text
 * field harvested from the UN Digital Library ("Adopted without vote, 62nd
 * plenary meeting", "Adopted 127-16-40, 62nd plenary meeting", …).
 *
 * Coverage caveat (see docs/lens-consensus/ANALYSIS.md for the full audit):
 * vote_summary is essentially complete for GA sessions 39+ (1984-) but 60-100%
 * missing for sessions 1-38, so every session-level aggregate here starts at
 * session 39. Read-only: every query is a plain SELECT.
 *
 * Types, constants, and the vote_summary parser are client-safe and live in
 * lib/consensus.ts.
 */

import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import { titleCase } from 'title-case'

import {
  MIN_COMPLETE_GA_SESSION,
  parseVoteSummary,
  type GaSessionVotes,
  type TopicVoteLeague,
  type TopicVoteShare,
  type VoteInfo,
} from '@/lib/consensus'
import { queryMany, queryOne } from '../db/query'

// ============================================================================
// vote_summary classification (SQL side — kept in sync with lib/consensus.ts)
// ============================================================================

/** Recorded vote: "Adopted 127-16-40, …" (rarely "Adopted, 143-1-3, …"). */
const RECORDED_VOTE_SQL = `vote_summary ~* 'adopted,?\\s+\\d+\\s*-\\s*\\d+\\s*-\\s*\\d+'`

/** Adopted without a recorded vote, in all its spellings and typos. */
const WITHOUT_VOTE_SQL = `vote_summary ~* 'without\\s+(a\\s+)?[tv]o[tv]e|wihtout\\s+vote|consensus|unanimous|silence procedure'`

// ============================================================================
// Per-session voting share (GA)
// ============================================================================

const _getGaVotingBySessionInner = async (): Promise<GaSessionVotes[]> => {
  const rows = await queryMany<{
    session: number
    total: number
    voted: number
    without_vote: number
  }>(
    `SELECT symbol_session::int AS session,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE ${RECORDED_VOTE_SQL})::int AS voted,
            COUNT(*) FILTER (WHERE ${WITHOUT_VOTE_SQL})::int AS without_vote
     FROM digitallibrary.documents
     WHERE document_symbol LIKE 'A/RES/%'
       AND deleted_at IS NULL
       AND symbol_session ~ '^\\d+$'
       AND symbol_session::int >= $1
     GROUP BY symbol_session::int
     ORDER BY 1`,
    [MIN_COMPLETE_GA_SESSION]
  )

  return rows.map((r) => ({
    session: Number(r.session),
    startYear: 1945 + Number(r.session),
    total: Number(r.total),
    voted: Number(r.voted),
    withoutVote: Number(r.without_vote),
  }))
}

/**
 * Share of GA resolutions adopted by recorded vote, per regular session, from
 * session 39 (1984/85, where Digital Library vote data becomes complete)
 * through the current session.
 */
export const getGaVotingBySession = cache(
  (): Promise<GaSessionVotes[]> =>
    unstable_cache(_getGaVotingBySessionInner, ['ga-voting-by-session-v1'], {
      revalidate: 3600,
    })()
)

// ============================================================================
// Contested-topics league (GA)
// ============================================================================

const LEAGUE_MIN_RESOLUTIONS = 100
const LEAGUE_SIZE = 12

const _getGaTopicVoteLeagueInner = async (): Promise<TopicVoteLeague> => {
  // One pass over GA resolutions with a known adoption method; rank subjects
  // by their recorded-vote share from both ends.
  const rows = await queryMany<{
    subject: string
    total: number
    voted: number
    rank_contested: number
    rank_consensual: number
  }>(
    `WITH res AS (
       SELECT subjects, (${RECORDED_VOTE_SQL}) AS is_voted
       FROM digitallibrary.documents
       WHERE document_symbol LIKE 'A/RES/%'
         AND deleted_at IS NULL
         AND symbol_session ~ '^\\d+$'
         AND symbol_session::int >= $1
         AND vote_summary IS NOT NULL
         AND vote_summary <> ''
     ),
     by_subject AS (
       SELECT s AS subject,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE is_voted)::int AS voted
       FROM res, UNNEST(subjects) s
       GROUP BY s
       HAVING COUNT(*) >= $2
     ),
     ranked AS (
       SELECT *,
              ROW_NUMBER() OVER (ORDER BY voted::float / total DESC, total DESC)
                AS rank_contested,
              ROW_NUMBER() OVER (ORDER BY voted::float / total ASC, total DESC)
                AS rank_consensual
       FROM by_subject
     )
     SELECT subject, total, voted, rank_contested, rank_consensual
     FROM ranked
     WHERE rank_contested <= $3 OR rank_consensual <= $3
     ORDER BY rank_contested`,
    [MIN_COMPLETE_GA_SESSION, LEAGUE_MIN_RESOLUTIONS, LEAGUE_SIZE]
  )

  const toShare = (r: (typeof rows)[number]): TopicVoteShare => {
    const total = Number(r.total)
    const voted = Number(r.voted)
    return {
      subject: titleCase(r.subject.trim().toLowerCase()),
      total,
      voted,
      pctVoted: total > 0 ? (voted / total) * 100 : 0,
    }
  }

  return {
    contested: rows
      .filter((r) => Number(r.rank_contested) <= LEAGUE_SIZE)
      .sort((a, b) => Number(a.rank_contested) - Number(b.rank_contested))
      .map(toShare),
    consensual: rows
      .filter((r) => Number(r.rank_consensual) <= LEAGUE_SIZE)
      .sort((a, b) => Number(a.rank_consensual) - Number(b.rank_consensual))
      .map(toShare),
  }
}

/**
 * Subjects with the highest and lowest recorded-vote shares among GA
 * resolutions since session 39, minimum 100 resolutions per subject.
 */
export const getGaTopicVoteLeague = cache(
  (): Promise<TopicVoteLeague> =>
    unstable_cache(_getGaTopicVoteLeagueInner, ['ga-topic-vote-league-v1'], {
      revalidate: 3600,
    })()
)

// ============================================================================
// Per-document vote info (mandate detail strip)
// ============================================================================

const _getVoteInfoInner = async (
  documentSymbol: string
): Promise<VoteInfo | null> => {
  const row = await queryOne<{ vote_summary: string | null }>(
    `SELECT vote_summary
     FROM digitallibrary.documents
     WHERE symbol_normalized = UPPER(REGEXP_REPLACE($1, '[[:space:]]', '', 'g'))
       AND deleted_at IS NULL
       AND vote_summary IS NOT NULL
       AND vote_summary <> ''
     ORDER BY recid
     LIMIT 1`,
    [documentSymbol]
  )
  return parseVoteSummary(row?.vote_summary ?? null)
}

/**
 * How a document was adopted, if the Digital Library records it: a recorded
 * vote with in-favour / against / abstention counts, or adoption without a
 * vote (consensus). Null when unknown — the detail strip then renders nothing.
 */
export const getVoteInfo = cache(
  (documentSymbol: string): Promise<VoteInfo | null> =>
    unstable_cache(
      () => _getVoteInfoInner(documentSymbol),
      ['vote-info-v1', documentSymbol],
      { revalidate: 3600 }
    )()
)
