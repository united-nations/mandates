// This file is being completely replaced with a new interface.
export interface Mandate {
  // Fields from the JSON file
  symbol_x: string;
  num_citations: number;
  num_entities: number;
  entities: string[];
  link_x?: string | null;
  full_document_symbol?: string | null;
  priority_area: string;
  year: string;
  body: string;
  pillar: string;
  entity_long: string;
  origin_document: string;
  part_in_document: string;
  entity: string;
  title: string;
  operative_paragraphs?: string[] | null;

  // Transformed fields
  document_title: string;
  document_symbol: string;
  issuing_body_or_bodies: string[];
  mentions: string[];
  match_details?: string[];
}
