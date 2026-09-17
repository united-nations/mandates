'use client'

import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { SearchInput } from '@/components/SearchInput'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { typography } from '@/lib/typography'
import {
  COVERAGE_KINDS,
  coverageKindCount,
  entityClassLabel,
  type DirectorySummaryDesignation,
} from '@/lib/focal-point-constants'
import {
  directorySummaryMinWidth,
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
  'sticky right-0 z-10 border-l border-gray-200 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.18)]'

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

  // Whether the class label is part of what a search looks at. It follows the
  // COLUMN rather than the feature flag now that the column can be switched
  // off: a search that matched on a class nobody can see would return a row
  // with no visible reason for being there.
  const showsEntityClass = columns.some(
    (column) => column.id === 'entity_class'
  )

  // Each row's searchable text, built once per data change rather than on every
  // keystroke. Rebuilt when the class column is switched, which is rare.
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

  return (
    <div>
      {/* One toolbar row: the search on the left where reading starts, the
          column control on the right, hard against the table's right edge where
          the popover opens without overhanging the page margin. They wrap onto
          two rows on a narrow viewport rather than the search shrinking. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* The magnifier-and-underline treatment, not a box: `border-bottom` is
            what every other search field in this app uses (the sidebars, the
            column filter popovers, the budget tree), and it is the same
            treatment the focal points application itself uses. */}
        {/* Grows into the free space and stops at the old max-w-sm, so the
            search keeps the width it had and the picker stays hard right. Not
            w-full: in a wrapping flex row that is a 100% basis, and it would
            push the picker onto a second row at every viewport. */}
        <div className="min-w-0 max-w-sm flex-1 basis-64">
          <SearchInput
            variant="border-bottom"
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

      <div className="overflow-hidden rounded-lg border border-gray-200">
        {/* Fixed layout, so the declared column widths bind instead of being
            recomputed from whatever the rows happen to contain. Coverage is the
            only column without an exact width, which is how the surplus reaches
            it and nothing else. */}
        <Table
          className="table-fixed"
          style={{ minWidth: directorySummaryMinWidth(columns) }}
        >
          <TableHeader>
            <TableRow className="border-b bg-gray-50 hover:bg-gray-50">
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  style={
                    column.flexible ? undefined : { width: column.width }
                  }
                  className={`${ALIGN_CLASS[column.align ?? 'left']} ${
                    column.id === 'detail'
                      ? `${STICKY_DETAIL_CELL} bg-gray-50`
                      : ''
                  } h-10 px-3 ${typography.tableHeader}`}
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
          <TableBody>
            {visible.length === 0 ? (
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
            ) : (
              visible.map((designation) => (
                <TableRow
                  key={designation.id}
                  className="group cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                  onClick={() => openDesignation(designation)}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={`${ALIGN_CLASS[column.align ?? 'left']} ${
                        column.id === 'detail'
                          ? `${STICKY_DETAIL_CELL} bg-white group-hover:bg-gray-50`
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
              ))
            )}
          </TableBody>
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
          {/* Clamped, not truncated to one line: the median display name is 42
              characters and the longest is 227, so one line would cut most of
              them mid-word. Two lines carry the common case whole, `title`
              carries the rest on hover, and the panel has it in full. */}
          {name ? (
            <div className="line-clamp-2 text-foreground" title={name}>
              {name}
            </div>
          ) : (
            // Rostered, but the view does not name it. Shown as the absence it
            // is — never backfilled with the code below, which would read as a
            // name and hide the gap.
            <div className="text-muted-foreground">—</div>
          )}
          {code && (
            <div className="truncate text-xs text-muted-foreground" title={code}>
              {code}
            </div>
          )}
        </div>
      )
    }

    case 'entity_class': {
      // The label where one is known, the stored value where not. No class is
      // the same absence as no name above it: a dash, not the code and not a
      // stand-in class.
      const { entityClass } = designation.entity
      return entityClass === null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className="text-xs text-muted-foreground">
          {entityClassLabel(entityClass)}
        </span>
      )
    }

    case 'sub_unit':
      return <span className="text-foreground">{designation.subUnit}</span>

    case 'people':
      if (designation.contacts.length === 0) {
        return <span className="text-muted-foreground">—</span>
      }
      return (
        <ul className="space-y-2">
          {designation.contacts.map((contact) => (
            <li key={contact.email + contact.name} className="min-w-0">
              <div className="truncate font-medium text-foreground">
                {contact.name}
                {contact.role === 'alternate' && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    (alternate)
                  </span>
                )}
              </div>
              {contact.title && (
                <div className="truncate text-xs text-muted-foreground">
                  {contact.title}
                </div>
              )}
              <EmailLink
                address={contact.email}
                className="text-xs"
                onClick={stopRowClick}
              />
            </li>
          ))}
        </ul>
      )

    case 'functional_mailbox':
      return designation.functionalMailbox ? (
        <EmailLink
          address={designation.functionalMailbox}
          className="text-xs"
          onClick={stopRowClick}
        />
      ) : (
        <span className="text-muted-foreground">—</span>
      )

    case 'languages': {
      // One row per person would repeat the name; the set is what the column
      // answers ("can this designation take a query in French?").
      const languages = [
        ...new Set(
          designation.contacts.flatMap(
            (contact) => contact.workingLanguages ?? []
          )
        ),
      ]
      if (languages.length === 0) {
        return <span className="text-muted-foreground">—</span>
      }
      return <span className="text-foreground">{languages.join(', ')}</span>
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
        <ul className="space-y-0.5 text-xs text-muted-foreground">
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
          className="inline-flex items-center rounded border border-gray-200 bg-white p-1 text-muted-foreground transition-colors group-hover:border-un-blue group-hover:text-un-blue"
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
 * sub-unit, every contact's name, title, address and working languages, the
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
      ? entityClassLabel(designation.entity.entityClass)
      : null,
    designation.subUnit,
    designation.functionalMailbox,
    ...designation.contacts.flatMap((contact) => [
      contact.name,
      contact.title,
      contact.email,
      ...(contact.workingLanguages ?? []),
    ]),
    ...designation.coverage.map((claim) => claim.value),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}
