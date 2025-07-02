import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Cache for entity details CSV data
let cachedDetailsMap: any = null;

async function getDetailsMap() {
  if (cachedDetailsMap) {
    return cachedDetailsMap;
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

  cachedDetailsMap = Object.fromEntries(
    details.map((row: any) => [row['Entity'], row])
  );

  return cachedDetailsMap;
}

export async function GET(request: Request, { params }: { params: { entity: string } }) {
  try {
    const entityName = decodeURIComponent(params.entity);
    const detailsMap = await getDetailsMap();
    const detail = detailsMap[entityName];

    if (!detail) {
      return NextResponse.json({ message: 'Entity not found' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    console.error('Failed to load entity:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 