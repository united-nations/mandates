'use client';

import { useState } from 'react';
import type { Mandate } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EntityName } from './ui/entity-name';
import { FileText, Calendar, Building } from 'lucide-react';

const priorityAreaColors: { [key: string]: string } = {
  'Maintenance of international peace and security': 'bg-blue-500',
  'Promotion of sustained economic growth and sustainable development': 'bg-green-500',
  'Development of Africa': 'bg-yellow-500',
  'Promotion and protection of human rights': 'bg-red-500',
  'Effective coordination of humanitarian assistance efforts': 'bg-purple-500',
  'Justice and international law': 'bg-indigo-500',
  'Disarmament': 'bg-pink-500',
  // Add more if there are others, or a default
  'default': 'bg-gray-500',
};

const getPriorityAreaColor = (area: string) => {
  return priorityAreaColors[area] || priorityAreaColors.default;
}

interface MandateListProps {
  mandates: Mandate[];
  onMandateClick: (mandate: Mandate) => void;
}

const EntityBadges = ({ entities }: { entities: string[] }) => {
  const validEntities = entities.filter(entity => entity !== null);

  if (validEntities.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {validEntities.map(entity => (
          <Badge key={entity} variant="secondary" className="font-normal">
            <EntityName entityName={entity} showUnderline={false} />
          </Badge>
      ))}
    </div>
  );
};

export function MandateList({ mandates, onMandateClick }: MandateListProps) {
  return (
    <TooltipProvider>
      <div className="space-y-4">
        {mandates.map((mandate, index) => {
          return (
            <motion.div
              key={mandate.document_symbol}
              className="relative p-4 border rounded-lg shadow-sm bg-card hover:bg-muted/50 transition-colors cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => onMandateClick(mandate)}
            >
              <div className="flex flex-col gap-3">
                {/* Details button - positioned absolute */}
                <Button size="sm" variant="outline" className="absolute top-3 right-3 shrink-0 text-xs px-2 py-1 h-7">
                  Details
                </Button>

                <div className="pr-16">
                  {mandate.highlightedTitle ? (
                    <h3 
                      className="text-base font-semibold leading-tight" 
                      dangerouslySetInnerHTML={{ __html: mandate.highlightedTitle }}
                    />
                  ) : (
                    <h3 className="text-base font-semibold leading-tight">{mandate.title}</h3>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                     <FileText className="h-3 w-3" />
                     <span className="font-medium">{mandate.document_symbol}</span>
                   </div>
                  {mandate.body && (
                    <div className="flex items-center gap-1.5">
                      <Building className="h-3 w-3" />
                      <span className="font-medium">{mandate.body}</span>
                    </div>
                  )}
                   
                  {mandate.year && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      <span className="font-medium">{mandate.year}</span>
                    </div>
                  )}
                </div>
                
                {mandate.match_details && mandate.match_details.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Match in:</span> {mandate.match_details.join(', ')}
                  </div>
                )}

                {/* Citations and Entities */}
                {(mandate.num_citations > 0 || (mandate.entities && mandate.entities.length > 0)) && (
                  <div className="pt-2 border-t border-border/30">
                    <p className="text-xs font-medium mb-2 text-muted-foreground">
                      Cited {mandate.num_citations} time{mandate.num_citations !== 1 ? 's' : ''} by {mandate.num_entities} entit{mandate.num_entities !== 1 ? 'ies' : 'y'}
                    </p>
                    <EntityBadges entities={mandate.entities || []} />
                  </div>
                )}
              </div>
            </motion.div>
        )})}
      </div>
    </TooltipProvider>
  );
}