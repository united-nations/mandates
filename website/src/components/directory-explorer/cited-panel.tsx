'use client'

import { BudgetStreamTree } from '@/components/table/BudgetStreamTree'
import type { FilterOptions } from '@/types'

import { PanelHeading, ScopeButton } from './controls'
import { PanelStatus } from './panel-status'
import type { DirectoryData, PanelActions } from './types'

interface CitedPanelProps {
  actions: PanelActions
  activeVersionSlug: string
  allDocumentsCount: number
  citedDocumentCount: number
  citedPredicate: string
  data: DirectoryData | null
  error: string | null
  filters: FilterOptions
  loading: boolean
  versions: { slug: string; ppb_year: number; display_name: string }[]
}

const VersionChoices = (props: CitedPanelProps) => (
  <section className="space-y-3">
    <PanelHeading>Budget version</PanelHeading>
    <div className="flex flex-wrap gap-2">
      {props.versions.map((version) => (
        <ScopeButton
          key={version.slug}
          label={`PPB ${version.ppb_year}`}
          detail={version.display_name}
          selected={props.activeVersionSlug === version.slug}
          onClick={() => props.actions.setVersion(version.slug)}
        />
      ))}
    </div>
    <p className="text-xs text-gray-500">
      The whole document catalogue stays in the table either way. The budget you
      pick here supplies the citation counts, the citing entities and the budget
      locations shown against each document.
    </p>
  </section>
)

const ScopeChoices = (props: CitedPanelProps) => (
  <section className="space-y-3">
    <PanelHeading>Scope</PanelHeading>
    <div className="flex flex-wrap gap-2">
      <ScopeButton
        label="All documents"
        detail={`${props.allDocumentsCount.toLocaleString()} documents`}
        selected={props.filters.cited !== '1'}
        onClick={() => props.actions.setCited(false)}
      />
      <ScopeButton
        label="Cited only"
        detail={`${props.citedDocumentCount.toLocaleString()} documents ${props.citedPredicate}`}
        selected={props.filters.cited === '1'}
        onClick={() => props.actions.setCited(true)}
      />
    </div>
  </section>
)

const BudgetLocations = (props: CitedPanelProps) => (
  <section className="space-y-3">
    <PanelHeading>Budget location</PanelHeading>
    <PanelStatus loading={props.loading} error={props.error}>
      {props.data?.budgetStreams.length ? (
        <BudgetStreamTree
          hierarchy={props.data.budgetStreams}
          active={{
            stream: props.filters.budget_document,
            part: props.filters.budget_part,
            section: props.filters.section,
            entity: props.filters.entity,
            subprogramme: props.filters.subprogramme,
          }}
          onSelect={props.actions.selectBudgetLocation}
        />
      ) : (
        <p className="text-sm text-gray-500">
          No budget locations for the current filters.
        </p>
      )}
    </PanelStatus>
    <p className="text-xs text-gray-500">
      Counts are documents cited at that point of{' '}
      {props.versions.find((item) => item.slug === props.activeVersionSlug)
        ?.display_name ?? 'the budget'}
      . Picking one narrows the table to those documents.
    </p>
  </section>
)

/** Renders cited scope controls immediately and lazy budget locations below. */
export const CitedPanel = (props: CitedPanelProps) => (
  <div className="space-y-6">
    <VersionChoices {...props} />
    <ScopeChoices {...props} />
    <BudgetLocations {...props} />
  </div>
)
