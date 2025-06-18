import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import type { Mandate } from '@/types';

let uniqueEntities: string[] = [];
let uniquePriorityAreas: string[] = [];
let totalDocuments = 0;
let totalEntities = 0;
let totalCitations = 0;
let uniqueBodiesCount = 0;
let uniqueBodies: string[] = [];

async function getMetadata() {
  if (uniqueEntities.length > 0) {
    return { 
      uniqueEntities, 
      uniquePriorityAreas,
      totalDocuments,
      totalEntities,
      totalCitations,
      uniqueBodiesCount,
      uniqueBodies,
    };
  }

  const jsonDirectory = path.join(process.cwd(), 'data');
  const fileContents = await fs.readFile(path.join(jsonDirectory, 'ppb2026_unique_mandates_with_metadata.json'), 'utf8');
  const rawData = JSON.parse(fileContents) as Mandate[];

  const entities = new Set<string>();
  const priorityAreas = new Set<string>();
  const bodies = new Set<string>();
  let citationsSum = 0;

  for (const item of rawData) {
    if (item.entities) {
      item.entities.forEach(e => entities.add(e));
    }
    if (item.priority_area) {
        priorityAreas.add(item.priority_area);
    }
    if (item.body) {
        bodies.add(item.body);
    }
    citationsSum += item.num_citations || 0;
  }

  uniqueEntities = Array.from(entities).sort();
  uniquePriorityAreas = Array.from(priorityAreas).sort();
  totalDocuments = rawData.length;
  totalEntities = entities.size;
  totalCitations = citationsSum;
  uniqueBodiesCount = bodies.size;
  uniqueBodies = Array.from(bodies).sort();

  return { 
    uniqueEntities, 
    uniquePriorityAreas,
    totalDocuments,
    totalEntities,
    totalCitations,
    uniqueBodiesCount,
    uniqueBodies
  };
}

export async function GET() {
  try {
    const metadata = await getMetadata();
    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Failed to load mandate metadata:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 