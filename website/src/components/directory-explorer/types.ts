/** Shared types for the lazy Secretariat directory explorer. */

import type { ExploreCardStates } from '@/lib/explore-card-state'
import type { BudgetTreeLevel } from '@/components/table/BudgetStreamTree'
import type {
  BudgetStream,
  DirectorySelection,
  DocumentTypeCatalogue,
  OrganGroup,
  SubjectDomain,
} from '@/types'

export type DirectoryPanel = 'organs' | 'catalogue' | 'cited' | 'entities'

export interface DirectoryData {
  organGroups: OrganGroup[]
  budgetStreams: BudgetStream[]
  subjectDomains: SubjectDomain[]
  documentTypes: DocumentTypeCatalogue
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
