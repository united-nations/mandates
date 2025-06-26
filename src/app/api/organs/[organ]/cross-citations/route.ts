import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import type { Mandate } from '@/types';

let mandates: Mandate[] = [];

async function getMandates(): Promise<Mandate[]> {
  if (mandates.length > 0) {
    return mandates;
  }

  const jsonDirectory = path.join(process.cwd(), 'data');
  const fileContents = await fs.readFile(path.join(jsonDirectory, 'ppb2026_unique_mandates_with_metadata.json'), 'utf8');
  
  const rawData = JSON.parse(fileContents);
  mandates = rawData;
  return mandates;
}

export async function GET(
  request: Request,
  { params }: { params: { organ: string } }
) {
  try {
    const allMandates = await getMandates();
    const targetOrgan = decodeURIComponent(params.organ);

    // Find all mandates issued by the target organ
    const mandatesByTargetOrgan = allMandates.filter(mandate => 
      mandate.body === targetOrgan
    );

    // Get all unique organs that appear in these mandates (excluding the target organ)
    const organCitations: { [key: string]: Set<string> } = {};

    mandatesByTargetOrgan.forEach(mandate => {
      if (mandate.body && mandate.body !== targetOrgan) {
        const body = mandate.body;
        if (!organCitations[body]) {
          organCitations[body] = new Set<string>();
        }
        // Use mandate document symbol or title as unique identifier
        const mandateId = mandate.document_symbol || mandate.title || `${body}-${mandate.year}`;
        if (mandateId) {
          organCitations[body].add(mandateId);
        }
      }
      // Also, for each mandate, check if there are other mandates with the same document_symbol but different body
      if (mandate.document_symbol) {
        const sameDocMandates = allMandates.filter(m => m.document_symbol === mandate.document_symbol && m.body && m.body !== targetOrgan);
        sameDocMandates.forEach(m => {
          if (m.body) {
            if (!organCitations[m.body]) {
              organCitations[m.body] = new Set<string>();
            }
            organCitations[m.body].add(mandate.document_symbol);
          }
        });
      }
    });

    // Convert to array format with counts and sort by shared mandates count
    const crossCitations = Object.entries(organCitations)
      .filter(([organ]) => organ && organ !== targetOrgan)
      .map(([organ, mandateSet]: [string, Set<string>]) => {
        if (!organ) return null;
        return {
          organ,
          sharedMandatesCount: mandateSet.size,
          totalMandatesCount: allMandates.filter(m => typeof m.body === 'string' && m.body === organ).length
        };
      })
      .filter((item): item is { organ: string; sharedMandatesCount: number; totalMandatesCount: number } => !!item)
      .sort((a, b) => {
        // First sort by shared mandates count (descending)
        if (b.sharedMandatesCount !== a.sharedMandatesCount) {
          return b.sharedMandatesCount - a.sharedMandatesCount;
        }
        // Then sort alphabetically by organ name
        return a.organ.localeCompare(b.organ);
      });

    return NextResponse.json(crossCitations);
  } catch (error) {
    console.error('Error fetching organ cross-citations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organ cross-citations' },
      { status: 500 }
    );
  }
} 