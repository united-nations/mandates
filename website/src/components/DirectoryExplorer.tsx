'use client'

import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'

import { DocumentsDirectory } from '@/components/DocumentsDirectory'
import { EntitiesDirectory } from '@/components/EntitiesDirectory'
import { OrgansDirectory } from '@/components/OrgansDirectory'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DirectorySelectContext } from '@/contexts/DirectorySelectContext'
import { cn } from '@/lib/utils'
import type {
  BudgetStream,
  DocumentTypeCatalogue,
  OrganGroup,
  SubjectDomain,
} from '@/types'

type Panel = 'organs' | 'entities' | 'documents'

interface DirectoryExplorerProps {
  organGroups: OrganGroup[]
  budgetStreams: BudgetStream[]
  subjectDomains: SubjectDomain[]
  documentTypes: DocumentTypeCatalogue
  documentCount: number
}

// Neutralises the shadcn dialog's directional slide-in so the modal grows from
// the centre (a plain zoom + fade) instead of flying in from the top-left.
const CENTER_MODAL_STYLE = {
  '--tw-enter-translate-x': '0px',
  '--tw-enter-translate-y': '0px',
  '--tw-exit-translate-x': '0px',
  '--tw-exit-translate-y': '0px',
} as React.CSSProperties

/**
 * The three entry points at the top of the mandate explorer. Each box states one
 * fact about the catalogue as a sentence — "23 organs creating mandates" — and
 * doubles as a gateway: clicking it opens a modal with the full organ / entity /
 * document directory. Selecting a facet inside the modal filters the table below
 * and closes the modal (wired through {@link DirectorySelectContext}).
 *
 * Styling follows the UN Transparency Portal: a white tile with a grey border,
 * un-blue used only as an accent on hover, shadow on hover only, everything
 * left-aligned. No leading icons — the number is the anchor.
 */
export function DirectoryExplorer({
  organGroups,
  budgetStreams,
  subjectDomains,
  documentTypes,
  documentCount,
}: DirectoryExplorerProps) {
  const [panel, setPanel] = useState<Panel | null>(null)
  const close = () => setPanel(null)

  const organCount = useMemo(
    () => organGroups.reduce((n, g) => n + g.organs.length, 0),
    [organGroups]
  )
  const entityCount = useMemo(
    () => countEntities(budgetStreams),
    [budgetStreams]
  )

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <ExploreButton
        count={organCount}
        noun="organs"
        predicate="creating mandates"
        onClick={() => setPanel('organs')}
      />
      <ExploreButton
        count={entityCount}
        noun="entities"
        predicate="implementing mandates"
        onClick={() => setPanel('entities')}
      />
      <ExploreButton
        count={documentCount}
        noun="documents"
        predicate="containing mandates"
        onClick={() => setPanel('documents')}
      />

      <DirectoryDialog
        open={panel === 'organs'}
        onClose={close}
        title="Organs creating mandates"
        hint="Click an organ to filter the mandates it creates."
      >
        <OrgansDirectory groups={organGroups} />
      </DirectoryDialog>

      <DirectoryDialog
        open={panel === 'entities'}
        onClose={close}
        title="Entities implementing mandates"
        hint="Click an entity to filter the mandates it implements."
      >
        <EntitiesDirectory streams={budgetStreams} />
      </DirectoryDialog>

      <DirectoryDialog
        open={panel === 'documents'}
        onClose={close}
        title="Documents containing mandates"
        hint="Click a document type or a topic to filter the mandates below."
      >
        <DocumentsDirectory
          domains={subjectDomains}
          documentTypes={documentTypes}
        />
      </DirectoryDialog>
    </div>
  )
}

function ExploreButton({
  count,
  noun,
  predicate,
  onClick,
}: {
  count: number
  noun: string
  predicate: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-5 py-4 text-left transition-all hover:border-un-blue hover:shadow-md focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:outline-none"
    >
      <span className="min-w-0 flex-1">
        {/* The sentence, broken so the count and its noun carry the weight and
            the verb phrase sits under them as the quiet half. */}
        <span className="block leading-none">
          <span className="text-3xl font-bold text-gray-900 tabular-nums">
            {count.toLocaleString()}
          </span>{' '}
          <span className="text-base font-semibold text-gray-900">{noun}</span>
        </span>
        <span className="mt-1.5 block text-sm text-gray-600">{predicate}</span>
      </span>
      <ChevronRight
        aria-hidden
        className="size-5 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-un-blue"
      />
    </button>
  )
}

function DirectoryDialog({
  open,
  onClose,
  title,
  hint,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        style={CENTER_MODAL_STYLE}
        className={cn(
          'flex max-h-[88vh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-3 overflow-hidden p-4',
          'sm:w-[calc(100vw-4rem)] sm:p-6'
        )}
      >
        <DialogHeader className="text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{hint}</DialogDescription>
        </DialogHeader>
        <DirectorySelectContext.Provider value={{ onSelect: onClose }}>
          <div className="-mr-1 min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1">
            {children}
          </div>
        </DirectorySelectContext.Provider>
      </DialogContent>
    </Dialog>
  )
}

function countEntities(streams: BudgetStream[]): number {
  const seen = new Set<string>()
  for (const stream of streams) {
    if (stream.type === 'ppb') {
      for (const part of stream.parts)
        for (const section of part.sections)
          for (const e of section.entities) seen.add(e.entity)
    } else if (stream.type === 'pko') {
      for (const group of stream.groups)
        for (const e of group.entities) seen.add(e.entity)
    }
  }
  return seen.size
}
