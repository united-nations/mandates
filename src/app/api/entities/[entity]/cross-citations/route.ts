import { NextResponse } from 'next/server';
import { DataService } from '@/lib/api/data-service';
import { FilterEngine } from '@/lib/api/filter-engine';
import { ApiUtils } from '@/lib/api/api-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ entity: string }> }
) {
  return ApiUtils.handleAsync(async () => {
    const { entity } = await params;
    const targetEntity = ApiUtils.sanitizeName(entity);
    
    const allMandates = await DataService.getMandates();
    const crossCitations = FilterEngine.getCrossCitations(allMandates, targetEntity);
    
    return crossCitations;
  }, 'Failed to fetch cross-citations');
} 