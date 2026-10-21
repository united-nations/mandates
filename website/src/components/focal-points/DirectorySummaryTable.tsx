'use client'

import { useMemo, useState } from 'react'
import { ChevronRight, Phone } from 'lucide-react'
import { Chip } from '@/components/ui/chip'
import { SearchInput } from '@/components/SearchInput'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SHOW_ENTITY_CLASSIFICATION } from '@/lib/feature-flags'
import { explainerTexts } from '@/lib/en_text_contents'
import { typography } from '@/lib/typography'
import {
  contactTelephone,
  COVERAGE_KINDS,
  coverageClaimLabel,
  coverageKindCount,
  entityClassLabel,
  entityClassGroupLabel,
  type DirectorySummaryDesignation,
} from '@/lib/focal-point-constants'
import {
  directorySummaryLayout,
  visibleSummaryColumns,
} from './DirectorySummaryColumns'
import { DirectorySummaryColumnPicker } from './DirectorySummaryColumnPicker'
import { DirectorySummaryPanel, EmailLink } from './DirectorySummaryPanel'

/**
 * The focal point directory: one row per listed designation, opening a panel.
 *
 * Built on the same local shadcn table primitive `MandateDataTable` uses, and
 * deliberately not on `MandateDataTable` itself — that component is hand-rolled
 * around mandate filter state, and this table has no filters, no sorting, no
 * column picker and no grouping. What is borrowed is the SHAPE: a data-driven
 * column list, a fixed layout so declared widths bind, and a pinned detail rail.
 */

/**
 * The pinned detail rail on the right edge. The border and left shadow are the
 * point: without them the rail reads as clipping the column underneath it
 * rather than floating over it. Same treatment as the mandate table's.
 */
const STICKY_DETAIL_CELL =
  'sticky right-0 z-10 border-l border-border shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.18)]'

const ALIGN_CLASS: Record<string, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

export function DirectorySummaryTable({
  designations,
}: {
  designations: DirectorySummaryDesignation[]
}) {
  // Two pieces of state, not one. `open` drives the sheet; `shown` is the
  // record it is displaying and is NOT cleared on close, because Radix animates
  // the panel out over 300ms and a record cleared at the moment of closing
  // empties the panel for the whole of that slide. The next row to be clicked
  // replaces it.
  const [shown, setShown] = useState<DirectorySummaryDesignation | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  // The added columns, in component state and nowhere else — not localStorage,
  // the way the focal points application's own directory keeps them.
  //
  // That directory is signed in and is somebody's working tool; the choice is
  // their setup and asking for it again every morning would be the picker
  // forgetting. This page is neither. It is anonymous, it is the centralised
  // location the resolution points delegations at, and it is read once. Two
  // people on a call comparing the same URL would see different tables with
  // nothing on the page to explain why, which on a list whose whole value is
  // being the one list is a worse outcome than re-ticking a box. A stored set
  // also needs a versioned key and a version bump every time the default
  // changes, maintained on a site nobody administers day to day.
  const [added, setAdded] = useState<ReadonlySet<string>>(() => new Set())

  const columns = useMemo(() => visibleSummaryColumns(added), [added])

  // Widths for the columns actually on screen, not per-column constants: the
  // set changes as the reader adds columns, and so does what each one can have.
  // See `directorySummaryLayout`.
  const layout = useMemo(() => directorySummaryLayout(columns), [columns])

  const toggleColumn = (columnId: string) => {
    setAdded((current) => {
      const next = new Set(current)
      if (next.has(columnId)) next.delete(columnId)
      else next.add(columnId)
      return next
    })
  }

  const resetColumns = () => setAdded(new Set())

  const openDesignation = (designation: DirectorySummaryDesignation) => {
    setShown(designation)
    setOpen(true)
  }

  const showsEntityClass = SHOW_ENTITY_CLASSIFICATION

  const rows = useMemo(
    () =>
      designations.map((designation) => ({
        designation,
        haystack: searchableText(designation, showsEntityClass),
      })),
    [designations, showsEntityClass]
  )

  const needle = query.trim().toLowerCase()
  const visible = useMemo(
    () =>
      needle === ''
        ? rows.map((row) => row.designation)
        : rows
            .filter((row) => row.haystack.includes(needle))
            .map((row) => row.designation),
    [rows, needle]
  )

  const groups = useMemo(() => {
    if (!showsEntityClass) return [{ label: null, designations: visible }]
    const byClass = new Map<string | null, DirectorySummaryDesignation[]>()
    for (const designation of visible) {
      const key = designation.entity.entityClass
      const entries = byClass.get(key) ?? []
      entries.push(designation)
      byClass.set(key, entries)
    }
    return Array.from(byClass)
      .sort(([a], [b]) =>
        a === null ? 1 : b === null ? -1 : entityClassGroupLabel(a).localeCompare(entityClassGroupLabel(b))
      )
      .map(([key, entries]) => ({
        label: key === null ? explainerTexts.focalPointGrouping.unclassified : entityClassGroupLabel(key),
        designations: entries,
      }))
  }, [visible, showsEntityClass])

  return (
    <div>
      {/* One toolbar row: the search on the left where reading starts, the
          column control on the right, hard against the table's right edge where
          the popover opens without overhanging the page margin. They wrap onto
          two rows on a narrow viewport rather than the search shrinking. */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {/* The page's main control, so not the magnifier-and-underline the
            sidebars and filter popovers use: those are secondary filters
            beside a list, and here the underline read as a rule above the
            table rather than somewhere to type. A filled field instead — the
            neutral surface says "type here" without a border competing with
            the table's, and on focus it turns white with a UN Blue edge and
            icon, so where the cursor is never needs looking for. */}
        {/* Grows to the table's full width, so the field and the table share
            both edges and read as one unit. The 24px below it keeps it the
            page's control rather than a row of the table; the 32px above it
            (the signpost's margin) stays the larger, so it still groups with
            the table and not the intro. Not w-full: in a
            wrapping flex row that is a 100% basis, and it would push the
            picker onto a second row at every viewport. */}
        <div className="group/search min-w-0 flex-1 basis-72">
          <SearchInput
            variant="bordered"
            className="h-12 rounded-lg border-transparent bg-muted pl-12 text-base text-foreground transition-colors hover:border-border focus-visible:border-un-blue focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 md:text-base"
            iconClassName="left-4 h-5 w-5 group-focus-within/search:text-un-blue-text"
            // Exact wording, and it names only keywords on purpose. The search
            // also matches bodies, agenda items and document symbols — see
            // searchableText — but the page does not offer them. A delegation
            // that searched a document symbol and got one entity back would
            // read the result as a register of which entity owns that document.
            // It is not: it is what entities say they cover, and three of them
            // may cover the same thing. The search finds them; the page
            // promises nothing.
            placeholder="Search for keywords"
            aria-label="Search for keywords"
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setQuery(e.target.value)
            }
            showClearButton
            onClear={() => setQuery('')}
          />
        </div>
        <DirectorySummaryColumnPicker
          added={added}
          onToggle={toggleColumn}
          onReset={resetColumns}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        {/* Fixed layout, so the declared column widths bind instead of being
            recomputed from whatever the rows happen to contain. Every column
            carries an exact width now, and they sum to the table's width, so
            there is no surplus for the browser to place and no column left
            holding it. `minWidth` is that same total: below it the table
            scrolls rather than compressing columns past their floors. */}
        <Table className="table-fixed" style={{ minWidth: layout.total }}>
          <TableHeader>
            {/* The lightest UN Blue wash, black labels and a UN Blue rule —
                not the grey band the mandate table's header uses. Here the
                group separators are that grey band, and a header in the same
                band read as one more separator. The rule is the site header's
                active-tab border, so the blue already means "this labels what
                is below". It sits on the cells, not the row: a sticky cell
                drops a collapsed row border. */}
            <TableRow className="bg-un-blue-tint-50 hover:bg-un-blue-tint-50">
              {columns.map((column, index) => (
                <TableHead
                  key={column.id}
                  style={{ width: layout.widths[index] }}
                  /* `whitespace-nowrap` makes "a header does not wrap" a
                     property of the markup rather than of the numbers holding.
                     Every floor in DirectorySummaryColumns clears its own
                     header, so it is never reached; a label lengthened past its
                     column would overflow visibly instead of quietly wrapping,
                     which is the failure worth having. */
                  className={`${ALIGN_CLASS[column.align ?? 'left']} ${
                    column.id === 'detail'
                      ? 'sticky right-0 z-10 bg-un-blue-tint-50'
                      : ''
                  } h-10 border-b-2 border-un-blue px-3 whitespace-nowrap ${typography.tableHeader} text-foreground`}
                >
                  {/* The detail rail's header is empty on purpose: it labels a
                      row affordance, not a column of data. */}
                  {column.label ? (
                    column.label
                  ) : (
                    <span className="sr-only">Details</span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          {visible.length === 0 ? (
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  {/* Two different absences, and they are not the same thing to
                      say. A plain statement either way — no spelling
                      suggestion, no nearest match, no "did you mean": the
                      search is a substring filter and has nothing to suggest
                      from. */}
                  {needle === ''
                    ? 'No focal point designations are currently listed.'
                    : 'Nothing matched that search.'}
                </TableCell>
              </TableRow>
            </TableBody>
          ) : groups.map((group) => (
            <TableBody key={group.label ?? 'all'}>
              {group.label !== null && (
                <TableRow className="bg-muted hover:bg-muted">
                  <th
                    scope="rowgroup"
                    colSpan={columns.length}
                    className="px-3 py-2 text-left text-sm font-semibold text-foreground"
                  >
                    {group.label}
                  </th>
                </TableRow>
              )}
              {group.designations.map((designation) => (
                <TableRow
                  key={designation.id}
                  className="group cursor-pointer border-b border-border hover:bg-muted"
                  onClick={() => openDesignation(designation)}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={`${ALIGN_CLASS[column.align ?? 'left']} ${
                        column.id === 'detail'
                          ? `${STICKY_DETAIL_CELL} bg-white group-hover:bg-muted`
                          : ''
                      } overflow-hidden px-3 py-3 align-top text-sm`}
                    >
                      <DirectorySummaryCell
                        columnId={column.id}
                        designation={designation}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          ))}
        </Table>
      </div>

      <DirectorySummaryPanel
        designation={shown}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  )
}

/**
 * One cell's content, switched on the column id — the same arrangement as the
 * mandate table's `CellContent`: the column METADATA is a list, the rendering is
 * a switch, and a new column means touching both.
 */
function DirectorySummaryCell({
  columnId,
  designation,
}: {
  columnId: string
  designation: DirectorySummaryDesignation
}) {
  switch (columnId) {
    case 'entity': {
      const { code, name } = designation.entity
      return (
        <div className="min-w-0">
          {code && (
            <div
              className="truncate text-sm font-bold text-foreground"
              title={code}
            >
              {code}
            </div>
          )}
          {/* Clamped, not truncated to one line: the median display name is 42
              characters and the longest is 227, so one line would cut most of
              them mid-word. Two lines carry the common case whole, `title`
              carries the rest on hover, and the panel has it in full. */}
          {name ? (
            <div className="line-clamp-2 font-bold text-foreground" title={name}>
              {name}
            </div>
          ) : (
            // Rostered, but the view does not name it. Shown as the absence it
            // is — never backfilled with the code above, which would read as a
            // name and hide the gap.
            <div className="text-muted-foreground">—</div>
          )}
          {designation.subUnit && (
            <div className="mt-1 text-sm text-foreground">
              {designation.subUnit}
            </div>
          )}
        </div>
      )
    }

    case 'people': {
      // Primary contacts only. The alternate is who to try when the primary
      // does not answer, which is a second step a reader takes from the panel,
      // not something the table needs to put in front of them on every row.
      const primaries = designation.contacts.filter(
        (contact) => contact.role === 'primary'
      )
      if (primaries.length === 0 && !designation.functionalMailbox) {
        return <span className="text-muted-foreground">—</span>
      }
      return (
        <ul className="space-y-2">
          {designation.functionalMailbox && (
            <li className="min-w-0">
              <div className="text-sm font-medium text-foreground">
                Functional mailbox
              </div>
              <EmailLink
                address={designation.functionalMailbox}
                className="text-sm"
                onClick={stopRowClick}
              />
            </li>
          )}
          {primaries.map((contact) => {
            const telephone = contactTelephone(contact)
            const languages = contact.workingLanguages ?? []
            return (
              <li key={contact.email + contact.name} className="min-w-0">
                <div className="truncate font-medium text-foreground">
                  {contact.name}
                </div>
                {contact.title && (
                  <div className="truncate text-sm text-foreground">
                    {contact.title}
                  </div>
                )}
                <EmailLink
                  address={contact.email}
                  className="text-sm"
                  onClick={stopRowClick}
                />
                {/* The number and the languages share one line: both are how to
                    reach this person, and stacked they cost every contact a
                    line it did not need. The number is shown as the
                    entity typed it and dialled the same way — no reformatting,
                    no country code inferred. With no number, the chips take the
                    line alone; at a narrow column they wrap under it. */}
                {(telephone !== null || languages.length > 0) && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    {telephone !== null && (
                      <a
                        href={`tel:${contact.telephone}`}
                        onClick={stopRowClick}
                        className="inline-flex min-w-0 items-center gap-1.5 text-sm text-un-blue-text hover:underline"
                      >
                        <Phone aria-hidden className="h-3.5 w-3.5 shrink-0" />
                        <span>{telephone}</span>
                      </a>
                    )}
                    {languages.map((language) => (
                      <Chip key={language} density="dense">{language}</Chip>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )
    }

    case 'coverage': {
      const counts = COVERAGE_KINDS.map((kind) => ({
        kind,
        n: designation.coverage.filter((claim) => claim.kind === kind).length,
      })).filter((entry) => entry.n > 0)
      if (counts.length === 0) {
        return <span className="text-muted-foreground">—</span>
      }
      // Counts, not the claims themselves: the claims in full are the panel's
      // job, and seven keywords in a cell would become the row.
      return (
        <ul className="space-y-0.5 text-sm text-foreground">
          {counts.map(({ kind, n }) => (
            <li key={kind}>{coverageKindCount(kind, n)}</li>
          ))}
        </ul>
      )
    }

    case 'detail':
      // The whole row opens the panel; this is the visible affordance for it,
      // so the click is left to bubble rather than carrying its own handler.
      // tabIndex -1 because it is not a second control — the row is reached by
      // the links inside it, and this button would be an empty stop.
      return (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Details"
          className="inline-flex items-center rounded border border-border bg-white p-1 text-muted-foreground transition-colors group-hover:border-un-blue group-hover:text-un-blue-text"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )

    default:
      return null
  }
}

/**
 * A mail link inside a clickable row opens the reader's mail client. Without
 * this the row handler also fires and the panel opens behind it.
 */
function stopRowClick(event: React.MouseEvent<HTMLAnchorElement>) {
  event.stopPropagation()
}

/**
 * Everything a row carries, as one lower-cased string to match substrings in.
 *
 * All of it, not only what the placeholder names: the entity's display name and
 * its code, its class label while the class column is shown — which now means
 * switched on by the reader, not merely permitted by the feature flag — the
 * sub-unit, every contact's name, title, address, telephone number and
 * working languages, the
 * functional mailbox, and every coverage claim of every kind — bodies, agenda
 * items, document symbols and keywords alike. A reader who pastes an address
 * or a document symbol finds the row; the interface simply does not advertise
 * the last three (see the placeholder's note). The class label is searched only
 * while it is rendered, so a search cannot match on a column the page does not
 * show.
 *
 * Case-insensitive substring matching and nothing else. No fuzzy distance, no
 * ranking, no stemming: this is a filter over a few dozen rows, and anything
 * cleverer would start deciding that a near-miss counts as coverage when the
 * entity never claimed it.
 *
 * `filter(Boolean)` drops the absent fields rather than defaulting them — a
 * designation with no functional mailbox contributes no text for one, which is
 * the truth about it.
 */
function searchableText(
  designation: DirectorySummaryDesignation,
  showsEntityClass: boolean
): string {
  return [
    designation.entity.name,
    designation.entity.code,
    showsEntityClass && designation.entity.entityClass !== null
      ? [entityClassLabel(designation.entity.entityClass), entityClassGroupLabel(designation.entity.entityClass)].join(" ")
      : null,
    designation.subUnit,
    designation.functionalMailbox,
    ...designation.contacts.flatMap((contact) => [
      contact.name,
      contact.title,
      contact.email,
      // The number and the extension as two entries rather than the joined
      // string, so that either matches on its own. Matching is a plain
      // substring test over text stored exactly as it was typed, so a reader
      // who pastes a number in a different spacing from the one the entity
      // wrote will not find it. That is the cost of not normalising and it is
      // the right side to err on: the alternative is this page deciding what
      // two numbers are the same number.
      contact.telephone,
      contact.telephoneExtension,
      ...(contact.workingLanguages ?? []),
    ]),
    // The claim as it renders, so a reader searching for the body an
    // entity named itself finds the row. `claim.value` is the word
    // "Other" there, which matches nothing anybody would type.
    ...designation.coverage.map(coverageClaimLabel),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}
