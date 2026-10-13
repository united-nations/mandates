/** Shared types for the lazy Secretariat directory explorer. */

import type { ExploreCardStates } from '@/lib/explore-card-state'
import type { BudgetTreeLevel } from '@/components/table/BudgetStreamTree'
import type { DirectoryPanel } from '@/lib/directory-request'
import type {
  BudgetStream,
  DirectorySelection,
  DocumentTypeCatalogue,
  OrganGroup,
  SubjectDomain,
} from '@/types'

export type { DirectoryPanel } from '@/lib/directory-request'

export interface DirectoryData {
  organGroups?: OrganGroup[]
  budgetStreams?: BudgetStream[]
  subjectDomains?: SubjectDomain[]
  documentTypes?: DocumentTypeCatalogue
}

export interface DirectoryExplorerProps {
  cardStates: ExploreCardStates
  allDocumentsCount: number
  citedDocumentCount: number
  versions: { slug: string; ppb_year: number; display_name: string }[]
  activeVersionSlug: string
}

export interface CardGridProps {
  cardStates: ExploreCardStates
  cycleYear?: number
  openPanel: (panel: DirectoryPanel) => void
}

export interface PanelActions {
  close: () => void
  selectBudgetLocation: (level: BudgetTreeLevel, value: string) => void
  selection: DirectorySelection
  setCited: (cited: boolean) => void
  setVersion: (slug: string) => void
}

/**
 * What the reader has asked for, which is ahead of `filters` while the
 * navigation that applies it is still in flight. The controls read from this
 * so a click registers at once; anything showing a FIGURE reads from the
 * server-rendered props, which are still the previous selection's.
 */
export interface PanelChoice {
  cited: boolean
  version: string
}

export type { PanelProgress } from '@/lib/directory-panel-view'
