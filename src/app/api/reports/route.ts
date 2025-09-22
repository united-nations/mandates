import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import type { Report } from '@/types';

export async function GET(request: NextRequest) {
  try {
    // Read the JSON file
    const filePath = path.join(process.cwd(), 'data', 'all_reports_dashboard.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const allDocuments: Report[] = JSON.parse(fileContents);

    // Get query parameters for pagination and filtering
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortField = searchParams.get('sortField') || 'year';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const organ = searchParams.get('organ');
    const isRecurringSeries = searchParams.get('is_recurring_series');

    // Filter by organ if specified
    let filteredDocuments = allDocuments;
    if (organ) {
      filteredDocuments = filteredDocuments.filter(document => 
        document.organ === organ
      );
    }

    // Filter by recurring series if specified
    if (isRecurringSeries) {
      const isRecurring = isRecurringSeries === 'true';
      filteredDocuments = filteredDocuments.filter(document => 
        document.is_recurring_series === isRecurring
      );
    }

    // Sort the data
    const sortedDocuments = [...filteredDocuments].sort((a, b) => {
      const aValue = a[sortField as keyof Report];
      const bValue = b[sortField as keyof Report];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'desc' ? -comparison : comparison;
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const comparison = aValue - bValue;
        return sortOrder === 'desc' ? -comparison : comparison;
      }
      
      return 0;
    });

    // Calculate pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedDocuments = sortedDocuments.slice(startIndex, endIndex);

    return NextResponse.json({
      data: paginatedDocuments,
      pagination: {
        page,
        limit,
        total: filteredDocuments.length,
        totalPages: Math.ceil(filteredDocuments.length / limit),
      },
    });
  } catch (error) {
    console.error('Error reading reports data:', error);
    return NextResponse.json(
      { error: 'Failed to load reports data' },
      { status: 500 }
    );
  }
}
