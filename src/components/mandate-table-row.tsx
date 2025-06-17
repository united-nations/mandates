'use client';

import type { Mandate } from '@/types';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ExternalLink, Info } from 'lucide-react';
import Link from 'next/link';

interface MandateTableRowProps {
  mandate: Mandate;
  onViewDetails: (mandateId: string) => void;
}

export function MandateTableRow({ mandate, onViewDetails }: MandateTableRowProps) {
  return (
    <TableRow>
      {/* Section */}
      <TableCell className="font-medium truncate max-w-[250px]">
        {mandate.partInDocument}
      </TableCell>

      {/* Entity */}
      <TableCell>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-semibold cursor-default">{mandate.entity}</span>
            </TooltipTrigger>
            {mandate.entityLong && mandate.entityLong !== mandate.entity && (
              <TooltipContent>
                <p>{mandate.entityLong}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Document Title */}
      <TableCell>{mandate.title}</TableCell>

      {/* Year */}
      <TableCell className="text-center">
        {mandate.year > 0 ? mandate.year : '-'}
      </TableCell>

      {/* Link */}
      <TableCell className="text-center">
        {mandate.linkId ? (
          <Button variant="ghost" size="icon" asChild>
            <Link
              href={mandate.linkId}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View document for ${mandate.title}`}
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell className="text-right">
        <Button
          onClick={() => onViewDetails(mandate.id)}
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
