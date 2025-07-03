import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Organ {
  short: string;
  long: string;
  website?: string;
}

export async function GET(
  request: Request,
  { params }: { params: { organ: string } }
) {
  try {
    const organName = decodeURIComponent(params.organ);
    
    const filePath = path.join(process.cwd(), 'data', 'organs.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const organs: Organ[] = JSON.parse(fileContents);
    
    const organ = organs.find(o => o.short === organName);
    
    if (!organ) {
      return NextResponse.json({ error: 'Organ not found' }, { status: 404 });
    }
    
    return NextResponse.json(organ);
  } catch (error) {
    console.error('Error reading organ data:', error);
    return NextResponse.json({ error: 'Failed to load organ data' }, { status: 500 });
  }
}
