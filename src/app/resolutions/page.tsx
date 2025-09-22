import DocumentTable from '@/components/document-table';
import { resolutionsConfig } from '@/lib/document-configs';
import type { Resolution } from '@/types';

export default function ResolutionsPage() {
    return <DocumentTable<Resolution> config={resolutionsConfig} />;
}
