import type { Paragraph } from '../types/index.ts'

export interface AnnotationRow {
  text: string
  paragraph_type?: string | null
  action_inherited?: boolean | null
  lead_verb?: string | null
  action_verb?: string | null
  action_verb_normalized?: string | null
  action_category?: string | null
  assignee?: string | null
  assignee_head_noun?: string | null
  assignee_class?: string | null
}

/** Remove parenthetical context; reject abstract objects mistaken for actors. */
export function cleanAssignee(value?: string | null): string | null {
  if (!value) return null
  const head = value
    .split(
      /,\s*(?:under the auspices|in consultation|within|where|especially|taking into account)\b/i
    )[0]
    .trim()
  if (
    /^(?:(?:the|all|ongoing|strengthened|continued|further|enhanced|international)\s+)*(?:cooperation|efforts|contribution|engagement|implementation|participation|support)\b/i.test(
      head
    )
  )
    return null
  return head
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

/** Rebuild annotations from literal action spans, never structural first-word guesses.
 * Inherited actions remain filterable when there is no literal span to highlight.
 */
export function synthesizeDlAnnotations(
  row: AnnotationRow
): Pick<Paragraph, 'textWithHighlights' | 'mandates'> | null {
  const canonicalVerb = row.action_verb ?? null
  if (!canonicalVerb) return null

  const text = row.text
  // Structural lead_verb is only a first-word guess ('We', 'Eradicating').
  // action_verb is the literal span returned by the action classifier.
  const leadVerb = canonicalVerb.replace(/^We\s+/i, '').replace(/\s+to:$/, '')
  if (row.paragraph_type !== 'preambular' && /ing$/i.test(leadVerb)) return null
  if (/^(we|will|shall)$/i.test(leadVerb)) return null
  const assignee = cleanAssignee(row.assignee)

  // Offsets first, markup second: inserting a delimiter shifts every later
  // offset, so both spans are located against the pristine text and then
  // spliced in descending order.
  const canMarkUp = !containsHighlightDelimiter(text) && !row.action_inherited

  const escaped = leadVerb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = canMarkUp
    ? new RegExp(`\\b${escaped}\\b`, 'i').exec(text)
    : null
  const verbStart = match?.index ?? -1
  const verbEnd = verbStart >= 0 ? verbStart + leadVerb.length : -1

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
  if (verbStart >= 0) {
    marked =
      marked.slice(0, verbStart) +
      `*${marked.slice(verbStart, verbEnd)}*` +
      marked.slice(verbEnd)
  }

  const wrappedVerb = verbStart >= 0 ? text.slice(verbStart, verbEnd) : null
  const wrappedAssignee =
    assigneeStart >= 0 && assignee
      ? text.slice(assigneeStart, assigneeEnd)
      : null

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
