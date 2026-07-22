/**
 * Client-safe half of the "consensus lens": types, constants, and the
 * vote_summary parser. The DB queries live in lib/data/votes.ts (server-only);
 * client chart components import from here so they never pull in `pg`.
 */

/** Current, still-running GA session ("to date" in chart annotations). */
export const CURRENT_GA_SESSION = 80

/** First GA session with (near-)complete vote_summary coverage in the
 * Digital Library — see docs/lens-consensus/ANALYSIS.md. */
export const MIN_COMPLETE_GA_SESSION = 39

export interface GaSessionVotes {
  session: number
  /** Calendar year the session opened (session n opens in 1945 + n). */
  startYear: number
  /** GA resolutions adopted in the session (per the Digital Library). */
  total: number
  /** Of those, adopted by recorded vote ("Adopted 127-16-40 …"). */
  voted: number
  /** Adopted without a vote / by consensus / unanimously. */
  withoutVote: number
}

export interface TopicVoteShare {
  /** Title-cased UNBIS subject heading (matches the explorer's subject filter). */
  subject: string
  /** GA resolutions (sessions 39+) tagged with this subject. */
  total: number
  /** Of those, adopted by recorded vote. */
  voted: number
  /** voted / total, in percent (0-100). */
  pctVoted: number
}

export interface TopicVoteLeague {
  /** Highest share of recorded votes — the perennial battlegrounds. */
  contested: TopicVoteShare[]
  /** Lowest share — topics the Assembly settles by consensus. */
  consensual: TopicVoteShare[]
}

export type VoteInfo =
  | {
      kind: 'recorded'
      inFavour: number
      against: number
      abstentions: number
      /** e.g. "62nd plenary meeting", when present in the summary. */
      meeting: string | null
    }
  | { kind: 'without-vote'; meeting: string | null }

/**
 * Recorded vote: "Adopted 127-16-40, …" (rarely "Adopted, 143-1-3, …").
 * Kept in sync with the SQL regex in lib/data/votes.ts.
 */
const RECORDED_VOTE_RE = /adopted,?\s+(\d+)\s*-\s*(\d+)\s*-\s*(\d+)/i

/**
 * Adopted without a recorded vote. The corpus spells this many ways, including
 * typos ("without tove", "wihtout vote"), "by consensus", "unanimously" and
 * "under silence procedure".
 */
const WITHOUT_VOTE_RE =
  /without\s+(?:a\s+)?[tv]o[tv]e|wihtout\s+vote|consensus|unanimous|silence procedure/i

const MEETING_RE = /(\d+(?:st|nd|rd|th)\s+(?:plenary\s+)?meeting)/i

/** Parse a raw Digital Library vote_summary into structured vote info. */
export function parseVoteSummary(raw: string | null): VoteInfo | null {
  if (!raw) return null
  const meeting = MEETING_RE.exec(raw)?.[1] ?? null
  const recorded = RECORDED_VOTE_RE.exec(raw)
  if (recorded) {
    return {
      kind: 'recorded',
      inFavour: Number(recorded[1]),
      against: Number(recorded[2]),
      abstentions: Number(recorded[3]),
      meeting,
    }
  }
  if (WITHOUT_VOTE_RE.test(raw)) return { kind: 'without-vote', meeting }
  // Ambiguous leftovers ("Adopted at the 69th plenary meeting", ~0.5% of the
  // corpus): no reliable signal either way, so show nothing.
  return null
}
