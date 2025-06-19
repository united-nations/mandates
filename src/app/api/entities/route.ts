import { NextResponse } from 'next/server';
import entities from '../../../../data/entities.json';

export async function GET() {
  return NextResponse.json(entities);
} 