import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import type { Mandate } from '@/types';

let uniqueEntities: string[] = [];
let uniquePriorityAreas: string[] = [];

async function getMetadata() {
  if (uniqueEntities.length > 0 && uniquePriorityAreas.length > 0) {
    return { uniqueEntities, uniquePriorityAreas };
  }

  const jsonDirectory = path.join(process.cwd(), 'data');
  const fileContents = await fs.readFile(path.join(jsonDirectory, 'ppb2026_all_mandates_with_content.json'), 'utf8');
  const rawData = JSON.parse(fileContents) as Mandate[];

  const entities = new Set<string>();
  const priorityAreas = new Set<string>();

  for (const item of rawData) {
    if (item.entities) {
      item.entities.forEach(e => entities.add(e));
    }
    if (item.priority_area) {
        priorityAreas.add(item.priority_area);
    }
  }

  uniqueEntities = Array.from(entities).sort();
  uniquePriorityAreas = Array.from(priorityAreas).sort();
  
  return { uniqueEntities, uniquePriorityAreas };
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