import { NextResponse } from 'next/server';
import entities from '../../../../data/entities.json';
import fs from 'fs';
import path from 'path';

export async function GET() {
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

  return NextResponse.json(merged);
} 