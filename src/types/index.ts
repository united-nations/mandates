// This file is being completely replaced with a new interface.
export interface Mandate {
  symbol: string;
  num_entities: number;
  entities: string[];
  priority_area: string;
  full_document_symbol: string | null;
  title: string | null;
  operative_paragraphs: string[] | null;
  num_citations?: number;
  body?: string;
}
