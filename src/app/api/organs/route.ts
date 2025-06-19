import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface Organ {
  short: string;
  long: string;
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'organs.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const organs: Organ[] = JSON.parse(fileContents);
    
    return NextResponse.json(organs);
  } catch (error) {
    console.error('Error reading organs.json:', error);
    return NextResponse.json({ error: 'Failed to load organs data' }, { status: 500 });
  }
} 