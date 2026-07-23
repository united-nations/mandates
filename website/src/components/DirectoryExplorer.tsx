'use client'

import { useMemo, useState } from 'react'
import { Building, ChevronRight, Landmark, LucideIcon, Tag } from 'lucide-react'

import { EntitiesDirectory } from '@/components/EntitiesDirectory'
import { OrgansDirectory } from '@/components/OrgansDirectory'
import { SubjectsCompact } from '@/components/SubjectsCompact'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DirectorySelectContext } from '@/contexts/DirectorySelectContext'
import { cn } from '@/lib/utils'
import type { BudgetStream, OrganGroup, SubjectDomain } from '@/types'

type Panel = 'organs' | 'entities' | 'topics'

interface DirectoryExplorerProps {
  organGroups: OrganGroup[]
  budgetStreams: BudgetStream[]
  subjectDomains: SubjectDomain[]
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
 * The three entry points at the top of the mandate explorer. Each box doubles
 * as a stat card (a catalogue count) and a gateway: clicking it opens a modal
 * with the full organ / entity / topic directory. Selecting a facet inside the
 * modal filters the table below and closes the modal (wired through
 * {@link DirectorySelectContext}).
 */
export function DirectoryExplorer({
  organGroups,
  budgetStreams,
  subjectDomains,
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
        icon={Landmark}
        count={organCount}
        noun="organs"
        label="Explore the organs that create mandates"
        onClick={() => setPanel('organs')}
      />
      <ExploreButton
        icon={Building}
        count={entityCount}
        noun="entities"
        label="Explore the entities that implement mandates"
        onClick={() => setPanel('entities')}
      />
      <ExploreButton
        icon={Tag}
        count={documentCount}
        noun="documents"
        label="Explore the topics that they are about"
        onClick={() => setPanel('topics')}
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
        open={panel === 'topics'}
        onClose={close}
        title="Topics of the documents"
        hint="Click a topic to filter the mandates about it."
      >
        <SubjectsCompact domains={subjectDomains} />
      </DirectoryDialog>
    </div>
  )
}

function ExploreButton({
  icon: Icon,
  count,
  noun,
  label,
  onClick,
}: {
  icon: LucideIcon
  count: number
  noun: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-4 rounded-xl border border-un-blue/20 bg-un-blue/5 px-5 py-4 text-left transition-colors hover:border-un-blue/50 hover:bg-un-blue/10 focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:outline-none"
    >
      <Icon className="size-6 shrink-0 text-un-blue" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl leading-none font-bold text-foreground tabular-nums">
            {count.toLocaleString()}
          </span>
          <span className="text-sm font-medium text-un-blue">{noun}</span>
        </div>
        <div className="mt-1 text-sm leading-snug text-un-blue">{label}</div>
      </div>
      <ChevronRight className="size-5 shrink-0 text-un-blue/40 transition-transform group-hover:translate-x-0.5 group-hover:text-un-blue" />
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
