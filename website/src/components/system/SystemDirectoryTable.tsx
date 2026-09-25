'use client'

import { useMemo, useRef, useState } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { SearchInput } from '@/components/SearchInput'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  documentRegistryLinks,
  filterSystemDirectory,
  SYSTEM_DIRECTORY_GROUPS,
  type SystemDirectoryEntity,
} from '@/lib/system-directory'
import { SystemEntityPanel } from './SystemEntityPanel'

const COLUMNS = [
  'Entity',
  'Governing bodies',
  'Focal point',
  'Document registry',
  'Mandate registry',
  'Finance',
  'Plans / results',
  'Interoperability',
]

const DETAIL_CELL =
  'sticky right-0 z-10 border-l border-border shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.18)]'

function Available({ label }: { label: string }) {
  return (
    <span className="inline-flex text-un-blue-text" title={label}>
      <Check aria-hidden className="h-4 w-4" />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function SystemDirectoryTable({
  entities,
  focalPointsAvailable,
}: {
  entities: SystemDirectoryEntity[]
  focalPointsAvailable: boolean
}) {
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState<SystemDirectoryEntity | null>(null)
  const [open, setOpen] = useState(false)
  const opener = useRef<HTMLButtonElement | null>(null)
  const visible = useMemo(
    () => filterSystemDirectory(entities, query),
    [entities, query]
  )
  const groups = SYSTEM_DIRECTORY_GROUPS.map((group) => ({
    ...group,
    entities: visible.filter((entity) => entity.group === group.id),
  })).filter(
    (group) =>
      group.entities.length > 0 ||
      (group.id === 'related-organization' &&
        visible.some((entity) => entity.group === 'conventions'))
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-sm min-w-0 flex-1 basis-64">
          <SearchInput
            variant="border-bottom"
            aria-label="Search entities, contacts and coverage"
            placeholder="Search entities, contacts and coverage"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            showClearButton
            onClear={() => setQuery('')}
          />
        </div>
        <p className="text-sm text-muted-foreground" role="status">
          {visible.length} of {entities.length} entities
        </p>
      </div>
      {!focalPointsAvailable && (
        <p role="status" className="mb-4 text-sm text-muted-foreground">
          Focal-point information is temporarily unavailable. Entity and
          resource information is still shown.
        </p>
      )}
      <div className="rounded-lg border border-border bg-white">
        <Table
          className="min-w-[920px] table-fixed"
          aria-describedby="system-directory-legend"
        >
          <caption className="sr-only">
            UN system entities, grouped by category. Select an entity for
            governing bodies, contacts and resources.
          </caption>
          <colgroup>
            <col className="w-[24%]" />
            {COLUMNS.slice(1).map((column) => (
              <col key={column} />
            ))}
            <col className="w-10" />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {COLUMNS.map((column, index) => (
                <TableHead
                  key={column}
                  scope="col"
                  className={`px-3 py-3 text-xs ${index ? 'text-center' : 'sticky left-0 z-10 bg-white text-left'}`}
                >
                  {column}
                </TableHead>
              ))}
              <TableHead
                scope="col"
                className={`${DETAIL_CELL} bg-white px-1.5 text-center`}
              >
                <span className="sr-only">Details</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          {groups.length === 0 ? (
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={COLUMNS.length + 1}
                  className="py-10 text-center text-muted-foreground"
                >
                  No matching entities.
                </TableCell>
              </TableRow>
            </TableBody>
          ) : (
            groups.map((group) => (
              <TableBody key={group.id}>
                {/* The Secretariat's own row is the parent; avoid a duplicate heading. */}
                {group.id !== 'secretariat' && (
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <th
                      scope="rowgroup"
                      colSpan={COLUMNS.length + 1}
                      className={`py-1 text-left text-sm font-semibold ${group.depth ? 'pr-3 pl-7' : 'px-3'}`}
                    >
                      {group.label}
                    </th>
                  </TableRow>
                )}
                {group.entities.map((entity) => (
                  <TableRow
                    key={entity.code}
                    data-entity-code={entity.code}
                    className="group cursor-pointer hover:bg-muted"
                    onClick={(event) => {
                      opener.current =
                        event.currentTarget.querySelector('button')
                      setShown(entity)
                      setOpen(true)
                    }}
                  >
                    <th
                      scope="row"
                      className={`sticky left-0 z-10 bg-white py-1 pr-3 text-left text-sm group-hover:bg-muted ${group.depth ? 'pl-7' : 'pl-3'}`}
                    >
                      <span title={entity.name ?? entity.code}>
                        {entity.code}
                      </span>
                    </th>
                    <TableCell className="px-3 py-1 text-center">
                      {entity.governingBodies !== null ? (
                        <span title="Number of listed governing bodies">
                          {entity.governingBodies.length}
                        </span>
                      ) : (
                        <span className="sr-only">Not yet populated</span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-1 text-center">
                      {focalPointsAvailable &&
                      entity.designations.length > 0 ? (
                        <Available
                          label={`${entity.designations.length} publicly listed focal-point designation${entity.designations.length === 1 ? '' : 's'}`}
                        />
                      ) : (
                        <span className="sr-only">
                          {focalPointsAvailable
                            ? 'No publicly listed designation'
                            : 'Temporarily unavailable'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-1 text-center">
                      {documentRegistryLinks(entity).length > 0 ? (
                        <Available
                          label={documentRegistryLinks(entity)
                            .map((registry) => registry.name)
                            .join('; ')}
                        />
                      ) : (
                        <span className="sr-only">No registry listed</span>
                      )}
                    </TableCell>
                    {COLUMNS.slice(4).map((column) => (
                      <TableCell key={column} className="px-3 py-1">
                        <span className="sr-only">Not yet populated</span>
                      </TableCell>
                    ))}
                    <TableCell
                      className={`${DETAIL_CELL} bg-white px-1.5 py-1 text-center group-hover:bg-muted`}
                    >
                      <button
                        type="button"
                        aria-label={`View ${entity.code} details`}
                        aria-haspopup="dialog"
                        className="inline-flex items-center rounded border border-border bg-white p-1 text-muted-foreground transition-colors group-hover:border-un-blue group-hover:text-un-blue-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-un-blue-text"
                      >
                        <ChevronRight aria-hidden className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            ))
          )}
        </Table>
      </div>
      <p
        id="system-directory-legend"
        className="mt-3 text-xs leading-relaxed text-muted-foreground"
      >
        Checks indicate a publicly listed focal-point designation or an existing
        document-registry link. Governing-body counts reflect the bodies listed
        here. Blank cells do not establish absence. Mandate registry, finance,
        plans/results and interoperability are not yet populated.
      </p>
      <SystemEntityPanel
        entity={shown}
        open={open}
        focalPointsAvailable={focalPointsAvailable}
        onOpenChange={setOpen}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          opener.current?.focus()
        }}
      />
    </div>
  )
}
