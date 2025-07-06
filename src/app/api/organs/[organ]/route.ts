import { NextResponse } from 'next/server';
import { DataService } from '@/lib/api/data-service';
import { ApiUtils, ApiError } from '@/lib/api/api-utils';

export async function GET(
  request: Request,
  { params }: { params: { organ: string } }
) {
  return ApiUtils.handleAsync(async () => {
    const organName = ApiUtils.sanitizeName(params.organ);
    const organs = await DataService.getOrgans();
    
    const organ = organs.find((o: any) => o.short === organName);
    
    if (!organ) {
      throw new ApiError('Organ not found', 404);
    }
    
    return organ;
  }, 'Failed to load organ data');
}
