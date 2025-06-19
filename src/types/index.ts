// This file is being completely replaced with a new interface.
export interface Mandate {
  symbol_x: string;
  num_citations: number;
  num_entities: number;
  entities: (string | null)[];
  link_x: string;
  full_document_symbol: string;
  priority_area: string;
  year: string;
  body: string; // Corresponds to issuing_body
  pillar: string;
  entity_long: string;
  origin_document: string;
  part_in_document: string;
  entity: string;
  link_y: string;
  document_symbol: string;
  classification_code: string[];
  classification: string[]; // Corresponds to doc_type
  doc_type_code: string[];
  symbol_y: string[];
  symbol_prefix: string[];
  symbol_number: string[];
  uniform_title: string[];
  title: string;
  subtitle: string;
  statement_of_responsibility: string[];
  translated_title: string[];
  publish_place: string[];
  publisher: string[];
  publication_date: string[];
  printing_date: string[];
  pagination: string[];
  note: string[];
  citation_reference: any[];
  abstract: any[];
  subject_organs: any[];
  local_shelving: any[];
  corporate_subject: string[];
  meeting_subject: any[];
  contains_documents: string[];
  subject_headings: string[];
  geographic_headings: any[];
  author: string[];
  local_subject: string[];
  collection_level1: string[];
  collection_level2: string[];
  collection_level3: string[];
  agenda_doc_symbol: string[];
  agenda_item_number: string[];
  agenda_item_title: string[];
  agenda_subject_heading: string[];
  action_note_date: string[];
  related_documents: string[];
  vote_summary: string[];
}
