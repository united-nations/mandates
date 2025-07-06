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
    
    // Parse filters from URL parameters
    const { searchParams } = new URL(request.url);
    const filterParams = ApiUtils.parseFilterParams(searchParams);
    
    // Get all mandates and apply filters (except for the target organ filter)
    const allMandates = await DataService.getMandates();
    const filteredResult = FilterEngine.filterMandates(allMandates, {
      ...filterParams,
      organ: undefined, // Don't filter by organ for cross-citations
    });
    
    // Get cross-citations for this organ using the centralized filter engine
    const crossCitations = FilterEngine.getOrganCrossCitations(filteredResult.filteredMandates, targetOrgan);
    
    return crossCitations;
  }, 'Failed to fetch organ cross-citations');
} 