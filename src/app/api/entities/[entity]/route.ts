import { NextResponse } from 'next/server';
import { DataService } from '@/lib/api/data-service';
import { ApiUtils, ApiError } from '@/lib/api/api-utils';

export async function GET(request: Request, { params }: { params: Promise<{ entity: string }> }) {
  return ApiUtils.handleAsync(async () => {
    const { entity } = await params;
    const entityName = ApiUtils.sanitizeName(entity);
    
    const detailsMap = await DataService.getEntityDetailsMap();
    const detail = detailsMap[entityName];

    if (!detail) {
      throw new ApiError('Entity not found', 404);
    }

    return detail;
  }, 'Failed to load entity');
} 