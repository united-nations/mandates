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
    
    // Parse filters from URL parameters
    const { searchParams } = new URL(request.url);
    const filterParams = ApiUtils.parseFilterParams(searchParams);
    
    // Get all mandates and apply filters (except for the target entity filter)
    const allMandates = await DataService.getMandates();
    const filteredResult = FilterEngine.filterMandates(allMandates, {
      ...filterParams,
      entity: undefined, // Don't filter by entity for cross-citations
      cross_entity: undefined, // Don't filter by cross_entity for cross-citations
    });
    
    const crossCitations = FilterEngine.getCrossCitations(filteredResult.filteredMandates, targetEntity);
    
    return crossCitations;
  }, 'Failed to fetch cross-citations');
} 