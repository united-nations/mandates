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
          const titleParts = mandate.title ? mandate.title.split(': ') : ['Untitled Mandate'];
          const mainTitle = titleParts[0];
          const subTitle = titleParts.length > 1 ? titleParts.slice(1).join(': ') : null;
          
          return (
            <motion.div
              key={mandate.document_symbol}
              className="p-4 border rounded-lg shadow-sm bg-card hover:bg-muted/50 transition-colors cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => onMandateClick(mandate)}
            >
              <div className="flex flex-col gap-3">
                {/* Top row: Meta info and Details button */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="font-mono truncate max-w-[250px] sm:max-w-xs md:max-w-sm">
                          {mandate.full_document_symbol || mandate.document_symbol}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{mandate.full_document_symbol || mandate.document_symbol}</p>
                      </TooltipContent>
                    </Tooltip>
                    {mandate.year && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {mandate.year}
                      </Badge>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0">
                      Details
                  </Button>
                </div>

                {/* Title */}
                <div>
                  {mandate.highlightedTitle ? (
                    <h3 
                      className="text-base font-semibold max-w-5xl" 
                      dangerouslySetInnerHTML={{ __html: mandate.highlightedTitle }}
                    />
                  ) : (
                    <h3 className="text-base font-semibold max-w-5xl">{mainTitle}</h3>
                  )}
                  {subTitle && <h4 className="text-sm text-muted-foreground max-w-5xl mt-1">{subTitle}</h4>}
                </div>
                
                {mandate.match_details && mandate.match_details.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Match in:</span> {mandate.match_details.join(', ')}
                  </div>
                )}

                {/* Citations and Entities */}
                {(mandate.num_citations > 0 || (mandate.entities && mandate.entities.length > 0)) && (
                  <div className="pt-3 border-t">
                     <p className="text-sm font-medium mb-2">
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