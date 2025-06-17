
'use client';

import type { Mandate } from '@/types';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { MandateTableRow } from './mandate-table-row';
import { ListChecks } from 'lucide-react';

interface MandateTableProps {
  mandates: Mandate[];
  onViewOperativeParagraphs: (mandateId: string) => void;
}

export function MandateTable({ mandates, onViewOperativeParagraphs }: MandateTableProps) {
  if (mandates.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-card shadow">
        <ListChecks size={48} className="mx-auto text-muted-foreground mb-4" />
        <p className="text-xl text-muted-foreground">No mandates found matching your criteria.</p>
        <p className="text-sm text-muted-foreground/80 mt-2">Try adjusting your filters or clearing them.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border shadow-sm bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Programme Plan Section</TableHead>
            <TableHead className="w-[120px]">UN Entity</TableHead>
            <TableHead>Document Title</TableHead>
            <TableHead className="w-[80px] text-center">Year</TableHead>
            <TableHead className="w-[80px] text-center">Link</TableHead>
            <TableHead className="w-[150px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mandates.map((mandate) => (
            <MandateTableRow
              key={mandate.id}
              mandate={mandate}
              onViewOperativeParagraphs={onViewOperativeParagraphs}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
