/**
 * Paragraph Database Queries
 *
 * Fetches paragraph-level fulltext content for a document. Two corpora back this:
 *
 *   1. mandates.paragraphs — the richer, mandate-NER-tagged corpus (~2.8k
 *      PPB-cited docs), with linked-symbol pairs and per-paragraph mandate
 *      objects. This wins whenever it covers the symbol *and* carries the
 *      pre-rendered markup that makes it richer.
 *   2. digitallibrary.document_paragraphs — the semantic fulltext layer for UN
 *      resolutions/PRSTs (lang='en'). Fills in every other document, mapped into
 *      the same return contract. It has no pre-rendered highlight markup, but it
 *      does carry scalar verb/assignee annotations, which are reassembled into
 *      the same markup grammar here (see synthesizeDlAnnotations). Deliverables,
 *      mentioned entities and uncertainties genuinely do not exist on this arm.
 *
 * This mirrors public.unified_paragraphs (sql/migrations/029), but is expressed
 * as two per-symbol, index-driven queries with fallback rather than a single
 * SELECT against the view: the view's precedence anti-join full-scans
 * mandates.paragraphs (~120ms), whereas running the mandates arm first and the
 * Digital Library arm only when needed keeps every lookup on a symbol index
 * (idx_paragraphs_symbol / idx_document_paragraphs_symbol, <10ms).
 * The Digital Library arm matches on the
 * whitespace/upper-case normalized symbol, the same join semantics the rest of
 * the app uses (see unified_documents).
 *
 * All operations are server-side only.
 */

import { cache } from 'react'
import { queryMany } from '../db/query'
import type { Paragraph } from '@/types'

// ============================================================================
// Types for DB Rows (internal)
// ============================================================================

interface ParagraphRow {
  id: string
  position: number
  text: string
  type: string
  heading_level: number | null
  paragraph_type: string | null
  paragraph_level: number | null
  prefix: string | null
  text_with_highlights: string | null
  uncertainties: string | null
  /** Raw JSONB — pg parses this automatically */
  mandates: Paragraph['mandates'] | null
  /** json_agg result — pg parses this automatically */
  links: [string, string][] | null
  /** DL-only structural metadata; NULL for the mandates arm. */
  section: string | null
  annex_index: number | null
  text_index: number | null
  /**
   * DL-only scalar NLP annotations (absent on the mandates arm, which ships the
   * same information pre-rendered in `text_with_highlights` / `mandates`).
   */
  lead_verb?: string | null
  action_verb?: string | null
  action_verb_normalized?: string | null
  action_category?: string | null
  assignee?: string | null
  assignee_head_noun?: string | null
  assignee_class?: string | null
}

type ParagraphMandate = NonNullable<Paragraph['mandates']>[number]

/**
 * Delimiters of the highlight markup grammar consumed by ParagraphsSection:
 * `*verb*`, `<<assignee>>`, `{{mentioned entity}}`, `[[deliverable]]`. A
 * paragraph whose raw text already contains any of them cannot be marked up
 * unambiguously (the renderer's non-greedy regexes would pair the wrong
 * characters), so it is left un-highlighted. Affects ~49 of 508,923 DL rows.
 */
const HIGHLIGHT_DELIMITERS = ['*', '<<', '>>', '{{', '}}', '[[', ']]']

function containsHighlightDelimiter(text: string): boolean {
  return HIGHLIGHT_DELIMITERS.some((d) => text.includes(d))
}

/**
 * Rebuild the `text_with_highlights` markup and the `mandates` object for a
 * Digital Library paragraph from its scalar annotation columns.
 *
 * The DL layer stores no character offsets, but the spans are recoverable:
 * `lead_verb` is by construction the literal opening span of `text`
 * (508,718/508,923 = 99.96% of annotated rows satisfy `text.startsWith`), and
 * `assignee` is a literal substring (114,318/114,335 = 99.99% of rows that have
 * both). Both are verified per row before use — a mismatch drops that span
 * rather than mis-wrapping it.
 *
 * `mandates[0].action_verb` is deliberately the raw `lead_verb` (not the
 * canonical `action_verb`), because ParagraphsSection resolves the verb tooltip
 * by string-equality against the text it found between the asterisks.
 *
 * Returns `null` when the row carries no canonical verb annotation at all.
 * `textWithHighlights` is `undefined` when no span could be wrapped (e.g.
 * `action_inherited` rows, which have an `action_verb` but no `lead_verb`);
 * such rows still get a `mandates` entry so the filters can see them.
 */
function synthesizeDlAnnotations(
  row: ParagraphRow
): Pick<Paragraph, 'textWithHighlights' | 'mandates'> | null {
  const canonicalVerb = row.action_verb ?? null
  if (!canonicalVerb) return null

  const text = row.text
  const leadVerb = row.lead_verb ?? null
  const assignee = row.assignee ?? null

  // Offsets first, markup second: inserting a delimiter shifts every later
  // offset, so both spans are located against the pristine text and then
  // spliced in descending order.
  const canMarkUp = !containsHighlightDelimiter(text)

  const verbStart = canMarkUp && leadVerb && text.startsWith(leadVerb) ? 0 : -1
  const verbEnd = verbStart === 0 && leadVerb ? leadVerb.length : -1

  let assigneeStart = -1
  if (canMarkUp && assignee) {
    // Search past the verb span so the two can never overlap.
    const from = verbEnd > 0 ? verbEnd : 0
    assigneeStart = text.indexOf(assignee, from)
  }
  const assigneeEnd =
    assigneeStart >= 0 && assignee ? assigneeStart + assignee.length : -1

  let marked = text
  if (assigneeStart >= 0) {
    marked =
      marked.slice(0, assigneeStart) +
      `<<${marked.slice(assigneeStart, assigneeEnd)}>>` +
      marked.slice(assigneeEnd)
  }
  if (verbStart === 0) {
    marked = `*${marked.slice(0, verbEnd)}*` + marked.slice(verbEnd)
  }

  const wrappedVerb = verbStart === 0 && leadVerb ? leadVerb : null
  const wrappedAssignee =
    assigneeStart >= 0 && assignee ? text.slice(assigneeStart, assigneeEnd) : null

  const mandate: ParagraphMandate = {
    // Must equal what sits between the asterisks for the tooltip lookup to hit.
    action_verb: wrappedVerb ?? canonicalVerb,
    action_verb_normalized: row.action_verb_normalized ?? undefined,
    action_verb_type: row.action_category ?? 'unclear',
    assignees: wrappedAssignee
      ? [
          {
            assignee: wrappedAssignee,
            assignee_normalized: row.assignee_head_noun ?? wrappedAssignee,
            assignee_type: row.assignee_class ?? 'unclear',
          },
        ]
      : [],
    // The Digital Library layer has no columns for either.
    mentioned_entities: [],
    deliverables: [],
  }

  return {
    textWithHighlights: marked === text ? undefined : marked,
    mandates: [mandate],
  }
}

function mapRow(row: ParagraphRow): Paragraph {
  return {
    id: row.id,
    position: row.position,
    text: row.text,
    type: row.type,
    heading_level: row.heading_level,
    paragraph_type: row.paragraph_type,
    paragraph_level: row.paragraph_level,
    prefix: row.prefix,
    links: row.links ?? [],
    textWithHighlights: row.text_with_highlights ?? undefined,
    uncertainties: row.uncertainties ?? undefined,
    mandates: row.mandates ?? undefined,
    section: row.section ?? undefined,
    annex_index: row.annex_index ?? undefined,
    text_index: row.text_index ?? undefined,
  }
}

function mapDlRow(row: ParagraphRow): Paragraph {
  const base = mapRow(row)
  const annotations = synthesizeDlAnnotations(row)
  return annotations ? { ...base, ...annotations } : base
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch all paragraphs for a document in order, with their links.
 *
 * Precedence: the mandates.paragraphs arm wins; the Digital Library arm is
 * consulted only when the mandates arm returns nothing. Returns an empty array
 * when no fulltext has been extracted for the symbol in either corpus.
 */
export const getParagraphsBySymbol = cache(
  async (documentSymbol: string): Promise<Paragraph[]> => {
    // Arm 1 — mandates.paragraphs (richer). Indexed on document_symbol.
    const mandatesRows = await queryMany<ParagraphRow>(
      `
      SELECT
        p.id,
        p.position,
        p.text,
        p.type,
        p.heading_level,
        p.paragraph_type,
        p.paragraph_level,
        p.prefix,
        p.text_with_highlights,
        p.uncertainties,
        p.mandates,
        COALESCE(
          json_agg(
            json_build_array(pl.linked_symbol, pl.linked_url)
            ORDER BY pl.id
          ) FILTER (WHERE pl.id IS NOT NULL),
          '[]'::json
        ) AS links,
        NULL::text AS section,
        NULL::smallint AS annex_index,
        NULL::smallint AS text_index
      FROM mandates.paragraphs p
      LEFT JOIN mandates.paragraph_links pl ON pl.paragraph_id = p.id
      WHERE p.document_symbol = $1
      GROUP BY
        p.id, p.position, p.text, p.type,
        p.heading_level, p.paragraph_type, p.paragraph_level,
        p.prefix, p.text_with_highlights, p.uncertainties, p.mandates
      ORDER BY p.position
      `,
      [documentSymbol]
    )

    // Precedence. The mandates arm wins whenever it actually carries the thing
    // it is richer for — the pre-rendered highlight markup. When it covers a
    // symbol but every row has a NULL `text_with_highlights` (2,733 of its 2,829
    // symbols), the Digital Library arm is consulted instead, because its scalar
    // verb/assignee annotations can be turned back into markup below. That
    // fallback is only taken when it costs no visible content — see the
    // operative-paragraph guard after the second query.
    const mandatesHaveHighlights = mandatesRows.some(
      (r) => r.text_with_highlights != null && r.text_with_highlights !== ''
    )
    if (mandatesHaveHighlights) {
      return mandatesRows.map(mapRow)
    }

    // Arm 2 — digitallibrary.document_paragraphs (semantic fulltext).
    // Indexed on (symbol_normalized, lang). Match the app-wide normalized symbol
    // join (upper + strip whitespace). Masthead frontmatter is dropped as pure
    // document boilerplate; every other DL `type` is carried through verbatim —
    // ParagraphsSection only special-cases 'heading' and renders
    // operative/preambular clauses, hiding all other elements under its
    // permanent operative filter, so the mapping is render-safe as-is.
    const dlRows = await queryMany<ParagraphRow>(
      `
      SELECT
        dp.id,
        dp.position,
        dp.text,
        dp.type,
        dp.heading_level,
        dp.paragraph_type,
        dp.level AS paragraph_level,
        dp.prefix,
        NULL::text AS text_with_highlights,
        NULL::text AS uncertainties,
        NULL::jsonb AS mandates,
        COALESCE(
          (
            SELECT json_agg(json_build_array(h->>'text', h->>'url'))
            FROM jsonb_array_elements(dp.hyperlinks) h
          ),
          '[]'::json
        ) AS links,
        dp.section,
        dp.annex_index,
        dp.text_index,
        dp.lead_verb,
        dp.action_verb,
        dp.action_verb_normalized,
        dp.action_category,
        dp.assignee,
        dp.assignee_head_noun,
        dp.assignee_class
      FROM digitallibrary.document_paragraphs dp
      WHERE dp.symbol_normalized = upper(regexp_replace($1, '[[:space:]]', '', 'g'))
        AND dp.lang = 'en'
        AND NOT (dp.type = 'frontmatter' AND dp.subtype = 'masthead')
      ORDER BY dp.position
      `,
      [documentSymbol]
    )

    const dlParagraphs = dlRows.map(mapDlRow)

    if (mandatesRows.length === 0) {
      return dlParagraphs
    }

    // Both arms cover this symbol and neither ships pre-rendered markup. Only
    // switch to the Digital Library arm if it (a) actually yields highlights and
    // (b) does not drop operative paragraphs — ParagraphsSection renders under a
    // permanent `paragraph_type = 'operative'` filter, so a lower operative count
    // is content the reader would simply stop seeing. Measured over the 2,260
    // affected symbols: 2,161 qualify, 99 (annex-heavy declarations, where the DL
    // parser classifies annexed text as non-operative) keep the mandates arm.
    const hasSynthesizedHighlights = dlParagraphs.some((p) =>
      Boolean(p.textWithHighlights)
    )
    if (!hasSynthesizedHighlights) {
      return mandatesRows.map(mapRow)
    }

    const countOperative = (rows: { paragraph_type: string | null }[]) =>
      rows.filter((r) => r.paragraph_type === 'operative').length
    if (countOperative(dlRows) < countOperative(mandatesRows)) {
      return mandatesRows.map(mapRow)
    }

    return dlParagraphs
  }
)
