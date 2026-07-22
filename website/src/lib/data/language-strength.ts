/**
 * Language-strength ("command gradient") queries for the /secretariat
 * "The language of command" expander.
 *
 * Source: `digitallibrary.document_paragraphs` — every operative paragraph of
 * the parsed English resolution corpus carries the verb it opens with
 * (`action_verb_normalized`), a 0–5 force score for that verb
 * (`action_force`), a coarse tone label (`action_bindingness`:
 * 'binding' = directive verbs such as decides or authorizes,
 * 'hortatory' = requesting verbs such as requests, urges or encourages,
 * 'contextual' = stocktaking verbs such as recalls or welcomes), and the
 * actor the paragraph addresses (`assignee`, `assignee_class`).
 *
 * IMPORTANT FRAMING: 'binding' describes the STRENGTH OF THE LANGUAGE, not
 * legal force — a General Assembly resolution is a recommendation no matter
 * how it is phrased. All UI copy must say "directive language", never imply
 * legal bindingness.
 *
 * All four datasets are global, tiny (≤ a few dozen rows each), independent of
 * the explorer's filters, and cached for an hour like the other /secretariat
 * directory fetches.
 */

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { queryMany } from '../db/query'

/** The three principal organs with parsed-corpus coverage. */
export type LanguageBody =
  | 'General Assembly'
  | 'Security Council'
  | 'Economic and Social Council'

export interface BindingnessDecadePoint {
  body: LanguageBody
  /** Decade start year, e.g. 1990. */
  decade: number
  /** Operative paragraphs opening with a directive verb (decides, authorizes…). */
  directive: number
  /** Operative paragraphs opening with a requesting verb (requests, urges…). */
  hortatory: number
}

export interface AssigneeGradientRow {
  /** Raw `assignee_class` value, e.g. 'secretary-general'. */
  assigneeClass: string
  /** Operative paragraphs addressed to this actor (directive + hortatory). */
  paragraphs: number
  /** Mean verb force on the 0–5 scale. */
  avgForce: number
  /** Share of those paragraphs that use a directive verb, in percent. */
  pctDirective: number
}

export interface VerbLeagueRow {
  /** Normalized lead verb, e.g. 'call upon'. */
  verb: string
  /** Verb force on the 0–5 scale (constant per verb). */
  force: number
  /** 'binding' (directive) or 'hortatory' (requesting). */
  tone: 'binding' | 'hortatory'
  /** Operative paragraphs opening with this verb. */
  paragraphs: number
}

export interface DemandDecadePoint {
  decade: number
  /** Security Council operative paragraphs opening with "Demands". */
  demands: number
}

export interface LanguageStrengthData {
  decades: BindingnessDecadePoint[]
  gradient: AssigneeGradientRow[]
  verbs: VerbLeagueRow[]
  scDemands: DemandDecadePoint[]
}

/** Shared scope: operative paragraphs whose lead verb is classified as
 * directive ('binding') or requesting ('hortatory'). Contextual verbs
 * (recalls, welcomes…) take no action and are excluded throughout. */
const OPERATIVE_CLASSIFIED = `
  (p.paragraph_type = 'operative' OR p.inferred_operative)
  AND p.action_bindingness IN ('binding', 'hortatory')`

/** A body-decade needs this many classified paragraphs before its share is
 * plotted — ECOSOC's parsed coverage before the 2010s is a handful of
 * documents whose percentages would be pure noise. */
const MIN_CLASSIFIED_PER_DECADE = 100

const _getLanguageStrengthInner = async (): Promise<LanguageStrengthData> => {
  const [decadeRows, gradientRows, verbRows, demandRows] = await Promise.all([
    queryMany<{
      body: LanguageBody
      decade: number
      directive: number
      hortatory: number
    }>(
      `SELECT d.un_body AS body,
              (extract(year FROM d.date_publication)::int / 10) * 10 AS decade,
              count(*) FILTER (WHERE p.action_bindingness = 'binding')::int AS directive,
              count(*) FILTER (WHERE p.action_bindingness = 'hortatory')::int AS hortatory
       FROM digitallibrary.document_paragraphs p
       JOIN digitallibrary.documents d USING (symbol_normalized)
       WHERE ${OPERATIVE_CLASSIFIED}
         AND d.un_body IN ('General Assembly', 'Security Council', 'Economic and Social Council')
         AND d.date_publication IS NOT NULL
       GROUP BY 1, 2
       ORDER BY 1, 2`
    ),
    queryMany<{
      assignee_class: string
      paragraphs: number
      avg_force: string
      pct_directive: string
    }>(
      `SELECT p.assignee_class,
              count(*)::int AS paragraphs,
              avg(p.action_force) AS avg_force,
              100.0 * count(*) FILTER (WHERE p.action_bindingness = 'binding') / count(*) AS pct_directive
       FROM digitallibrary.document_paragraphs p
       WHERE ${OPERATIVE_CLASSIFIED}
         AND p.assignee_class IS NOT NULL
         AND p.assignee_class <> 'unclear'
         AND p.action_force IS NOT NULL
       GROUP BY 1
       ORDER BY avg_force DESC`
    ),
    queryMany<{
      verb: string
      force: number
      tone: 'binding' | 'hortatory'
      paragraphs: number
    }>(
      `SELECT p.action_verb_normalized AS verb,
              max(p.action_force)::int AS force,
              max(p.action_bindingness) AS tone,
              count(*)::int AS paragraphs
       FROM digitallibrary.document_paragraphs p
       WHERE ${OPERATIVE_CLASSIFIED}
         AND p.action_verb_normalized IS NOT NULL
       GROUP BY 1
       ORDER BY paragraphs DESC
       LIMIT 12`
    ),
    queryMany<{ decade: number; demands: number }>(
      `SELECT (extract(year FROM d.date_publication)::int / 10) * 10 AS decade,
              count(*)::int AS demands
       FROM digitallibrary.document_paragraphs p
       JOIN digitallibrary.documents d USING (symbol_normalized)
       WHERE (p.paragraph_type = 'operative' OR p.inferred_operative)
         AND p.action_verb_normalized = 'demand'
         AND d.un_body = 'Security Council'
         AND d.date_publication IS NOT NULL
       GROUP BY 1
       ORDER BY 1`
    ),
  ])

  return {
    decades: decadeRows
      .map((r) => ({
        body: r.body,
        decade: Number(r.decade),
        directive: Number(r.directive),
        hortatory: Number(r.hortatory),
      }))
      .filter(
        (r) => r.directive + r.hortatory >= MIN_CLASSIFIED_PER_DECADE
      ),
    gradient: gradientRows.map((r) => ({
      assigneeClass: r.assignee_class,
      paragraphs: Number(r.paragraphs),
      avgForce: Number(r.avg_force),
      pctDirective: Number(r.pct_directive),
    })),
    verbs: verbRows.map((r) => ({
      verb: r.verb,
      force: Number(r.force),
      tone: r.tone,
      paragraphs: Number(r.paragraphs),
    })),
    scDemands: demandRows.map((r) => ({
      decade: Number(r.decade),
      demands: Number(r.demands),
    })),
  }
}

/** Cached wrapper — version-independent, hourly like the other directory
 * fetches. */
export const getLanguageStrength = cache(
  (): Promise<LanguageStrengthData> =>
    unstable_cache(_getLanguageStrengthInner, ['language-strength-v1'], {
      revalidate: 3600,
    })()
)
