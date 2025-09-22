import DocumentTable from '@/components/document-table';
import { reportsConfig } from '@/lib/document-configs';
import type { Report } from '@/types';

export default function ReportsPage() {
    return <DocumentTable<Report> config={reportsConfig} />;
}
