import type { ReactNode } from 'react'
import type { Mandate, Organ } from '@/types'
import { DetailSectionHeading, FilterChip } from '@/components/MandateDetailUi'

/**
 * "Who created this mandate?" — the provenance of the document, written as one
 * sentence whose nouns are chips:
 *
 *   (General Assembly) as a (Resolution) under agenda item (10 Global health),
 *   published in (2024)
 *
 * The sentence is assembled from parts rather than concatenated, because every
 * part is optional in the data: Security Council presidential statements carry
 * no agenda item, a handful of documents have no type, and DL-only records can
 * lack a year. A missing part takes its whole clause with it, so the sentence
 * never degrades into dangling punctuation.
 *
 * Every chip is a filter on the explorer. The organ chip shows the organ's long
 * name (from the organs table) rather than the symbol prefix — "General
 * Assembly", not "GA" — while still filtering on the short code the table
 * indexes.
 *
 * The old "Budget Document" row is gone: which budget stream cites this
 * document is a property of the citing entity, and now lives in that entity's
 * popover under "Who implements this mandate?".
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

  // Clauses, in reading order. `clauses.length` at push time tells each clause
  // whether it is opening the sentence, which is what decides "A Resolution…"
  // vs "…as a Resolution…" and where the capital letter goes. `separator` is
  // what precedes the clause when it is not the first.
  const clauses: { key: string; separator: string; node: ReactNode }[] = []

  if (organShort) {
    clauses.push({
      key: 'organ',
      separator: ' ',
      node: (
        <FilterChip
          href={explorerUrl('organ', organShort)}
          title={`Show mandates adopted by ${organLong}`}
        >
          {organLong}
        </FilterChip>
      ),
    })
  }

  if (documentType && documentType !== 'Unknown') {
    // The filter values are plural category names ("Resolutions"); the sentence
    // needs the singular. The chip's link keeps the plural the table indexes.
    const singular = singularizeType(documentType)
    const article = /^[aeiou]/i.test(singular) ? 'an' : 'a'
    const lead =
      clauses.length > 0 ? `as ${article} ` : `${article === 'a' ? 'A' : 'An'} `
    clauses.push({
      key: 'type',
      separator: ' ',
      node: (
        <>
          {lead}
          <FilterChip
            href={explorerUrl('document_type', documentType)}
            title={`Show ${documentType}`}
          >
            {singular}
          </FilterChip>
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
      separator: ' ',
      node: (
        <>
          {lead}
          {agendaItems.map((item, index) => (
            <span key={`${item.number}-${item.title}-${index}`}>
              {index > 0 && <span className="text-gray-500"> and </span>}
              <FilterChip
                href={explorerUrl('agenda_item', item.title)}
                title={`Show mandates under “${item.title}”`}
              >
                {item.number && (
                  <span className="font-medium text-gray-900">
                    {item.number}
                  </span>
                )}
                <span>{item.title}</span>
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
          <FilterChip>{year}</FilterChip>
        </>
      ),
    })
  }

  if (clauses.length === 0) return null

  return (
    <section className="space-y-3">
      <DetailSectionHeading>Who created this mandate?</DetailSectionHeading>
      <p className="text-sm leading-8 text-gray-700">
        {clauses.map((clause, index) => (
          <span key={clause.key}>
            {index > 0 && clause.separator}
            {clause.node}
          </span>
        ))}
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

interface AgendaItem {
  number: string
  title: string
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
 */
function pairAgendaItems(
  numbers: string[] | undefined,
  titles: string[] | undefined
): AgendaItem[] {
  const out: AgendaItem[] = []
  ;(titles ?? []).forEach((rawTitle, i) => {
    const title = rawTitle?.trim()
    if (!title) return
    out.push({ number: numbers?.[i]?.trim() ?? '', title })
  })
  return out
}
