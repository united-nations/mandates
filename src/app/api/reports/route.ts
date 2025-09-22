import type { Report } from '@/types';
import { createDocumentHandler } from '@/lib/document-api-handler';

export const GET = createDocumentHandler<Report>(
  'all_reports_dashboard.json',
  'reports'
);
