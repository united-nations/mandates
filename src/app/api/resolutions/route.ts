import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import type { Resolution } from '@/types';

export async function GET(request: NextRequest) {
  try {
    // Read the JSON file
    const filePath = path.join(process.cwd(), 'data', 'all_resolutions_dashboard.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const allResolutions: Resolution[] = JSON.parse(fileContents);

    // Get query parameters for pagination and filtering
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortField = searchParams.get('sortField') || 'year';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Sort the data
    const sortedResolutions = [...allResolutions].sort((a, b) => {
      const aValue = a[sortField as keyof Resolution];
      const bValue = b[sortField as keyof Resolution];
      
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
    const paginatedResolutions = sortedResolutions.slice(startIndex, endIndex);

    return NextResponse.json({
      data: paginatedResolutions,
      pagination: {
        page,
        limit,
        total: allResolutions.length,
        totalPages: Math.ceil(allResolutions.length / limit),
      },
    });
  } catch (error) {
    console.error('Error reading resolutions data:', error);
    return NextResponse.json(
      { error: 'Failed to load resolutions data' },
      { status: 500 }
    );
  }
}