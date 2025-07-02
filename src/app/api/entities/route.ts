import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Cache for parsed entities data
let cachedEntities: any[] | null = null;

async function getEntitiesFromCSV() {
  if (cachedEntities) {
    return cachedEntities;
  }

  // Dynamically import csv-parse
  const { parse } = await import('csv-parse/sync');

  // Read and parse the CSV file
  const csvPath = path.resolve(process.cwd(), 'data/entity_details.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const entities = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  cachedEntities = entities;
  return entities;
}

export async function GET() {
  try {
    const entities = await getEntitiesFromCSV();
    return NextResponse.json(entities);
  } catch (error) {
    console.error('Failed to load entities:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 