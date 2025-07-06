import { NextResponse } from 'next/server';
import { DataService } from '@/lib/api/data-service';
import { FilterEngine } from '@/lib/api/filter-engine';
import { ApiUtils } from '@/lib/api/api-utils';

export async function GET(
  request: Request,
  { params }: { params: { organ: string } }
) {
  return ApiUtils.handleAsync(async () => {
    const targetOrgan = ApiUtils.sanitizeName(params.organ);
    const allMandates = await DataService.getMandates();
    
    // Get cross-citations for this organ using the centralized filter engine
    const crossCitations = FilterEngine.getOrganCrossCitations(allMandates, targetOrgan);
    
    return crossCitations;
  }, 'Failed to fetch organ cross-citations');
} 