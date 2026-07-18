// Core data types based on the DB schema (mandates.paragraphs)
export interface Paragraph {
  /** UUID from mandates.paragraphs */
  id?: string
  /** 0-based position within the document */
  position?: number
  text: string
  type: string // "title", "paragraph", "heading", etc.
  heading_level: number | null
  paragraph_type: string | null // "preambular", "operative", etc.
  paragraph_level: number | null
  prefix: string | null // "1.", "(a)", "(i)", etc.
  /** Links from mandates.paragraph_links: [linked_symbol, linked_url] pairs */
  links: [string, string][] | []
  mandates?: {
    action_verb: string
    action_verb_normalized?: string
    action_verb_type: string
    assignees: {
      assignee: string
      assignee_normalized: string
      assignee_type: string
    }[]
    mentioned_entities: {
      mentioned_entity: string
      mentioned_entity_normalized: string
      mentioned_entity_type: string
    }[]
    deliverables: {
      deliverable: string
      deliverable_normalized: string
      deliverable_type: string
    }[]
  }[]
  /** NLP highlight annotations (from text_with_highlights column) */
  textWithHighlights?: string
  /** Uncertainty annotations from the extraction pipeline */
  uncertainties?: string
}

export interface Mandate {
  full_document_symbol: string
  num_citations: number
  num_entities: number
  entities: string[]
  /**
   * The subset of `entities` that cite this document in their "Mandates and
   * background" narrative — see lib/foundational.ts. Pair-level: a document can
   * be foundational for UNEP and routine for DESA.
   */
  foundational_entities?: string[]
  link: string | null
  //   priority_area: string
  year: string
  body: string
  //   pillar: string
  //   entity_long: string
  description: string | null
  type: string
  citation_info: {
    origin_document: string
    budget_part: string
    section: string
    section_title: string
    entity_long: string
    entity: string
    programme: number | null
    programme_title: string
    'sub-programme': string | null
    component: string | number | null
    description: string
    part_in_document: string
  }[]
  // Enriched fields (added by API)
  body_long?: string
  displayTitle?: string
  document_symbol: string | null
  uniform_title: string[] | null
  proper_title: string | null
  title: string | null
  subtitle: string | null
  subject_headings: string[]
  issuing_body?: string | null
  agenda_document_symbols?: string[]
  agenda_item_numbers?: string[]
  agenda_item_titles?: string[]
  paragraphs?: Paragraph[] | null
  /**
   * Every place in the budget this document is cited, for the active budget
   * version. Populated by the list query and by the detail page; empty for
   * documents whose only citations are PKM or Plan Outline ones, which sit
   * outside the part structure.
   */
  budget_locations?: BudgetLocation[]
  text?: string

  // Resolution series facts (migration 021; null/absent when not in a series)
  series?: MandateSeriesInfo | null
  // Grouped mode only: this row represents a series and carries its matching co-members
  group?: MandateGroupInfo | null

  // Search-related fields
  searchScore?: number
  highlightedTitle?: string
  highlightedFields?: { [key: string]: string }
  match_details?: Array<{ field: string; value: string }>
}

// Budget hierarchy types
//
// The regular-budget containment is
// Part ⊃ Programme ⊃ Section ⊃ Entity ⊃ Subprogramme, but programme is not a
// level of its own here: every section belongs to exactly one programme, so the
// programme number and title ride along on the section without losing anything.
// (Only two programmes group more than one section — 10 over sections 12–13 and
// 25 over 29A–29F — which just shows the same programme label on sibling
// sections.) PKM and Plan Outline citations sit outside this structure and
// carry no part.

/**
 * One citation's place in the budget, as shown in the Budget location column.
 * The stream is always present; part/section only exist for the ppb stream
 * (pko carries an entity but no part/section, plan_outline neither).
 */
export interface BudgetLocation {
  stream: BudgetStreamType
  part: string | null
  part_title: string | null
  section: string | null
  section_title: string | null
  programme: number | null
  programme_title: string | null
  entity: string | null
  entity_long: string | null
  /** Composed label, e.g. "Subprogramme 2. Inclusive social development" */
  subprogramme: string | null
  subprogramme_number: number | null
  /** pko only: an individual mission (false) vs. the shared support account (true). */
  is_support?: boolean
}

export interface BudgetSubprogrammeNode {
  subprogramme: string
  number: number | null
  count: number
}

export interface BudgetEntityNode {
  entity: string
  entity_long: string | null
  count: number
  subprogrammes: BudgetSubprogrammeNode[]
}

export interface BudgetSectionNode {
  section: string
  section_title: string
  programme: number | null
  programme_title: string | null
  count: number
  entities: BudgetEntityNode[]
}

export interface BudgetPartNode {
  part: string
  part_title: string
  count: number
  sections: BudgetSectionNode[]
}

// Budget streams (top level of the hierarchy) — the budget-document type a
// citation comes from. Every citing entity lives in exactly one stream:
//   ppb          — Proposed Programme Budget: Part → Section → Entity → Subprogramme.
//   pko          — Peacekeeping Operations financing: Missions + Support account.
//   plan_outline — the strategic Plan Outline: no sub-structure (a leaf).
// Which concrete document backs each stream depends on the active budget
// version; the type is stable across versions (see ppb2026.budget_documents.doc_type).
export type BudgetStreamType = 'ppb' | 'pko' | 'plan_outline'

/** One group inside the Peacekeeping Operations stream. */
export interface BudgetPkoGroupNode {
  group: 'missions' | 'support'
  label: string
  count: number
  entities: BudgetEntityNode[]
}

export type BudgetStream =
  | { type: 'ppb'; label: string; count: number; parts: BudgetPartNode[] }
  | { type: 'pko'; label: string; count: number; groups: BudgetPkoGroupNode[] }
  | { type: 'plan_outline'; label: string; count: number }

// Entity types
export interface Entity {
  entity: string
  entity_long: string
}

export interface EntityWithCount {
  entity: string
  entity_long: string
  count: number
}

// Organ types
export interface Organ {
  short: string
  long: string
  website?: string
}

export interface OrganWithCount {
  short: string
  long: string
  count: number
}

// Filter types
export interface MandateSeriesInfo {
  superseded_by: string | null
  is_collection: boolean
  has_newer: boolean
  is_latest: boolean
  series_count: number
}

export interface MandateGroupInfo {
  /** number of documents in this group matching the current filters */
  size: number
  min_year: number | null
  max_year: number | null
  /** matching co-members (representative excluded), newest first, capped at 100 */
  members: { symbol: string; year: number | null; title: string | null }[]
}

export interface FilterOptions {
  entity?: string
  organ?: string
  crossCitingEntity?: string
  keyword?: string
  /** Budget part, as a roman numeral ("IV"). */
  budget_part?: string
  /** Budget section, as printed ("9", "29A"). */
  section?: string
  /** Composed subprogramme label ("Subprogramme 2. Inclusive social development"). */
  subprogramme?: string
  /** "true" to keep only foundational citations (see lib/foundational.ts). */
  foundational?: string
  /**
   * Superseded by `section` — every section has exactly one programme. Kept so
   * that existing ?programme= links keep working.
   */
  programme?: string
  subject?: string
  start_year?: string
  end_year?: string
  budget_document?: string
  document_type?: string
  agenda_item?: string
  full_document_symbol?: string
  min_citations?: string
  max_citations?: string
  mode?: 'active_mandates' | 'all_resolutions'
  ppb_version?: string
  /** '1' collapses the list to one row per resolution series (group versions) */
  group?: string
  sort_by?: string
  page?: string
  limit?: string
}

// Cross-citation types
export interface CrossCitation {
  entity: string
  entity_long: string
  count: number
}

// Citation distribution types
export interface CitationBin {
  bin: string
  count: number
  minCitations: number
  maxCitations: number
}

// API Response types
export interface ApiResponse {
  // Paginated mandate results
  mandates: Mandate[]
  pagination: {
    page: number
    limit: number
    totalPages: number
    totalItems: number
  }

  // Data for cards
  counts: {
    totalDocuments: number
    totalEntities: number
    totalOrgans: number
    totalCitations: number
  }

  // Sidebar data (already filtered)
  sidebar: {
    entities: EntityWithCount[]
    organs: OrganWithCount[]
    crossCitations: CrossCitation[]
    citationDistribution: CitationBin[]
  }

  // Filter options for dropdowns
  filterOptions: {
    budgetHierarchy: BudgetStream[]
    programmes: { value: string; count: number }[]
    subjects: { value: string; count: number }[]
    documentTypes: { value: string; count: number }[]
    agendaItems: { value: string; count: number }[]
    yearRange: { min: number; max: number }
    yearDistribution: Record<string, number>
    yearDistributionUnfiltered: Record<string, number>
    budgetVersions: {
      slug: string
      display_name: string
      ppb_year: number
      is_default: boolean
      sort_order: number
    }[]
  }

  // Reference data for display
  reference: {
    entities: Entity[]
    organs: Organ[]
  }
}
