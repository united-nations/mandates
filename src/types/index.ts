export interface CitationInfo {
  origin_document: string;
  budget_part: string;
  section: string;
  section_title: string;
  entity_long: string;
  entity: string;
  programme: number | null;
  programme_title: string;
  'sub-programme': string;
  component: any | null;
  description: string;
  part_in_document: string;
}

export interface Mandate {
  symbol: string;
  num_citations: number;
  num_entities: number;
  entities: string[];
  link: string | null;
  full_document_symbol: string | null;
  priority_area: string;
  year: string;
  body: string;
  pillar: string;
  entity_long: string;
  citation_info: CitationInfo[];
  origin_document: string;
  part_in_document: string;
  entity: string;
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
  operative_paragraphs?: string[] | null;
  programme?: string;
  text?: string;
  
  // The fields below are not in the JSON file, but are added during processing.
  // They are kept here to support search and filtering functionality.
  
  // Transformed fields
  document_title?: string;
  issuing_body_or_bodies?: string[];
  mentions?: string[];
  match_details?: string[];

  // Search-related fields
  searchScore?: number;
  highlightedTitle?: string;
}

export type Entity = {
  entity: string;
  entity_long: string;
}; 