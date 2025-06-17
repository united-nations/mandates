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
  onViewDetails: (mandateId: string) => void;
}

export function MandateTable({ mandates, onViewDetails }: MandateTableProps) {
  if (mandates.length === 0) {
    return (
      <div className="text-center py-20 border-t">
        <ListChecks size={48} className="mx-auto text-muted-foreground mb-4" />
        <p className="text-xl text-muted-foreground">No mandates found matching your criteria.</p>
        <p className="text-sm text-muted-foreground/80 mt-2">Try adjusting your filters or clearing them.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[250px]">Section</TableHead>
          <TableHead className="w-[120px]">Entity</TableHead>
          <TableHead>Document Title</TableHead>
          <TableHead className="w-[80px] text-center">Year</TableHead>
          <TableHead className="w-[80px] text-center">Link</TableHead>
          <TableHead className="w-[120px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {mandates.map((mandate) => (
          <MandateTableRow
            key={mandate.id}
            mandate={mandate}
            onViewDetails={onViewDetails}
          />
        ))}
      </TableBody>
    </Table>
  );
}
