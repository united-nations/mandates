'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
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
  type DirectorySummaryDesignation,
} from '@/lib/focal-point-constants'
import {
  DIRECTORY_SUMMARY_COLUMNS,
  directorySummaryMinWidth,
} from './DirectorySummaryColumns'
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

  const columns = DIRECTORY_SUMMARY_COLUMNS

  const openDesignation = (designation: DirectorySummaryDesignation) => {
    setShown(designation)
    setOpen(true)
  }

  return (
    <div>
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
            {designations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  No focal point designations are currently listed.
                </TableCell>
              </TableRow>
            ) : (
              designations.map((designation) => (
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
      const { code, name } = designation.office
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
