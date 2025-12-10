// Core data types based on the JSON structure
export interface Paragraph {
  text: string;
  is_frontmatter: boolean;
  type: string; // "title", "paragraph", "heading", etc.
  heading_level: number | null;
  paragraph_type: string | null; // "preambular", "operative", etc.
  paragraph_level: number | null;
  prefix: string | null; // "1.", "2.", etc. - renamed from paragraph_prefix, can also apply to headers
  links: [string, string][] | []; // Array of [text, url] tuples
  language: string | null; // Language of the text block
  symbol?: string;
  index?: number;
  mandates?: {
    action_verb: string;
    action_verb_type: string;
    assignees: {
      assignee: string;
      assignee_normalized: string;
      assignee_type: string;
    }[];
    mentioned_entities: {
      mentioned_entity: string;
      mentioned_entity_normalized: string;
      mentioned_entity_type: string;
    }[];
    deliverables: {
      deliverable: string;
      deliverable_normalized: string;
      deliverable_type: string;
    }[];
  }[];
  textWithHighlights?: string;
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
  "sub-programme": string | null;
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
  paragraphs?: Paragraph[] | null;
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
    programmes: { value: string; count: number }[];
    subjects: { value: string; count: number }[];
    yearRange: { min: number; max: number };
    yearDistribution: Record<string, number>;
  };

  // Reference data for display
  reference: {
    entities: Entity[];
    organs: Organ[];
  };
}

// Base document interface for both resolutions and reports
export interface BaseDocument {
  symbol: string;
  original_symbol: string;
  organ: string;
  organ_level1: string | null;
  organ_level2: string | null;
  organ_prefix: string | null;
  document_type: string;
  issuing_body: string;
  year: number;
  title: string;
  uniform_title: string | null;
  combined_title: string;
  normalized_title: string;
  group_title: string;
  is_potential_duplicate: boolean;
  is_addendum: boolean;
  is_revision: boolean;
  is_corrigendum: boolean;
  agenda_doc_symbol: string[];
  agenda_item_title: string[];
  agenda_subject_heading: string[];
  related_documents: string[];
  is_recurring_series: boolean;
  series_symbol_count: number;
  series_first_year: number;
  series_last_year: number;
  series_year_range: number;
  is_latest_version: boolean;
  distance_to_previous: number | null;
  previous_symbol: string | null;
  similarity_to_previous: number | null;
  word_count: number | null;
  pdf_status: string;
  url: string;
}

// Resolution-specific interface
export interface Resolution extends BaseDocument {
  has_within_existing_resources: boolean | null;
  count_within_existing_resources: number | null;
}

// Report interface with classification and clustering fields
export interface Report extends BaseDocument {
  // document_type is inherited from BaseDocument
  document_subtype: string | null;
  author_level1: string | null;
  author_level2: string | null;
  classification_confidence: string | null;
  cluster_id: number | null;
  cluster_mean_similarity: number | null;
  cluster_similarity_category: string | null;
  top10_similar_symbols: string[] | null;
  top10_similar_scores: number[] | null;
}

// Generic document type for components
export type Document = Resolution | Report;

// Document configuration for different document types
export interface DocumentConfig<T extends BaseDocument> {
  type: "resolutions" | "reports";
  title: string;
  apiEndpoint: string;
  dataFile: string;
  defaultOrgan: string;
  organOptions: Array<{ value: string; label: string }>;
  columns: {
    symbol: boolean;
    year: boolean;
    title: boolean;
    length: boolean;
    recurrence: boolean;
    previous: boolean;
    similarity: boolean;
    withinResources: boolean;
  };
}

// Document filter types (for resolutions and reports pages)
export interface DocumentFilters {
  organ?: string;
  is_recurring_series?: string;
  year_range?: string;
  length_bucket?: string;
  similarity_bucket?: string;
  include_missing_fulltexts?: string;
}

// Treemap aggregate types
export interface BucketData {
  count: number;
  percentage: number;
  avg_value?: number; // avg word count or avg similarity
}

export interface AggregateResponse {
  totals: {
    count: number;
    resolutions_with_word_count: number;
    resolutions_with_similarity: number;
    resolutions_with_frequency: number;
  };
  buckets: {
    length: Record<string, BucketData>;
    similarity: Record<string, BucketData>;
    frequency: Record<string, BucketData>;
  };
}

// Legacy types for backward compatibility during transition
export type { Entity as LegacyEntity };
