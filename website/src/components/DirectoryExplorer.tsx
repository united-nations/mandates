'use client'

import { CardGrid } from './directory-explorer/card-grid'
import { DirectoryPanels } from './directory-explorer/panels'
import type { DirectoryExplorerProps } from './directory-explorer/types'
import { useExplorerActions } from './directory-explorer/use-explorer-actions'

const versionContext = (props: DirectoryExplorerProps) => {
  const active = props.versions.find(
    (version) => version.slug === props.activeVersionSlug
  )
  const latest = Math.max(...props.versions.map((version) => version.ppb_year))
  const predicate =
    active && active.ppb_year !== latest
      ? `cited as mandates in the UN Programme Budget ${active.ppb_year}`
      : 'cited as mandates'
  return { active, predicate }
}

/** Renders summary cards immediately and fetches directories on first open. */
export function DirectoryExplorer(props: DirectoryExplorerProps) {
  const state = useExplorerActions(props.activeVersionSlug)
  const version = versionContext(props)
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <CardGrid
        cardStates={props.cardStates}
        cycleYear={version.active?.ppb_year}
        openPanel={state.openPanel}
      />
      <DirectoryPanels
        {...props}
        actions={state.actions}
        choice={state.choice}
        citedPredicate={version.predicate}
        data={state.data}
        filters={state.filters}
        panel={state.panel}
        progress={state.progress}
      />
    </div>
  )
}
