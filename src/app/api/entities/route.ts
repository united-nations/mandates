import { NextResponse } from 'next/server';
import entities from '../../../../data/entities.json';
import fs from 'fs';
import path from 'path';

// Cache for merged entities data
let cachedEntities: any[] | null = null;

async function getMergedEntities() {
  if (cachedEntities) {
    return cachedEntities;
  }

  // Dynamically import csv-parse
  const { parse } = await import('csv-parse/sync');

  // Read and parse the CSV file
  const csvPath = path.resolve(process.cwd(), 'data/entity_details.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const details = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  // Create a lookup for details by Entity short name
  const detailsMap = Object.fromEntries(
    details.map((row: any) => [row['Entity'], row])
  );

  // Merge details into entities
  const merged = entities.map((entity: any) => {
    const detail = detailsMap[entity.entity];
    return {
      ...entity,
      url: detail?.['Entity URL'] || null,
      principal_organ: detail?.['UN Principal Organ'] || null,
    };
  });

  // Cache the result
  cachedEntities = merged;
  return merged;
}

export async function GET() {
  try {
    const mergedEntities = await getMergedEntities();
    return NextResponse.json(mergedEntities);
  } catch (error) {
    console.error('Failed to load entities:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 