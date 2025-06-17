import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

// This is a simplified version of the logic in the main mandates route.
// In a real application, this logic would be shared in a utility file.
let uniqueEntities: string[] = [];
let uniqueYears: number[] = [];

const extractYear = (publicationDate?: string, printingDate?: string): number => {
    const dateStr = publicationDate || printingDate || '';
    const yearMatch = dateStr.match(/(\d{4})/);
    return yearMatch ? parseInt(yearMatch[1], 10) : 0;
};

async function getMetadata() {
  if (uniqueEntities.length > 0 && uniqueYears.length > 0) {
    return { uniqueEntities, uniqueYears };
  }

  const jsonDirectory = path.join(process.cwd(), 'data');
  const fileContents = await fs.readFile(path.join(jsonDirectory, '250610_ppb2025_mandates_with_metadata.json'), 'utf8');
  const rawData = JSON.parse(fileContents) as any[];

  const entities = new Set<string>();
  const years = new Set<number>();

  for (const item of rawData) {
    if (item.entity) {
      entities.add(item.entity);
    }
    const year = extractYear(item.publication_date?.[0], item.printing_date?.[0]);
    if (year > 0) {
        years.add(year);
    }
  }

  uniqueEntities = Array.from(entities).sort();
  uniqueYears = Array.from(years).sort((a, b) => b - a);
  
  return { uniqueEntities, uniqueYears };
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