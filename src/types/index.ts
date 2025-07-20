// Core data types based on the JSON structure
export interface OperativeParagraph {
  paragraph_idx: number;
  subparagraph_idx: number;
  paragraph_text: string;
  subparagraph_text: string;
  is_operative: boolean;
  normalized_keywords: string;
  is_definite_keyword: boolean;
  is_definite: boolean;
  has_deliverable: boolean;
  deliverable_type: string;
  has_assignee: boolean;
  assignee: string;
  contains_within_existing_resources: boolean;
}

export interface CitationInfo {
  origin_document: string;
  budget_part: string;
  section: string;
  section_title: string;
  entity_long: string;
  entity: string;
  programme: number | null;
  programme_title: string;
  'sub-programme': string | null;
  component: any | null;
  description: string;
  part_in_document: string;
}

export interface Mandate {
  full_document_symbol: string;
  num_citations: number;
  num_entities: number;
  entities: string[];
  link: string | null;
  priority_area: string;
  year: string;
  body: string;
  pillar: string;
  entity_long: string;
  description: string | null;
  type: string;
  citation_info: CitationInfo[];
  // Enriched fields (added by API)
  body_long?: string;
  displayTitle?: string;
  document_symbol: string | null;
  classification_code: string[] | null;
  classification: string[] | null;
  doc_type_code: string[] | null;
  symbol_prefix: string[] | null;
  symbol_number: string[] | null;
  uniform_title: string[] | null;
  title: string | null;
  subtitle: string | null;
  statement_of_responsibility: string[] | null;
  translated_title: string[] | null;
  publish_place: string[] | null;
  publisher: string[] | null;
  publication_date: string[] | null;
  printing_date: string[] | null;
  pagination: string[] | null;
  note: string[] | null;
  citation_reference: any[] | null;
  abstract: any[] | null;
  subject_organs: any[] | null;
  local_shelving: any[] | null;
  corporate_subject: string[] | null;
  meeting_subject: any[] | null;
  contains_documents: string[] | null;
  subject_headings: string[];
  geographic_headings: any[] | null;
  author: string[] | null;
  local_subject: string[] | null;
  collection_level1: string[] | null;
  collection_level2: string[] | null;
  collection_level3: string[] | null;
  agenda_doc_symbol: string[] | null;
  agenda_item_number: string[] | null;
  agenda_item_title: string[] | null;
  agenda_subject_heading: string[] | null;
  action_note_date: string[] | null;
  related_documents: string[] | null;
  vote_summary: string[] | null;
  paragraphs?: OperativeParagraph[] | null;
  programme?: string;
  text?: string;
  ai_summary?: string;
  
  // Search-related fields
  searchScore?: number;
  highlightedTitle?: string;
  highlightedFields?: { [key: string]: string };
}

// Entity types
export interface Entity {
  entity: string;
  entity_long: string;
  url?: string;
  principal_organ?: string;
  description?: string;
  annual_report_link?: string;
  transparency_portal_link?: string;
}

export interface EntityWithCount {
  entity: string;
  entity_long: string;
  count: number;
}

// Organ types
export interface Organ {
  short: string;
  long: string;
  website?: string;
}

export interface OrganWithCount {
  short: string;
  long: string;
  count: number;
}

// Filter types
export interface FilterOptions {
  entity?: string;
  organ?: string;
  crossCitingEntity?: string;
  keyword?: string;
  programme?: string;
  subject?: string;
  start_year?: string;
  end_year?: string;
  budget_document?: string;
  full_document_symbol?: string;
  sort_by?: string;
  page?: string;
  limit?: string;
}

// Cross-citation types
export interface CrossCitation {
  entity: string;
  entity_long: string;
  count: number;
}

// API Response types
export interface ApiResponse {
  // Paginated mandate results
  mandates: Mandate[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
  };
  
  // Data for cards
  counts: {
    totalDocuments: number;
    totalEntities: number;
    totalOrgans: number;
    totalCitations: number;
  };
  
  // Sidebar data (already filtered)
  sidebar: {
    entities: EntityWithCount[];
    organs: OrganWithCount[];
    crossCitations: CrossCitation[];
  };
  
  // Filter options for dropdowns
  filterOptions: {
    programmes: { value: string; count: number }[]
    subjects: { value: string; count: number }[]
    yearRange: { min: number; max: number }
    yearDistribution: Record<string, number>
  }
  
  // Reference data for display
  reference: {
    entities: Entity[];
    organs: Organ[];
  };
}

// Legacy types for backward compatibility during transition
export type { Entity as LegacyEntity };