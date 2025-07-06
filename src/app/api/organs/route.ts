import { NextResponse } from 'next/server';
import { DataService } from '@/lib/api/data-service';
import { ApiUtils } from '@/lib/api/api-utils';

export async function GET() {
  return ApiUtils.handleAsync(async () => {
    return await DataService.getOrgans();
  }, 'Failed to load organs');
} 