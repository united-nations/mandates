'use client'

import { DocumentsDirectory } from '@/components/DocumentsDirectory'
import { EntitiesDirectory } from '@/components/EntitiesDirectory'
import { OrgansDirectory } from '@/components/OrgansDirectory'
import type { FilterOptions } from '@/types'

import { CitedPanel } from './cited-panel'
import { DirectoryDialog } from './controls'
import { PanelStatus } from './panel-status'
import type { DirectoryData, DirectoryPanel, PanelActions } from './types'

interface DirectoryPanelsProps {
  actions: PanelActions
  activeVersionSlug: string
  allDocumentsCount: number
  citedDocumentCount: number
  citedPredicate: string
  data: DirectoryData | null
  error: string | null
  filters: FilterOptions
  loading: boolean
  panel: DirectoryPanel | null
  versions: { slug: string; ppb_year: number; display_name: string }[]
}

const status = (props: DirectoryPanelsProps, children: React.ReactNode) => (
  <PanelStatus loading={props.loading} error={props.error}>
    {children}
  </PanelStatus>
)

const OrganDialog = (props: DirectoryPanelsProps) => (
  <DirectoryDialog
    open={props.panel === 'organs'}
    onClose={props.actions.close}
    title="Sources of mandates"
    hint="Click an organ to add it to the filters below."
  >
    {status(
      props,
      <OrgansDirectory
        groups={props.data?.organGroups ?? []}
        selection={props.actions.selection}
      />
    )}
  </DirectoryDialog>
)

const CatalogueDialog = (props: DirectoryPanelsProps) => (
  <DirectoryDialog
    open={props.panel === 'catalogue'}
    onClose={props.actions.close}
    title="Documents adopted"
    hint={`The ${(props.filters.cited === '1'
      ? props.citedDocumentCount
      : props.allDocumentsCount
    ).toLocaleString()} documents matching the current filters — resolutions, decisions and presidential statements of the General Assembly, Security Council, ECOSOC and Human Rights Council, plus anything else the budget cites. Every count below is under those same filters, so picking a type or topic narrows the table to exactly that number.`}
  >
    {status(
      props,
      <DocumentsDirectory
        domains={props.data?.subjectDomains ?? []}
        documentTypes={props.data?.documentTypes ?? emptyDocumentTypes}
        selection={props.actions.selection}
      />
    )}
  </DirectoryDialog>
)

const emptyDocumentTypes = { types: [], totalCount: 0, untypedCount: 0 }

const CitedDialog = (props: DirectoryPanelsProps) => (
  <DirectoryDialog
    open={props.panel === 'cited'}
    onClose={props.actions.close}
    title={`Documents ${props.citedPredicate}`}
    hint="Choose which budget the citation data comes from, narrow the table to the documents it cites, or go to one place in it."
  >
    <CitedPanel {...props} />
  </DirectoryDialog>
)

const EntityDialog = (props: DirectoryPanelsProps) => (
  <DirectoryDialog
    open={props.panel === 'entities'}
    onClose={props.actions.close}
    title="Entities citing mandates"
    hint="Click an entity to show the mandates it cites in the budget."
  >
    {status(
      props,
      <EntitiesDirectory
        streams={props.data?.budgetStreams ?? []}
        selection={props.actions.selection}
      />
    )}
  </DirectoryDialog>
)

/** Renders the four dialogs while their expensive payload loads on demand. */
export const DirectoryPanels = (props: DirectoryPanelsProps) => (
  <>
    <OrganDialog {...props} />
    <CatalogueDialog {...props} />
    <CitedDialog {...props} />
    <EntityDialog {...props} />
  </>
)
