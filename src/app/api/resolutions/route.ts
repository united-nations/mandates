import type { Resolution } from '@/types';
import { createDocumentHandler } from '@/lib/document-api-handler';

export const GET = createDocumentHandler<Resolution>(
  'all_resolutions_dashboard.json',
  'resolutions'
);