import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import type { Mandate } from '@/types';

// Define the shape of the raw data from the JSON file
interface RawMandateData {
  origin_document: string;
  part_in_document: string;
  entity_long: string;
  entity: string;
  full_document_symbol: string;
  link_id: string;
  document_symbol: string;
  metadata_response: any[];
  classification_code: string[] | null;
  classification: string[] | null;
  doc_type_code: string[] | null;
  symbol: string[] | null;
  symbol_prefix: string[] | null;
  symbol_number: string[] | null;
  uniform_title: string[] | null;
  title: string[] | null;
  subtitle: string[] | null;
  statement_of_responsibility: string[] | null;
  translated_title: string[] | null;
  publish_place: string[] | null;
  publisher: string[] | null;
  publication_date: string[] | null;
  printing_date: string[] | null;
  pagination: string[] | null;
  note: string[] | null;
  citation_reference: string[] | null;
  abstract: string[] | null;
  subject_organs: string[] | null;
  local_shelving: string[] | null;
  corporate_subject: string[] | null;
  meeting_subject: string[] | null;
  contains_documents: string[] | null;
  subject_headings: string[];
  geographic_headings: string[] | null;
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
}

// Store mandates in memory to avoid re-reading the file on every request
let allMandates: Mandate[] = [];

// Helper functions for data transformation
const getFirst = (arr: string[] | null | undefined): string => (arr && arr.length > 0 ? arr[0] : '');
const getArray = (arr: string[] | null | undefined): string[] => arr || [];

// Function to transform raw data to our Mandate interface
const transformMandateData = (rawData: RawMandateData): Mandate => ({
  id: rawData.document_symbol || `mandate-${Math.random().toString(36).substr(2, 9)}`,
  documentSymbol: rawData.document_symbol,
  fullDocumentSymbol: rawData.full_document_symbol,
  linkId: rawData.link_id,
  title: getFirst(rawData.title) || rawData.document_symbol || 'Untitled Document',
  subtitle: getFirst(rawData.subtitle),
  year: extractYear(getFirst(rawData.publication_date), getFirst(rawData.printing_date)),
  statementOfResponsibility: getFirst(rawData.statement_of_responsibility),
  entity: rawData.entity,
  entityLong: rawData.entity_long,
  partInDocument: rawData.part_in_document,
  publicationDate: getFirst(rawData.publication_date),
  printingDate: getFirst(rawData.printing_date),
  pagination: getFirst(rawData.pagination),
  note: getFirst(rawData.note),
  abstract: getFirst(rawData.abstract),
  subjectHeadings: getArray(rawData.subject_headings),
  corporateSubject: getArray(rawData.corporate_subject),
  classificationCode: getArray(rawData.classification_code),
  classification: getArray(rawData.classification),
  agendaItemTitle: getFirst(rawData.agenda_item_title),
  agendaItemNumber: getFirst(rawData.agenda_item_number),
  relatedDocuments: getArray(rawData.related_documents),
  voteSummary: getFirst(rawData.vote_summary),
  collectionLevel1: getFirst(rawData.collection_level1),
  collectionLevel2: getFirst(rawData.collection_level2),
  collectionLevel3: getFirst(rawData.collection_level3),
  author: getArray(rawData.author),
  localSubject: getArray(rawData.local_subject),
});

const extractYear = (publicationDate?: string, printingDate?: string): number => {
    const dateStr = publicationDate || printingDate || '';
    const yearMatch = dateStr.match(/(\d{4})/);
    return yearMatch ? parseInt(yearMatch[1], 10) : 0;
};

// Function to load and cache mandates
async function getMandates(): Promise<Mandate[]> {
  if (allMandates.length > 0) {
    return allMandates;
  }

  const jsonDirectory = path.join(process.cwd(), 'data');
  const fileContents = await fs.readFile(path.join(jsonDirectory, '250610_ppb2025_mandates_with_metadata.json'), 'utf8');
  const rawData = JSON.parse(fileContents) as RawMandateData[];
  
  allMandates = rawData
    .filter(item => item.document_symbol && item.entity)
    .map(transformMandateData);

  return allMandates;
}


export async function GET(request: Request) {
  try {
    const mandates = await getMandates();
    const { searchParams } = new URL(request.url);

    // Get filter and pagination parameters from the URL
    const entity = searchParams.get('entity');
    const year = searchParams.get('year');
    const keyword = searchParams.get('keyword');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Apply filters
    let filteredMandates = mandates;

    if (entity) {
      filteredMandates = filteredMandates.filter((m) => m.entity === entity);
    }

    if (year) {
      const targetYear = parseInt(year, 10);
      filteredMandates = filteredMandates.filter((m) => m.year === targetYear);
    }

    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      filteredMandates = filteredMandates.filter((m) =>
        m.title.toLowerCase().includes(lowerKeyword) ||
        (m.abstract && m.abstract.toLowerCase().includes(lowerKeyword)) ||
        m.entityLong.toLowerCase().includes(lowerKeyword) ||
        m.documentSymbol.toLowerCase().includes(lowerKeyword) ||
        m.partInDocument.toLowerCase().includes(lowerKeyword) ||
        (m.agendaItemTitle && m.agendaItemTitle.toLowerCase().includes(lowerKeyword)) ||
        m.subjectHeadings.some(h => h.toLowerCase().includes(lowerKeyword))
      );
    }

    // Apply pagination
    const totalItems = filteredMandates.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const paginatedItems = filteredMandates.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      items: paginatedItems,
      totalItems,
      totalPages,
      currentPage: page,
    });

  } catch (error) {
    console.error('Failed to load or process mandate data:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 