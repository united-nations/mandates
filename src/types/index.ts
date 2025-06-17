export interface Mandate {
  // Core identifiers
  id: string; // We'll generate this from document_symbol
  documentSymbol: string;
  fullDocumentSymbol: string;
  linkId: string; // URL to the document
  
  // Basic info
  title: string;
  subtitle?: string;
  year: number;
  statementOfResponsibility?: string;
  
  // Entity information
  entity: string; // Short form (e.g., "CEB")
  entityLong: string; // Full name
  
  // Document details
  partInDocument: string; // e.g., "Legislative mandates"
  publicationDate?: string;
  printingDate?: string;
  pagination?: string;
  note?: string;
  abstract?: string;
  
  // Classification and subjects
  subjectHeadings: string[]; // Keywords/topics
  corporateSubject: string[];
  classificationCode: string[];
  classification: string[];
  
  // Related information
  agendaItemTitle?: string;
  agendaItemNumber?: string;
  relatedDocuments: string[];
  voteSummary?: string;
  
  // Collection information
  collectionLevel1?: string;
  collectionLevel2?: string;
  collectionLevel3?: string;
  
  // Author/meeting info
  author: string[];
  localSubject: string[];
}
