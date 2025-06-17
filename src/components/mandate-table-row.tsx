
'use client';

import type { Mandate } from '@/types';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Info } from 'lucide-react';
import Link from 'next/link';

interface MandateTableRowProps {
  mandate: Mandate;
  onViewOperativeParagraphs: (mandateId: string) => void;
}

export function MandateTableRow({ mandate, onViewOperativeParagraphs }: MandateTableRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">{mandate.programmePlanSection}</TableCell>
      <TableCell>{mandate.unEntity}</TableCell>
      <TableCell>{mandate.title}</TableCell>
      <TableCell className="text-center">{mandate.year}</TableCell>
      <TableCell className="text-center">
        {mandate.documentUrl ? (
          <Button variant="ghost" size="icon" asChild>
            <Link href={mandate.documentUrl} target="_blank" rel="noopener noreferrer" aria-label={`View document for ${mandate.title}`}>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button
          onClick={() => onViewOperativeParagraphs(mandate.id)}
          variant="default"
          size="sm"
          aria-label={`View details for ${mandate.title}`}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Info size={16} className="mr-2" />
          View Details
        </Button>
      </TableCell>
    </TableRow>
  );
}
