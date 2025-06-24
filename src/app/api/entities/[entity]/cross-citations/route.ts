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
  mandates = rawData.sort((a: any, b: any) => b.num_entities - a.num_entities);
  return mandates;
}

export async function GET(
  request: Request,
  { params }: { params: { entity: string } }
) {
  try {
    const allMandates = await getMandates();
    const targetEntity = decodeURIComponent(params.entity);

    // Find all mandates that cite the target entity
    const mandatesCitingTargetEntity = allMandates.filter(mandate => 
      mandate.entities?.includes(targetEntity)
    );

    // Get all unique entities that appear in these mandates (excluding the target entity)
    const entityCitations: { [key: string]: Set<string> } = {};

    mandatesCitingTargetEntity.forEach(mandate => {
      if (mandate.entities) {
        mandate.entities.forEach(entity => {
          if (entity !== targetEntity) {
            if (!entityCitations[entity]) {
              entityCitations[entity] = new Set<string>();
            }
            // Use mandate document symbol or title as unique identifier
            const mandateId = mandate.document_symbol || mandate.title || `${mandate.body}-${mandate.year}`;
            if (mandateId) {
              entityCitations[entity].add(mandateId);
            }
          }
        });
      }
    });

    // Convert to array format with counts and sort by shared mandates count
    const crossCitations = Object.entries(entityCitations)
      .map(([entity, mandateSet]) => ({
        entity,
        sharedMandatesCount: mandateSet.size,
        totalMandatesCount: allMandates.filter(m => m.entities?.includes(entity)).length
      }))
      .sort((a, b) => {
        // First sort by shared mandates count (descending)
        if (b.sharedMandatesCount !== a.sharedMandatesCount) {
          return b.sharedMandatesCount - a.sharedMandatesCount;
        }
        // Then sort alphabetically by entity name
        return a.entity.localeCompare(b.entity);
      });

    return NextResponse.json(crossCitations);
  } catch (error) {
    console.error('Error fetching cross-citations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cross-citations' },
      { status: 500 }
    );
  }
} 