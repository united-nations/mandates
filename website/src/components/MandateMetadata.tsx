import type { ReactNode } from 'react'
import type { Mandate, Organ } from '@/types'
import { DetailSectionHeading, FilterChip } from '@/components/MandateDetailUi'

/**
 * "Who adopted this document and its mandates?" — the provenance of the
 * document, written as one sentence whose nouns are chips:
 *
 *   A (Resolution) of the (General Assembly), under agenda item (10 Global
 *   health), published in (2024).
 *
 * The sentence is assembled from parts rather than concatenated, because every
 * part is optional in the data: Security Council presidential statements carry
 * no agenda item, 1,420 of 2,737 documents have no recorded type, and DL-only
 * records can lack a year. A missing part takes its whole clause with it, so the
 * sentence never degrades into dangling punctuation.
 *
 * The head noun is the document itself ("A Resolution…", or "A document…" when
 * the type is unrecorded) rather than the organ. Leading with the organ produced
 * a subject the sentence never predicates — "General Assembly under agenda item
 * Foo" has no verb and no copula — and that case is the common one, since most
 * documents have no type.
 *
 * Every chip is a filter on the explorer. The organ chip shows the organ's long
 * name (from the organs table) rather than the symbol prefix — "General
 * Assembly", not "GA" — while still filtering on the short code the table
 * indexes. The year chip filters the explorer to that single year
 * (start_year=end_year), so the contract "every chip is a real link" holds for
 * all four.
 *
 * The old "Budget Document" row is gone: which budget stream cites this
 * document is a property of the citing entity, and now lives in that entity's
 * popover under "Who cites this mandate in the budget?".
 */

interface MandateMetadataProps {
  mandate: Mandate
  organs: Organ[]
}

const explorerUrl = (key: string, value: string) =>
  `/secretariat?${key}=${encodeURIComponent(value)}`

export function MandateMetadata({ mandate, organs }: MandateMetadataProps) {
  const organShort = mandate.body?.trim() ?? ''
  const organLong =
    organs.find((o) => o.short === organShort || o.long === organShort)?.long ??
    organShort
  const documentType = mandate.type?.trim() ?? ''
  const year = mandate.year?.trim() ?? ''

  // Numbers and titles arrive as two parallel lists (MARC 991 subfields),
  // paired by position — see pairAgendaItems for why number-only entries are
  // dropped rather than shown.
  const agendaItems = pairAgendaItems(
    mandate.agenda_item_numbers,
    mandate.agenda_item_titles
  )

  const hasType = Boolean(documentType) && documentType !== 'Unknown'
  const hasOrgan = Boolean(organShort)

  // Clauses, in reading order. `clauses.length` at push time tells each clause
  // whether it is opening the sentence, which is what decides where the capital
  // letter goes. `separator` is what precedes the clause when it is not first.
  const clauses: { key: string; separator: string; node: ReactNode }[] = []

  // Head noun: the document. Present whenever we can say anything about what
  // the document *is* or whose it is; the type supplies it when recorded, and
  // the neutral "document" stands in when it is not, so the organ always has
  // something to be "of".
  if (hasType || hasOrgan) {
    // The filter values are plural category names ("Resolutions"); the sentence
    // needs the singular. The chip's link keeps the plural the table indexes.
    const singular = hasType ? singularizeType(documentType) : ''
    const article = /^[aeiou]/i.test(singular) ? 'An' : 'A'
    clauses.push({
      key: 'type',
      separator: ' ',
      node: (
        <>
          {hasType ? `${article} ` : 'A document'}
          {hasType && (
            <FilterChip
              href={explorerUrl('document_type', documentType)}
              title={`Show ${documentType}`}
            >
              {singular}
            </FilterChip>
          )}
          {hasOrgan && (
            <>
              {` of ${definiteArticle(organLong)}`}
              <FilterChip
                href={explorerUrl('organ', organShort)}
                title={`Show mandates adopted by ${organLong}`}
              >
                {organLong}
              </FilterChip>
            </>
          )}
        </>
      ),
    })
  }

  if (agendaItems.length > 0) {
    const plural = agendaItems.length > 1 ? 's' : ''
    const lead =
      clauses.length > 0
        ? `under agenda item${plural} `
        : `Under agenda item${plural} `
    clauses.push({
      key: 'agenda',
      separator: ', ',
      node: (
        <>
          {lead}
          {agendaItems.map((item, index) => (
            <span key={`${item.number}-${item.label}-${index}`}>
              {index > 0 && (
                <span className="text-gray-500">
                  {index === agendaItems.length - 1 ? ' and ' : ', '}
                </span>
              )}
              <FilterChip
                href={explorerUrl('agenda_item', item.title)}
                title={`Show mandates under “${item.label}”`}
              >
                {/* The space is written out. These were two flex children of
                    a chip, which set the gap between them; as plain inline
                    spans in a sentence they would render as "12Situation of
                    human rights". */}
                {item.number && <span>{item.number} </span>}
                <span>{item.label}</span>
              </FilterChip>
            </span>
          ))}
        </>
      ),
    })
  }

  if (year) {
    const first = clauses.length === 0
    clauses.push({
      key: 'year',
      separator: ', ',
      node: (
        <>
          {first ? 'Published in ' : 'published in '}
          <FilterChip
            href={`/secretariat?start_year=${encodeURIComponent(year)}&end_year=${encodeURIComponent(year)}`}
            title={`Show mandates from ${year}`}
          >
            {year}
          </FilterChip>
        </>
      ),
    })
  }

  if (clauses.length === 0) return null

  return (
    <section className="space-y-3">
      <DetailSectionHeading>
        Who adopted this document and its mandates?
      </DetailSectionHeading>
      <p className="text-sm leading-relaxed text-gray-700">
        {clauses.map((clause, index) => (
          <span key={clause.key}>
            {index > 0 && clause.separator}
            {clause.node}
          </span>
        ))}
        {'.'}
      </p>
    </section>
  )
}

/**
 * "Resolutions" → "Resolution", "Conventions and Protocols" → "Convention and
 * Protocol". Every document-type value in the data is a plural category label,
 * which does not fit the sentence. Words ending in -ss/-us/-is are left alone so
 * a future "Analysis" does not become "Analysi".
 */
function singularizeType(type: string): string {
  return type
    .split(' ')
    .map((word) =>
      word.length > 3 && /s$/.test(word) && !/(ss|us|is)$/.test(word)
        ? word.slice(0, -1)
        : word
    )
    .join(' ')
}

/**
 * Every UN organ name in the organs table takes the definite article ("of the
 * General Assembly"), but a name that already carries it must not get a second
 * one.
 */
function definiteArticle(organLong: string): string {
  return /^the\s/i.test(organLong) ? '' : 'the '
}

interface AgendaItem {
  /** Raw heading — the value the agenda_item filter keys on. */
  title: string
  /** Display form: trailing sentence punctuation removed. */
  label: string
  /** Display form of the item number: MARC brackets removed. */
  number: string
}

/**
 * The two MARC 991 subfields are deduplicated independently upstream, so the
 * number list is often longer than the title list — S/PRST/2011/15 carries
 * numbers `[10]`, `[29]`, `X` against a single title. About 5,100 documents are
 * in that state and a further 1,200 have numbers and no titles at all.
 *
 * A bare number is not something a reader can act on (it is not a filter value
 * either — the agenda filter keys on the title), so only pairs with a title are
 * shown. When no title exists the whole clause is dropped rather than printing
 * "under agenda items [29] and X".
 *
 * Both fields carry raw MARC punctuation: titles end in a full stop ("…United
 * Nations System."), which collided with the ", published in" that follows and
 * printed "…System., published in 2024", and numbers arrive bracketed (`[31]`)
 * about as often as bare (`118`). Both are cleaned for display only; the filter
 * still travels on the raw title.
 */
function pairAgendaItems(
  numbers: string[] | undefined,
  titles: string[] | undefined
): AgendaItem[] {
  const out: AgendaItem[] = []
  ;(titles ?? []).forEach((rawTitle, i) => {
    const title = rawTitle?.trim()
    if (!title) return
    out.push({
      title,
      label: stripTrailingPunctuation(title),
      number: cleanAgendaNumber(numbers?.[i]),
    })
  })
  return out
}

/** "…United Nations System." → "…United Nations System" */
function stripTrailingPunctuation(value: string): string {
  return value.replace(/[.,;:]+$/, '').trim()
}

/** "[31]" → "31"; "123a" → "123a"; missing → "". */
function cleanAgendaNumber(raw: string | undefined): string {
  return (raw ?? '').replace(/[[\]]/g, '').trim()
}
