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
  programme?: string
  text?: string

  // Search-related fields
  searchScore?: number
  highlightedTitle?: string
  highlightedFields?: { [key: string]: string }
  match_details?: Array<{ field: string; value: string }>
}

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
export interface FilterOptions {
  entity?: string
  organ?: string
  crossCitingEntity?: string
  keyword?: string
  programme?: string
  subject?: string
  start_year?: string
  end_year?: string
  budget_document?: string
  document_type?: string
  agenda_item?: string
  full_document_symbol?: string
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
  }

  // Filter options for dropdowns
  filterOptions: {
    programmes: { value: string; count: number }[]
    subjects: { value: string; count: number }[]
    documentTypes: { value: string; count: number }[]
    agendaItems: { value: string; count: number }[]
    yearRange: { min: number; max: number }
    yearDistribution: Record<string, number>
    budgetDocuments: {
      slug: string
      display_name: string
      match_pattern: string
      sort_order: number
    }[]
  }

  // Reference data for display
  reference: {
    entities: Entity[]
    organs: Organ[]
  }
}
